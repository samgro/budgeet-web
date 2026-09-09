import { connection } from "next/server"
import { getTransactions } from "@/lib/api"

export default async function Home() {
  await connection()
  const { transactions } = await getTransactions({ limit: 50 })

  return (
    <ul>
      {transactions.map((t) => (
        <li key={t.id}>
          {t.date} — {t.description} — {t.amount} — {t.category?.detailed ?? "—"}
        </li>
      ))}
    </ul>
  )
}
