export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { toEmail, groupName, inviterName } = request.body;

        const API_KEY = process.env.EXPO_PUBLIC_MAILEROO_API_KEY;
        const FROM_EMAIL = process.env.EXPO_PUBLIC_MAILEROO_FROM_EMAIL;

        if (!API_KEY || !FROM_EMAIL) {
            return response.status(500).json({ error: "Server misconfiguration: Missing email keys" });
        }

        const fetchResponse = await fetch('https://smtp.maileroo.com/api/v2/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY,
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: toEmail,
                subject: `Join "${groupName}" on Xpense Share!`,
                html: `
            <div style="font-family: sans-serif; color: #333;">
                <h1>You've been invited!</h1>
                <p>Hello,</p>
                <p><strong>${inviterName}</strong> has invited you to join the group <strong>"${groupName}"</strong> on Xpense Share.</p>
                <p>Track expenses, split bills, and settle up easily.</p>
                <a href="https://xpense-share.vercel.app" style="display: inline-block; background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">Join Now</a>
            </div>
        `,
            }),
        });

        if (!fetchResponse.ok) {
            const errorText = await fetchResponse.text();
            return response.status(fetchResponse.status).json({ error: `Maileroo error: ${errorText}` });
        }

        return response.status(200).json({ success: true });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
