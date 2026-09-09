// Mirrors the wire shape of GET /transactions from budgeet-hono
// (../budgeet-hono/src/lib/transactions.ts). The API selects from a Postgres
// view, so drizzle's own inferred types are `T | null` on nearly everything —
// the nullability below is the tighter runtime guarantee read off the view
// SQL and join kind, not the API's own types. See SDG-213 for how this was
// verified (curl against the live API, then the API source).
//
// amount stays a string end to end — see CLAUDE.md.

export type Direction = "outflow" | "inflow"

export type AccountType = "checking" | "savings" | "credit" | "investment" | "loan" | "other"

export type AccountClass = "asset" | "liability"

export type BudgetClass = "fixed" | "essential" | "discretionary" | "income" | "excluded"

export type TagKind = "label" | "trip" | "business"

export type TagSource = "ai" | "ugc"

export interface TransactionAccount {
  id: string
  name: string
  mask: string | null
  institution: string
  type: AccountType
  class: AccountClass
}

export interface TransactionBudget {
  id: string
  name: string
  class: BudgetClass
  color: string | null
  emoji: string | null
}

// Updated 2026-09-09: category was reshaped by budgeet-hono from a flat
// { detailed, primary, description, iconUrl } into this nested form.
// description/iconUrl are gone — not just from the response, from the
// categories table itself. category is all-or-nothing null: an unclassified
// transaction, or one whose raw category isn't in the taxonomy, has no
// primary either — see toCategoryDisplay in budgeet-hono's transactions.ts.
export interface TransactionCategoryEntry {
  id: string
  name: string
}

export interface TransactionCategory {
  primary: TransactionCategoryEntry
  detailed: TransactionCategoryEntry
}

export interface TransactionSubscription {
  id: string
  name: string
}

export interface TransactionTag {
  id: string
  name: string
  parentId: string | null
  kind: TagKind
  color: string | null
  emoji: string | null
  path: string
  source: TagSource
}

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  amount: string // numeric string; negative on inflow rows
  description: string
  direction: Direction
  budgetIsConfirmed: boolean
  ugcNote: string | null
  ugcIsHidden: boolean
  tags: TransactionTag[]
  rawAmount: string
  rawDescription: string
  rawMerchantName: string | null
  rawCategoryDetailed: string | null
  aiConfidence: number | null // the only JS number on the row
  aiReasoning: string | null
  account: TransactionAccount // inner join — never null
  budget: TransactionBudget | null
  category: TransactionCategory | null
  subscription: TransactionSubscription | null
}

export interface TransactionsResponse {
  transactions: Transaction[]
  nextCursor: string | null
}
