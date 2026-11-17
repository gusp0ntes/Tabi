export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Tabi-Request": "1",
        ...options.headers,
      },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(
      "Não foi possível conectar. Confira sua conexão e tente novamente.",
      0,
    );
  }
  if (response.status === 204) return undefined as T;
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      "O serviço está indisponível. Tente novamente em instantes.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(
      (result as { message?: string }).message ||
        "Não foi possível concluir essa ação.",
      response.status,
    );
  return result as T;
}
