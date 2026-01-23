/**
 * API Fetch utility - routes all API calls through Electron's main process
 * This is required because fetch from the renderer fails in production builds
 * when the app is loaded from file:// protocol
 */

interface FetchResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}

/**
 * Fetch wrapper that uses IPC to make requests through the main process
 * Compatible with the standard fetch API for easy migration
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<FetchResponse> {
  const result = await window.electronAPI.proxyFetch(url, {
    method: options.method as string | undefined,
    headers: options.headers as Record<string, string> | undefined,
    body: options.body as string | undefined,
  });

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Network request failed');
  }

  const { ok, status, body } = result.data;

  return {
    ok,
    status,
    json: async () => JSON.parse(body),
    text: async () => body,
  };
}
