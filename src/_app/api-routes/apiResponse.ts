export type ApiErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' | 'RULE_VIOLATION';

const STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RULE_VIOLATION: 422,
};

export const apiError = (code: ApiErrorCode, message: string, field?: string) =>
  Response.json({ code, message, field }, { status: STATUS[code] });

const LATENCY_MS = Number(process.env.MOCK_LATENCY_MS ?? 400);

export const simulateLatency = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

export const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
};
