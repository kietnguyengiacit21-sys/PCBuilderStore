export interface ApiHealth {
  status: "ok";
  service: string;
  timestamp: string;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetchApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/health`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`API health check returned HTTP ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("status" in payload) ||
    payload.status !== "ok" ||
    !("service" in payload) ||
    typeof payload.service !== "string" ||
    !("timestamp" in payload) ||
    typeof payload.timestamp !== "string"
  ) {
    throw new Error("API health check returned an invalid response.");
  }

  return {
    status: "ok",
    service: payload.service,
    timestamp: payload.timestamp,
  };
}
