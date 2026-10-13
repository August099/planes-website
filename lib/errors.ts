// Mensaje de un error atrapado en un catch, que en TypeScript es `unknown` (puede no ser un Error).
export function errorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}
