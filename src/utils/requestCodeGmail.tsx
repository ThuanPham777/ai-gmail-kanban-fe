const GMAIL_SCOPE = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export function requestGmailCode(): Promise<string> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return Promise.reject(new Error("Missing VITE_GOOGLE_CLIENT_ID"));

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) return Promise.reject(new Error("Google OAuth2 not available"));

    return new Promise((resolve, reject) => {
        const codeClient = oauth2.initCodeClient({
            client_id: clientId,
            scope: GMAIL_SCOPE,
            ux_mode: "popup",
            access_type: "offline",
            prompt: "consent",
            callback: (resp: any) => {
                if (resp?.code) resolve(resp.code);
                else reject(new Error("No authorization code returned"));
            },
        });

        codeClient.requestCode();
    });
}