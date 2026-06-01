import { getAllSiteConfig } from "./config";

export async function captureException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  const config = await getObservabilityConfig();
  if (!config.enabled || !config.dsn) return;

  const dsn = parseSentryDsn(config.dsn);
  if (!dsn) return;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    environment: config.environment,
    platform: "javascript",
    level: "error",
    exception: {
      values: [{
        type: error instanceof Error ? error.name : "Error",
        value: error instanceof Error ? error.message : String(error),
        stacktrace: error instanceof Error ? { frames: parseStack(error.stack) } : undefined,
      }],
    },
    extra: context,
  };

  const envelope = [
    JSON.stringify({ event_id: eventId, dsn: config.dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  await fetch(`${dsn.baseUrl}/api/${dsn.projectId}/envelope/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-sentry-envelope",
      "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=apras-next/1.0`,
    },
    body: envelope,
  }).catch(() => {});
}

async function getObservabilityConfig() {
  const config = await getAllSiteConfig("observability");
  return {
    enabled: config.sentry_enabled === "true" || process.env.SENTRY_ENABLED === "true",
    dsn: config.sentry_dsn || process.env.SENTRY_DSN || "",
    environment: config.sentry_environment || process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
  };
}

function parseSentryDsn(dsn: string): { baseUrl: string; projectId: string; publicKey: string } | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "").split("/").pop() ?? "";
    const publicKey = url.username;
    if (!projectId || !publicKey) return null;
    return { baseUrl: `${url.protocol}//${url.host}`, projectId, publicKey };
  } catch {
    return null;
  }
}

function parseStack(stack?: string) {
  if (!stack) return undefined;
  return stack.split("\n").slice(1).map((line) => ({ function: line.trim() })).reverse();
}
