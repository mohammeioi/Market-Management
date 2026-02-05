import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData } = await req.json();

    if (!geminiApiKey) {
      throw new Error('Gemini API key not found');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration not found');
    }

    // إنشاء عميل Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // تحويل base64 إلى format مقبول في Gemini
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: 'أنت نظام ذكي متخصص في قراءة الباركود. اقرأ الباركود الموجود في هذه الصورة وأرجع فقط رقم الباركود دون أي نص إضافي. إذا لم تجد باركود، أرجع "NO_BARCODE_FOUND".'
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 100,
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Gemini API error:', data);
      throw new Error(data.error?.message || 'Failed to analyze image with Gemini');
    }

    const detectedBarcode = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'NO_BARCODE_FOUND';
    
    console.log('Gemini detected barcode:', detectedBarcode);

    if (detectedBarcode === 'NO_BARCODE_FOUND') {
      return new Response(JSON.stringify({ 
        barcode: null,
        product: null,
        message: 'لم يتم العثور على باركود في الصورة'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // البحث عن المنتج في قاعدة البيانات
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', detectedBarcode)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw new Error('خطأ في البحث عن المنتج في قاعدة البيانات');
    }
    
    
    return new Response(JSON.stringify({ 
      barcode: detectedBarcode,
      product: product,
      message: product 
        ? `تم العثور على المنتج: ${product.name} - السعر: ${product.price.toLocaleString()} د.ع` 
        : `تم تحديد الباركود: ${detectedBarcode} ولكن المنتج غير موجود في قاعدة البيانات`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in AI barcode detection:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      barcode: null,
      product: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});