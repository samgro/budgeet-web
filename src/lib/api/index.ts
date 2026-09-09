import "server-only"

// The public surface of the API client — everything a consumer outside this
// directory is allowed to import. Add each new endpoint's exports here as
// it lands; the endpoint's own request/response shaping stays in its own
// file (see transactions.ts) and is never imported directly from outside
// src/lib/api/.

export { getTransactions } from "@/lib/api/transactions"
export { ApiError } from "@/lib/api/transport"
