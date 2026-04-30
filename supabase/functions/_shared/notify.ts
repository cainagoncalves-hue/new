const WEBHOOK_URL = Deno.env.get("NOTIFY_WEBHOOK_URL");

export interface NotifyPayload {
  type: "token_expired" | "sync_error";
  message: string;
  detail?: string;
  timestamp: string;
}

export async function notify(payload: NotifyPayload): Promise<void> {
  if (!WEBHOOK_URL) return;

  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 *Elofy Sync — ${payload.type.toUpperCase()}*\n${payload.message}`,
        ...payload,
      }),
    });
  } catch {
    // Falha na notificação não deve derrubar o sync
  }
}
