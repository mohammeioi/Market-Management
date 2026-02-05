// WhatsApp Business API Service
// Using Meta Graph API to send template messages

const WHATSAPP_CONFIG = {
    phoneNumberId: '989326107595389',
    accessToken: 'EAALMv1v1kdIBQmkY1SOlYA0vCpERU6kqSz3SjVxi6WlgxTzZBeCeatE8FZAECQCVv1ZANRpPDNjnLouwGs9HjVN6ASioR2TXiTWMHHZCnfmYzUlU1KyRJCZBBgf7WvfeLz6RZCfXX0vfJyQwLPc8Nu1ADMyWMD5bPYQdpEARMZCDkVTJmf8Jllq6zItzr2NAXpKroTMnRXU8r4EW7sdDI5ok1OrZA1J19Nc6ePTlrZASsAYwlHGQvZCf2PeUdLZC2iZAyC4mwPmaWRXZByV7dJGy5nngA',
    apiVersion: 'v22.0',
};

export interface WhatsAppMessageResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Format phone number for WhatsApp API
 * Removes leading zeros and ensures country code is present
 */
function formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, assume it's Iraqi number and add country code
    if (cleaned.startsWith('0')) {
        cleaned = '964' + cleaned.substring(1);
    }

    // If doesn't start with country code, assume Iraqi
    if (!cleaned.startsWith('964') && cleaned.length <= 10) {
        cleaned = '964' + cleaned;
    }

    return cleaned;
}

/**
 * Send a WhatsApp template message to a customer
 */
export async function sendWhatsAppMessage(
    customerPhone: string,
    templateName: string = 'hello_world',
    languageCode: string = 'en_US'
): Promise<WhatsAppMessageResponse> {
    const formattedPhone = formatPhoneNumber(customerPhone);

    const url = `https://graph.facebook.com/${WHATSAPP_CONFIG.apiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`;

    const body = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
            name: templateName,
            language: {
                code: languageCode,
            },
        },
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {
            return {
                success: true,
                messageId: data.messages?.[0]?.id,
            };
        } else {
            return {
                success: false,
                error: data.error?.message || 'فشل في إرسال الرسالة',
            };
        }
    } catch (error) {
        console.error('WhatsApp API Error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في الاتصال',
        };
    }
}
