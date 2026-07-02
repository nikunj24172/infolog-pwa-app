/** Tiny fetch wrapper for the browser. Throws on non-2xx with the API message. */
export async function api<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function post<T = unknown>(path: string, body?: unknown) {
  return api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function patch<T = unknown>(path: string, body?: unknown) {
  return api<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
}
