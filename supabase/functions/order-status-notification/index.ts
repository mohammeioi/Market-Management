import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create as createJWT } from "https://deno.land/x/djwt@v2.8/mod.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || "{}")

const statusLabels: Record<string, string> = {
    pending: 'في الانتظار',
    confirmed: 'مؤكد',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    delivered: 'تم التسليم',
    cancelled: 'ملغى',
}

serve(async (req) => {
    try {
        const payload = await req.json()
        console.log('Order Status Notification Payload:', payload)

        const { order_id, new_status } = payload

        if (!order_id || !new_status) {
            return new Response(JSON.stringify({ error: 'Missing order_id or new_status' }), { status: 400 })
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // 1. Get the order to find its creator (user_id)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, user_id, customer_name')
            .eq('id', order_id)
            .single()

        if (orderError || !order) {
            console.error('Error fetching order:', orderError)
            return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
        }

        if (!order.user_id) {
            console.log('Order has no user_id, skipping notification')
            return new Response(JSON.stringify({ message: 'No user_id on order, skipping' }), { status: 200 })
        }

        // 2. Get FCM tokens for the order creator
        const { data: tokens } = await supabase
            .from('user_fcm_tokens')
            .select('token')
            .eq('user_id', order.user_id)

        const fcmTokens = [...new Set(tokens?.map(t => t.token) || [])]

        if (fcmTokens.length === 0) {
            console.log('No FCM tokens found for user:', order.user_id)
            return new Response(JSON.stringify({ message: 'No tokens found for order creator' }), { status: 200 })
        }

        // 3. Get Access Token for FCM
        const accessToken = await getAccessToken(FIREBASE_SERVICE_ACCOUNT)

        const statusLabel = statusLabels[new_status] || new_status
        const orderNum = order.id.slice(0, 8)

        // 4. Send Notifications to the order creator
        const results = await Promise.all(fcmTokens.map(async (token) => {
            const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_SERVICE_ACCOUNT.project_id}/messages:send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: {
                        token: token,
                        notification: {
                            title: `📦 تحديث طلبك #${orderNum}`,
                            body: `حالة طلبك تغيرت إلى: ${statusLabel}`,
                        },
                        android: {
                            priority: "high",
                            notification: {
                                sound: "notification_sound.mp3",
                                channel_id: "orders_channel",
                                click_action: "FCM_PLUGIN_ACTIVITY",
                            }
                        }
                    }
                })
            })
            return res.json()
        }))

        return new Response(JSON.stringify({ success: true, results }), { status: 200 })
    } catch (error) {
        console.error('Error in order-status-notification function:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})

async function getAccessToken(serviceAccount: any) {
    const jwt = await createJWT(
        { alg: "RS256", typ: "JWT" },
        {
            iss: serviceAccount.client_email,
            sub: serviceAccount.client_email,
            aud: "https://oauth2.googleapis.com/token",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            scope: "https://www.googleapis.com/auth/cloud-platform",
        },
        await importKey(serviceAccount.private_key)
    )

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    })

    const data = await res.json()
    return data.access_token
}

async function importKey(pem: string) {
    const pemContents = pem
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\\n/g, "")
        .replace(/\n/g, "")
        .replace(/\r/g, "")
        .replace(/\s/g, "")
        .trim()

    const binaryDerString = atob(pemContents)
    const binaryDer = new Uint8Array(binaryDerString.length)
    for (let i = 0; i < binaryDerString.length; i++) {
        binaryDer[i] = binaryDerString.charCodeAt(i)
    }

    return await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"]
    )
}
