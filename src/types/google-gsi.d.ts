export { };

declare global {
    namespace google {
        namespace accounts {
            namespace oauth2 {
                type UxMode = "popup" | "redirect";

                interface CodeClientConfig {
                    client_id: string;
                    scope: string;
                    callback: (response: { code?: string; error?: string }) => void;

                    ux_mode?: UxMode;
                    access_type?: "online" | "offline";
                    prompt?: string;
                    state?: string;
                    hint?: string;
                    hosted_domain?: string;
                }

                interface CodeClient {
                    requestCode(): void;
                }

                function initCodeClient(config: CodeClientConfig): CodeClient;
            }
        }
    }
}
