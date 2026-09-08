// Smoke-tests the whole path: env -> apiFetch -> boundary validation ->
// typed result, against the real API. Run with `bun run probe`.
//
// Needs --conditions=react-server (baked into the "probe" script): src/lib/api.ts
// imports "server-only", whose default export condition is a module that
// unconditionally throws — only the react-server condition (the one Next
// sets for Server Components) resolves to the empty stub instead.

import { ApiError, getTransactions } from "@/lib/api"

async function main() {
  const { transactions, nextCursor } = await getTransactions({ limit: 3 })

  console.log(JSON.stringify(transactions, null, 2))
  console.log(`\n${transactions.length} transaction(s), nextCursor: ${JSON.stringify(nextCursor)}`)
}

main().catch((err: unknown) => {
  if (err instanceof ApiError) {
    console.error(`ApiError [${err.code}] status=${err.status}: ${err.message}`)
  } else {
    console.error(err)
  }
  process.exit(1)
})
