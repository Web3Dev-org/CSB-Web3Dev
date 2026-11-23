import type { ErrorDetail, FieldError } from "./types";

export class ApiProblemError extends Error {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string | null;
  readonly instance: string | null;
  readonly fieldErrors: FieldError[];

  constructor(problem: ErrorDetail) {
    super(problem.detail ?? problem.title);
    this.name = "ApiProblemError";
    this.type = problem.type;
    this.title = problem.title;
    this.status = problem.status;
    this.detail = problem.detail ?? null;
    this.instance = problem.instance ?? null;
    this.fieldErrors = problem.errors ?? [];
  }

  /**
   * Convertește lista `errors` (prezentă la HTTP 400) într-o hartă `{ [field]: message }`
   * pentru legarea directă la starea formularelor React.
   */
  getFieldErrorMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const item of this.fieldErrors) {
      if (!(item.field in map)) {
        map[item.field] = item.message;
      }
    }
    return map;
  }

  static fromUnknown(rawError: unknown, status = 500): ApiProblemError {
    if (rawError instanceof ApiProblemError) {
      return rawError;
    }

    if (isErrorDetail(rawError)) {
      return new ApiProblemError(rawError);
    }

    if (rawError instanceof Error) {
      return new ApiProblemError({
        type: "about:blank",
        title: "Eroare de rețea",
        status: 0,
        detail: rawError.message,
      });
    }

    return new ApiProblemError({
      type: "about:blank",
      title: "Eroare neașteptată",
      status,
      detail: "A apărut o eroare la comunicarea cu serverul.",
    });
  }
}

function isErrorDetail(value: unknown): value is ErrorDetail {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.status === "number"
  );
}