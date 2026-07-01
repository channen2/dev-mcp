export class ApiError extends Error {
  constructor(
    public readonly service: string,
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`${service} API error (${status}): ${detail}`);
  }
}

export async function request<T>(
  service: string,
  url: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new ApiError(service, res.status, detail.slice(0, 500));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
