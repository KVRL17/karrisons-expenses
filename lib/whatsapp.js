function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits;
}

function textParam(value) {
  return { type: 'text', text: String(value ?? '') };
}

export function whatsappConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_TEMPLATE_NAME
  );
}

export async function sendWhatsAppExpense(profile, summary) {
  if (!profile.whatsappEnabled || !profile.phone) return { ok: false, skipped: true, reason: 'WhatsApp is not enabled for this member.' };
  if (!whatsappConfigured()) return { ok: false, skipped: true, reason: 'WhatsApp Cloud API is not configured.' };

  const to = normalizePhone(profile.phone);
  if (to.length < 11 || to.length > 15) return { ok: false, skipped: true, reason: 'Invalid WhatsApp number.' };

  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v26.0';
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
        components: [{
          type: 'body',
          parameters: [
            textParam(profile.name),
            textParam(summary.expenseTitle),
            textParam(summary.expenseAmount.toFixed(2)),
            textParam(summary.payer),
            textParam(summary.currentShare.toFixed(2)),
            textParam(summary.totalPaid.toFixed(2)),
            textParam(summary.totalSplit.toFixed(2)),
            textParam(`${summary.balanceText}. ${summary.settlementLine}`),
            textParam(summary.url)
          ]
        }]
      }
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error?.message || `WhatsApp API returned ${response.status}.`);
  }
  return { ok: true, messageId: result?.messages?.[0]?.id || null };
}
