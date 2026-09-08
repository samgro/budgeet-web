import "server-only"

// Nothing in this app ever gets a NEXT_PUBLIC_ prefix. Next inlines every
// NEXT_PUBLIC_ variable into the JavaScript bundle delivered to the browser,
// replacing process.env.NEXT_PUBLIC_X with a hard-coded literal — so a
// NEXT_PUBLIC_API_TOKEN would ship the bearer token to every visitor.
// The "server-only" import above is the enforcement rather than the reminder:
// importing this module from a Client Component fails the build.

// Read and checked at module scope so an absent var fails at import with the
// variable's name in the message. Left unchecked it becomes "Bearer undefined"
// and the API answers 401, which reads like an auth bug rather than a config one.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

// Literal process.env.X access, not process.env[name] — Next's env handling
// only recognizes the static form.
export const env = Object.freeze({
  API_BASE_URL: required("API_BASE_URL", process.env.API_BASE_URL),
  API_TOKEN: required("API_TOKEN", process.env.API_TOKEN),
})
