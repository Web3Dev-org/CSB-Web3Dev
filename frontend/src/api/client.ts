import createClient, { type Middleware } from "openapi-fetch";
import { ApiProblemError } from "./errors";
import { getAccessToken, notifyUnauthorized } from "./token";
import type { paths } from "./types";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "/api";

const IDEMPOTENT_OPERATIONS = new Set([
  "POST /bookings",
  "POST /payments/initiate",
]);

function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback RFC 4122 v4 pentru medii HTTP non-secure în dezvoltare locală
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

const authMiddleware: Middleware = {
  onRequest({ request, schemaPath }) {
    if (schemaPath.startsWith("/auth/")) {
      return request;
    }

    const token = getAccessToken();
    if (token && !request.headers.has("Authorization")) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }

    return request;
  },
  onResponse({ response, schemaPath }) {
    if (response.status === 401 && !schemaPath.startsWith("/auth/")) {
      notifyUnauthorized();
    }
    return response;
  },
};

const idempotencyMiddleware: Middleware = {
  onRequest({ request, schemaPath }) {
    const operationKey = `${request.method.toUpperCase()} ${schemaPath}`;
    if (
      IDEMPOTENT_OPERATIONS.has(operationKey) &&
      !request.headers.has("Idempotency-Key")
    ) {
      request.headers.set("Idempotency-Key", generateUuidV4());
    }
    return request;
  },
};

export const apiClient = createClient<paths>({
  baseUrl: BASE_URL,
  headers: {
    Accept: "application/json, application/problem+json",
  },
});

apiClient.use(authMiddleware, idempotencyMiddleware);

/**
 * Extrage `data` dintr-un răspuns `openapi-fetch` sau aruncă `ApiProblemError`
 * dacă serverul a returnat o eroare RFC 7807.
 */
export async function unwrap<T>(
  requestPromise: Promise<{
    data?: T;
    error?: unknown;
    response: Response;
  }>,
): Promise<T> {
  const { data, error, response } = await requestPromise;

  if (error !== undefined || !response.ok) {
    throw ApiProblemError.fromUnknown(error, response.status);
  }

  return data as T;
}