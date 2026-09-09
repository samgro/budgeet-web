// Hand-rolled boundary validation, not a schema library — these are the
// shared primitives every endpoint module in this directory uses to shape
// its own response. Every helper takes the dotted path to the value it's
// checking, so a mismatch anywhere names the offending field in the thrown
// message. See src/lib/api/transactions.ts for how an endpoint uses these
// to turn `unknown` into a typed, verified response.

export class ContractMismatch extends Error {
  constructor(path: string, expected: string, value: unknown) {
    super(`${path}: expected ${expected}, got ${describe(value)}`)
  }
}

function describe(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

export function expectObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractMismatch(path, "object", value)
  }
  return value as Record<string, unknown>
}

export function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ContractMismatch(path, "array", value)
  return value
}

export function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new ContractMismatch(path, "string", value)
  return value
}

export function expectNullableString(value: unknown, path: string): string | null {
  return value === null ? null : expectString(value, path)
}

export function expectNullableNumber(value: unknown, path: string): number | null {
  if (value === null) return null
  if (typeof value !== "number") throw new ContractMismatch(path, "number | null", value)
  return value
}

export function expectBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new ContractMismatch(path, "boolean", value)
  return value
}
