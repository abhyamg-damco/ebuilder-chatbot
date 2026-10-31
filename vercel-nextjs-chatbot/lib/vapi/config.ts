export type VapiClientConfig = {
  publicKey: string;
  assistantId: string;
};

/**
 * Client-safe Vapi widget credentials read on the server and passed as props.
 * Returns null when either env var is unset so the widget stays hidden.
 */
export function getVapiClientConfig(): VapiClientConfig | null {
  const publicKey = process.env.VAPI_PUBLIC_KEY?.trim();
  const assistantId = process.env.VAPI_ASSISTANT_ID?.trim();

  if (!publicKey || !assistantId) {
    return null;
  }

  return { publicKey, assistantId };
}
