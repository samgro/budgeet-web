# Budgeet Web

Next.js front end for Budgeet.

## Run

```bash
bun install
bun run dev
```

Serves on **http://localhost:3001**. Requires `budgeet-hono` running on port 3000
(`../budgeet-hono`, `bun run dev`), and a `.env.local` with `API_BASE_URL=http://127.0.0.1:3000`
and `API_TOKEN` set.
