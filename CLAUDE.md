@AGENTS.md

# Budgeet Web

Next.js 16 + React 19 + Tailwind 4 front end for Budgeet. Bun is the package manager and the runner.

## The API is a separate repo

The Hono API lives at `../budgeet-hono`, outside this project. Treat the pinned contract as the
interface. If you need route source to answer a question, ask for that directory to be added to the
session rather than guessing at request or response shapes.

## Ports

Dev and start run on **3001** (`next dev -p 3001`). The API owns 3000. Don't move either.

## Environment

`API_BASE_URL` uses `127.0.0.1`, never `localhost`. `localhost` can resolve to `::1` first while the
API listens on IPv4 only, which surfaces as an intermittent `ECONNREFUSED` that looks like the API
being down.

`.env.local` is gitignored and stays that way.

Nothing in this app gets a `NEXT_PUBLIC_` prefix — that inlines the value into client JS. Server
config is read only through `@/lib/env`, which is `server-only`.

## Conventions

- Biome v2 owns formatting; don't hand-format. No semicolons, double quotes, 100-column lines.
  `bun run lint` to check, `bun run lint:fix` to write.
- **Amounts are numeric strings and stay strings.** The API sends them as strings; pass them through,
  compare them as strings, render them as strings. Parsing to `Number` introduces float rounding into
  currency, and it never round-trips back cleanly.

## Agent files

`AGENTS.md` is generated output, rewritten by `next dev`. Never hand-edit inside the
`BEGIN:nextjs-agent-rules` markers, and **never delete the file** — the generator falls back to
appending its block to the bottom of this file when `AGENTS.md` is missing.

## Git

Commit directly to `main`. No feature branches, no PRs — same as `budgeet-hono`.
