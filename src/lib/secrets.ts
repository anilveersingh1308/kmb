import { timingSafeEqual } from "node:crypto";

/** Constant-time comparison of a presented secret against the expected one. */
export function secretsMatch(presented: string | null | undefined, expected: string | undefined) {
  if (!presented || !expected) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
