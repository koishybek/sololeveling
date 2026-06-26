/** Generate a unique id (works in browsers and Node 18+). */
export function newId(): string {
  return crypto.randomUUID();
}
