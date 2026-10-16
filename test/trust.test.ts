import assert from "node:assert/strict"
import test from "node:test"
import { allowAll, enable, metadataKey, reset, status, type Session } from "../src/trust.ts"

test("trust applies last and preserves the original rules and metadata", () => {
  const session: Session = {
    permissions: [{ action: "shell", resource: "*", effect: "ask" }],
    metadata: { other: { untouched: true } },
  }
  const original = structuredClone(session)
  const patch = enable(session)!
  assert.deepEqual(patch.permissions, [...session.permissions!, allowAll])
  assert.deepEqual(patch.metadata.other, session.metadata!.other)
  assert.deepEqual(session, original)
  assert.equal(status(patch), "trusted")
  assert.deepEqual(reset(patch)!.permissions, session.permissions)
})

test("repeated trust keeps the first backup", () => {
  const trusted = enable({})!
  assert.equal(enable(trusted), undefined)
  assert.deepEqual(reset(trusted)!.permissions, [])
})

test("reset and status do not change an untrusted session", () => {
  assert.equal(status({}), "normal")
  assert.equal(reset({}), undefined)
})

test("reset deactivates the backup and supports another trust cycle", () => {
  const restored = reset(enable({ metadata: { other: 42 } })!)!
  assert.equal(status(restored), "normal")
  assert.equal(restored.metadata.other, 42)
  assert.equal(restored.metadata[metadataKey], null)
  assert.equal(status(enable(restored)!), "trusted")
})

test("trusting one session does not mutate another", () => {
  const shared: Session = { permissions: [{ action: "edit", resource: "*", effect: "deny" }] }
  const other = structuredClone(shared)
  enable(shared)
  assert.deepEqual(shared, other)
  assert.equal(status(other), "normal")
})

test("external permission changes are not silently overwritten", () => {
  const trusted = enable({})!
  const changed = { ...trusted, permissions: [] }
  assert.equal(status(changed), "changed")
  assert.throws(() => reset(changed), /outside this plugin/)
  assert.throws(() => enable(changed), /outside this plugin/)
})

test("invalid backups fail closed", () => {
  for (const value of [true, {}, { version: 2, previous: [] }, { version: 1, previous: [null] },
    { version: 1, previous: [{ action: "*", resource: "*", effect: ["allow"] }] }]) {
    const session = { metadata: { [metadataKey]: value } }
    assert.throws(() => enable(session), /Invalid trust backup/)
    assert.throws(() => reset(session), /Invalid trust backup/)
  }
})

test("rule comparison does not depend on object key order", () => {
  const trusted = enable({})!
  assert.equal(status({ ...trusted, permissions: [{ effect: "allow", resource: "*", action: "*" }] }), "trusted")
})
