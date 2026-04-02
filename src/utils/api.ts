type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  retries?: number;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const parseResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

export const apiRequest = async (
  endpoint: string,
  { method = "GET", body, headers = {}, retries = 1 }: ApiRequestOptions = {},
) => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });

      const data = await parseResponseBody(response);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Erreur ${response.status} pendant l'appel à ${endpoint}`,
        );
      }

      return data;
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw lastError;
      }
      await wait(250 * (attempt + 1));
    }
  }

  throw lastError || new Error(`Erreur inconnue pendant l'appel à ${endpoint}`);
};

export const loadState = () => apiRequest("/api/state", { retries: 1 });

export const saveState = (state) =>
  apiRequest("/api/state", {
    method: "PUT",
    body: state,
    retries: 1,
  });

export const resetState = () =>
  apiRequest("/api/reset", {
    method: "POST",
    retries: 0,
  });

export const saveEntity = (endpoint, payload, method = "PATCH") =>
  apiRequest(endpoint, {
    method,
    body: payload,
    retries: 1,
  });
