import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create as createJWT, encode as encodeBase64 } from "https://deno.land/x/djwt@v2.8/mod.ts"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ""
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || "{}")

serve(async (req) => {
    try {
        const payload = await req.json()
        console.log('Notification Payload:', payload)

        const { record } = payload

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // 2. Get Admins
        const { data: admins } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('role', 'admin')
            .eq('is_clocked_in', true)

        const adminIds = admins?.map(a => a.user_id) || []

        // 3. Get Tokens
        const { data: tokens } = await supabase
            .from('user_fcm_tokens')
            .select('token')
            .in('user_id', adminIds)

        const fcmTokens = [...new Set(tokens?.map(t => t.token) || [])]

        if (fcmTokens.length === 0) {
            return new Response(JSON.stringify({ message: 'No tokens found' }), { status: 200 })
        }

        // 4. Get Access Token for FCM
        const accessToken = await getAccessToken(FIREBASE_SERVICE_ACCOUNT)

        // 5. Send Notifications
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
                            title: `طلب جديد! #${record.id.slice(0, 8)}`,
                            body: `طلب جديد من ${record.customer_name} بقيمة ${record.total_amount}`,
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
        console.error('Error in notification function:', error)
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
    // Remove header, footer, and all whitespace/escape characters
    const pemContents = pem
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\\n/g, "")   // Handle literal \n strings
        .replace(/\n/g, "")    // Handle actual newlines
        .replace(/\r/g, "")    // Handle carriage returns
        .replace(/\s/g, "")    // Handle any remaining whitespace
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
