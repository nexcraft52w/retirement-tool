export async function logEvent(eventType: string, companyName?: string) {
  try {
    let sessionId = sessionStorage.getItem("analytics-session-id");

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("analytics-session-id", sessionId);
    }

    await fetch("/api/log-event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        sessionId,
        companyName: companyName ?? null,
      }),
    });
  } catch (e) {
    console.error("logEvent error", e);
  }
}