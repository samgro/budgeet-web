import "server-only"

import { ApiError, apiFetch } from "@/lib/api/transport"
import {
  ContractMismatch,
  expectArray,
  expectBoolean,
  expectNullableNumber,
  expectNullableString,
  expectObject,
  expectString,
} from "@/lib/api/validation"
import type {
  Transaction,
  TransactionAccount,
  TransactionBudget,
  TransactionCategory,
  TransactionCategoryEntry,
  TransactionSubscription,
  TransactionsResponse,
  TransactionTag,
} from "@/lib/types"

// GET /transactions. See SDG-213 for the verified contract — the pinned
// contract in that ticket was wrong; this shape was confirmed by curl
// against the live API and cross-checked against budgeet-hono's source.

const DEFAULT_LIMIT = 50

function toAccount(value: unknown, path: string): TransactionAccount {
  const record = expectObject(value, path)
  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
    mask: expectNullableString(record.mask, `${path}.mask`),
    institution: expectString(record.institution, `${path}.institution`),
    type: expectString(record.type, `${path}.type`) as TransactionAccount["type"],
    class: expectString(record.class, `${path}.class`) as TransactionAccount["class"],
  }
}

function toBudget(value: unknown, path: string): TransactionBudget | null {
  if (value === null) return null
  const record = expectObject(value, path)
  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
    class: expectString(record.class, `${path}.class`) as TransactionBudget["class"],
    color: expectNullableString(record.color, `${path}.color`),
    emoji: expectNullableString(record.emoji, `${path}.emoji`),
  }
}

function toCategoryEntry(value: unknown, path: string): TransactionCategoryEntry {
  const record = expectObject(value, path)
  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
  }
}

function toCategory(value: unknown, path: string): TransactionCategory | null {
  if (value === null) return null
  const record = expectObject(value, path)
  return {
    primary: toCategoryEntry(record.primary, `${path}.primary`),
    detailed: toCategoryEntry(record.detailed, `${path}.detailed`),
  }
}

function toSubscription(value: unknown, path: string): TransactionSubscription | null {
  if (value === null) return null
  const record = expectObject(value, path)
  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
  }
}

function toTag(value: unknown, path: string): TransactionTag {
  const record = expectObject(value, path)
  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
    parentId: expectNullableString(record.parentId, `${path}.parentId`),
    kind: expectString(record.kind, `${path}.kind`) as TransactionTag["kind"],
    color: expectNullableString(record.color, `${path}.color`),
    emoji: expectNullableString(record.emoji, `${path}.emoji`),
    path: expectString(record.path, `${path}.path`),
    source: expectString(record.source, `${path}.source`) as TransactionTag["source"],
  }
}

function toTransaction(value: unknown, path: string): Transaction {
  const record = expectObject(value, path)
  const direction = expectString(record.direction, `${path}.direction`)
  if (direction !== "outflow" && direction !== "inflow") {
    throw new ContractMismatch(`${path}.direction`, '"outflow" | "inflow"', direction)
  }
  return {
    id: expectString(record.id, `${path}.id`),
    date: expectString(record.date, `${path}.date`),
    amount: expectString(record.amount, `${path}.amount`),
    description: expectString(record.description, `${path}.description`),
    direction,
    budgetIsConfirmed: expectBoolean(record.budgetIsConfirmed, `${path}.budgetIsConfirmed`),
    ugcNote: expectNullableString(record.ugcNote, `${path}.ugcNote`),
    ugcIsHidden: expectBoolean(record.ugcIsHidden, `${path}.ugcIsHidden`),
    tags: expectArray(record.tags, `${path}.tags`).map((tagValue, index) =>
      toTag(tagValue, `${path}.tags[${index}]`),
    ),
    rawAmount: expectString(record.rawAmount, `${path}.rawAmount`),
    rawDescription: expectString(record.rawDescription, `${path}.rawDescription`),
    rawMerchantName: expectNullableString(record.rawMerchantName, `${path}.rawMerchantName`),
    rawCategoryDetailed: expectNullableString(
      record.rawCategoryDetailed,
      `${path}.rawCategoryDetailed`,
    ),
    aiConfidence: expectNullableNumber(record.aiConfidence, `${path}.aiConfidence`),
    aiReasoning: expectNullableString(record.aiReasoning, `${path}.aiReasoning`),
    account: toAccount(record.account, `${path}.account`),
    budget: toBudget(record.budget, `${path}.budget`),
    category: toCategory(record.category, `${path}.category`),
    subscription: toSubscription(record.subscription, `${path}.subscription`),
  }
}

function toTransactionsResponse(value: unknown): TransactionsResponse {
  const record = expectObject(value, "$")
  return {
    transactions: expectArray(record.transactions, "$.transactions").map(
      (transactionValue, index) => toTransaction(transactionValue, `$.transactions[${index}]`),
    ),
    nextCursor: expectNullableString(record.nextCursor, "$.nextCursor"),
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "response did not match the expected shape"
    throw new ApiError(message, { status: 0, code: "CONTRACT_MISMATCH" })
  }
}
