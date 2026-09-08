import "server-only"

import { env } from "@/lib/env"
import type {
  Transaction,
  TransactionAccount,
  TransactionBudget,
  TransactionCategory,
  TransactionSubscription,
  TransactionsResponse,
  TransactionTag,
} from "@/lib/types"

// The one module that talks to the API. Nothing else calls fetch against it
// directly — base URL, auth header, timeout, and error envelope all live
// here, along with the boundary validation that catches contract drift
// before an `as TransactionsResponse` could turn a renamed field into
// `undefined` three components deep. See SDG-213.

const TIMEOUT_MS = 5000
const DEFAULT_LIMIT = 50

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, options: { status: number; code: string; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = "ApiError"
    this.status = options.status
    this.code = options.code
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${env.API_BASE_URL}${path}`
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${env.API_TOKEN}`)

  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers,
      // Explicit rather than relying on the framework default, which has
      // moved across Next majors and will again.
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (cause) {
    // Covers both a refused/failed connection and an aborted-by-timeout
    // fetch — bun rejects each with a different error shape (a plain Error
    // with code "ConnectionRefused", vs a DOMException named "TimeoutError"),
    // neither of which is an ApiError, so one catch maps both.
    throw new ApiError(`Could not reach the API at ${url}`, {
      status: 0,
      code: "API_UNREACHABLE",
      cause,
    })
  }

  if (!res.ok) throw await toHttpError(res)

  return (await res.json()) as T
}

async function toHttpError(res: Response): Promise<ApiError> {
  const body: unknown = await res.json().catch(() => undefined)
  if (isErrorEnvelope(body)) {
    return new ApiError(body.error.message, { status: res.status, code: body.error.code })
  }
  return new ApiError(res.statusText || `HTTP ${res.status}`, {
    status: res.status,
    code: "HTTP_ERROR",
  })
}

function isErrorEnvelope(value: unknown): value is { error: { code: string; message: string } } {
  if (typeof value !== "object" || value === null) return false
  const err = (value as { error?: unknown }).error
  if (typeof err !== "object" || err === null) return false
  const { code, message } = err as { code?: unknown; message?: unknown }
  return typeof code === "string" && typeof message === "string"
}

// --- boundary validation ---------------------------------------------------
//
// Hand-rolled, not a schema library — this guards one endpoint. Every helper
// takes the dotted path to the value it's checking, so a mismatch anywhere
// names the offending field in the thrown message. Unknown extra fields on
// the response are ignored: additive API changes are safe and must not break
// this client. String-typed enums (account.type, budget.class, tag.kind,
// tag.source, …) are checked as strings, not against their literal union —
// direction is the exception, since amount's sign depends on it.

class ContractMismatch extends Error {
  constructor(path: string, expected: string, value: unknown) {
    super(`${path}: expected ${expected}, got ${describe(value)}`)
  }
}

function describe(value: unknown): string {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  return typeof value
}

function obj(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractMismatch(path, "object", value)
  }
  return value as Record<string, unknown>
}

function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ContractMismatch(path, "array", value)
  return value
}

function str(value: unknown, path: string): string {
  if (typeof value !== "string") throw new ContractMismatch(path, "string", value)
  return value
}

function nullableStr(value: unknown, path: string): string | null {
  return value === null ? null : str(value, path)
}

function nullableNum(value: unknown, path: string): number | null {
  if (value === null) return null
  if (typeof value !== "number") throw new ContractMismatch(path, "number | null", value)
  return value
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new ContractMismatch(path, "boolean", value)
  return value
}

function toAccount(value: unknown, path: string): TransactionAccount {
  const o = obj(value, path)
  return {
    id: str(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    mask: nullableStr(o.mask, `${path}.mask`),
    institution: str(o.institution, `${path}.institution`),
    type: str(o.type, `${path}.type`) as TransactionAccount["type"],
    class: str(o.class, `${path}.class`) as TransactionAccount["class"],
  }
}

function toBudget(value: unknown, path: string): TransactionBudget | null {
  if (value === null) return null
  const o = obj(value, path)
  return {
    id: str(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    class: str(o.class, `${path}.class`) as TransactionBudget["class"],
    color: nullableStr(o.color, `${path}.color`),
    emoji: nullableStr(o.emoji, `${path}.emoji`),
  }
}

function toCategory(value: unknown, path: string): TransactionCategory | null {
  if (value === null) return null
  const o = obj(value, path)
  return {
    detailed: str(o.detailed, `${path}.detailed`),
    primary: str(o.primary, `${path}.primary`),
    description: nullableStr(o.description, `${path}.description`),
    iconUrl: nullableStr(o.iconUrl, `${path}.iconUrl`),
  }
}

function toSubscription(value: unknown, path: string): TransactionSubscription | null {
  if (value === null) return null
  const o = obj(value, path)
  return {
    id: str(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
  }
}

function toTag(value: unknown, path: string): TransactionTag {
  const o = obj(value, path)
  return {
    id: str(o.id, `${path}.id`),
    name: str(o.name, `${path}.name`),
    parentId: nullableStr(o.parentId, `${path}.parentId`),
    kind: str(o.kind, `${path}.kind`) as TransactionTag["kind"],
    color: nullableStr(o.color, `${path}.color`),
    emoji: nullableStr(o.emoji, `${path}.emoji`),
    path: str(o.path, `${path}.path`),
    source: str(o.source, `${path}.source`) as TransactionTag["source"],
  }
}

function toTransaction(value: unknown, path: string): Transaction {
  const o = obj(value, path)
  const direction = str(o.direction, `${path}.direction`)
  if (direction !== "outflow" && direction !== "inflow") {
    throw new ContractMismatch(`${path}.direction`, '"outflow" | "inflow"', direction)
  }
  return {
    id: str(o.id, `${path}.id`),
    date: str(o.date, `${path}.date`),
    amount: str(o.amount, `${path}.amount`),
    description: str(o.description, `${path}.description`),
    direction,
    budgetIsConfirmed: bool(o.budgetIsConfirmed, `${path}.budgetIsConfirmed`),
    ugcNote: nullableStr(o.ugcNote, `${path}.ugcNote`),
    ugcIsHidden: bool(o.ugcIsHidden, `${path}.ugcIsHidden`),
    tags: arr(o.tags, `${path}.tags`).map((t, i) => toTag(t, `${path}.tags[${i}]`)),
    rawAmount: str(o.rawAmount, `${path}.rawAmount`),
    rawDescription: str(o.rawDescription, `${path}.rawDescription`),
    rawMerchantName: nullableStr(o.rawMerchantName, `${path}.rawMerchantName`),
    rawCategoryDetailed: nullableStr(o.rawCategoryDetailed, `${path}.rawCategoryDetailed`),
    aiConfidence: nullableNum(o.aiConfidence, `${path}.aiConfidence`),
    aiReasoning: nullableStr(o.aiReasoning, `${path}.aiReasoning`),
    account: toAccount(o.account, `${path}.account`),
    budget: toBudget(o.budget, `${path}.budget`),
    category: toCategory(o.category, `${path}.category`),
    subscription: toSubscription(o.subscription, `${path}.subscription`),
  }
}

function toTransactionsResponse(value: unknown): TransactionsResponse {
  const o = obj(value, "$")
  return {
    transactions: arr(o.transactions, "$.transactions").map((t, i) =>
      toTransaction(t, `$.transactions[${i}]`),
    ),
    nextCursor: nullableStr(o.nextCursor, "$.nextCursor"),
  }
}

export async function getTransactions({
  limit = DEFAULT_LIMIT,
}: {
  limit?: number
} = {}): Promise<TransactionsResponse> {
  const raw = await apiFetch<unknown>(`/transactions?limit=${limit}`)
  try {
    return toTransactionsResponse(raw)
  } catch (err) {
    const message = err instanceof Error ? err.message : "response did not match the expected shape"
    throw new ApiError(message, { status: 0, code: "CONTRACT_MISMATCH" })
  }
}
