export const emailService = {
    /**
     * Send an invite email to a user who is not yet registered
     */
    async sendInvite(toEmail: string, groupName: string, inviterName: string): Promise<void> {
        if (Platform.OS === 'web') {
            try {
                const response = await fetch('/api/invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ toEmail, groupName, inviterName }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to send email via proxy");
                }
                console.log(`Invite sent successfully to ${toEmail} (via proxy)`);
                return;
            } catch (error: any) {
                console.error('Failed to send invite email (proxy):', error);
                throw error;
            }
        }

        // Mobile / Native implementation
        const API_KEY = process.env.EXPO_PUBLIC_MAILEROO_API_KEY || "a1012e1c15579405f877746657c4886080b55b6c642ac6ef826167b2a6b0b213";
        const FROM_EMAIL = process.env.EXPO_PUBLIC_MAILEROO_FROM_EMAIL || "no-reply@xpense-share.com";

        const payload = {
            from: {
                address: FROM_EMAIL,
                display_name: "Xpense Share"
            },
            to: [
                {
                    address: toEmail
                }
            ],
            subject: `Join ${groupName} on Xpense Share`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #10b981;">You've been invited!</h2>
                    <p>Hi there,</p>
                    <p><strong>${inviterName}</strong> has invited you to join their group "<strong>${groupName}</strong>" on <strong>Xpense Share</strong>.</p>
                    <p>Xpense Share is the easiest way to split bills and track expenses with friends.</p>
                    <br>
                    <a href="https://xpense-share.com/install" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-bold: true;">Install App & Join</a>
                    <br><br>
                    <p>See you there!<br>The Xpense Share Team</p>
                </div>
            `,
            plain: `${inviterName} has invited you to join their group "${groupName}" on Xpense Share. Install the app to get started: https://xpense-share.com/install`
        };

        try {
            const response = await fetch('https://smtp.maileroo.com/api/v2/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Maileroo response error:', errorText);
                throw new Error(`Maileroo error: ${errorText}`);
            }

            console.log(`Invite sent successfully to ${toEmail}`);
        } catch (error: any) {
            console.error('Failed to send invite email:', error);

            let errorMessage = error.message || "Could not send email invite.";

            if (errorMessage === 'Failed to fetch') {
                errorMessage = "Network Error (Failed to fetch). This usually happens due to browser security (CORS) when calling Maileroo directly from a web browser. Please try on a mobile device or check if Maileroo requires a server-side proxy.";
            }

            throw new Error(errorMessage);
        }
    }
};
