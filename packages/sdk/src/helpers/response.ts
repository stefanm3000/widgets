import { PulseApiError } from "../errors/pulse-api-error.js";

export async function responseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new PulseApiError(
      "The API returned invalid JSON",
      response.status,
      "invalid_response",
    );
  }
}
