import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { enable, reset, status, type Session } from "../src/trust.ts"

function api(method: string, path: string, body?: unknown): any {
  const args = ["api", method, path]
  if (body !== undefined) args.push("--data", JSON.stringify(body))
  const output = execFileSync("opencode", args, { encoding: "utf8", timeout: 30000 }).trim()
  return output ? JSON.parse(output).data : undefined
}

const created: string[] = []
const deny = [{ action: "session-trust-test", resource: "*", effect: "deny" }]
function create(extra = {}): string {
  const session = api("post", "/api/session", {
    title: "session-trust integration test (temporary)",
    location: { directory: process.cwd() },
    ...extra,
  })
  created.push(session.id)
  return session.id
}
function get(id: string): Session {
  return api("get", `/api/session/${id}`)
}
function evaluate(id: string): string {
  return api("post", `/api/session/${id}/permission`, {
    action: "session-trust-test", resources: ["integration"],
  }).effect
}

try {
  const first = create({ permissions: deny, metadata: { other: "preserved" } })
  const second = create({ permissions: deny })
  assert.equal(evaluate(first), "deny")
  api("patch", `/api/session/${first}`, enable(get(first)))
  assert.equal(status(get(first)), "trusted")
  assert.equal(evaluate(first), "allow")
  assert.equal(evaluate(second), "deny")
  assert.deepEqual(get(second).permissions, deny)
  const child = create({ parentID: first })
  assert.equal(evaluate(child), "allow")
  api("patch", `/api/session/${first}`, reset(get(first)))
  assert.equal(status(get(first)), "normal")
  assert.equal(evaluate(first), "deny")
  assert.equal(get(first).metadata?.other, "preserved")
  assert.equal(evaluate(child), "allow")
  console.log("PASS: live permission evaluation, session isolation, child inheritance, reset, and metadata preservation")
} finally {
  for (const id of created.reverse()) api("delete", `/api/session/${id}`)
}
