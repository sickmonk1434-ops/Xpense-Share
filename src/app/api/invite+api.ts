import { ExpoRequest } from 'expo-router/server';

export async function POST(request: ExpoRequest) {
    try {
        const { toEmail, groupName, inviterName } = await request.json();

        const API_KEY = process.env.EXPO_PUBLIC_MAILEROO_API_KEY;
        const FROM_EMAIL = process.env.EXPO_PUBLIC_MAILEROO_FROM_EMAIL;

        if (!API_KEY || !FROM_EMAIL) {
            return Response.json({ error: "Server misconfiguration: Missing email keys" }, { status: 500 });
        }

        const response = await fetch('https://smtp.maileroo.com/api/v2/emails', {
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

        if (!response.ok) {
            const errorText = await response.text();
            return Response.json({ error: `Maileroo error: ${errorText}` }, { status: response.status });
        }

        return Response.json({ success: true });

    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}
