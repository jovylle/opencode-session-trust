import assert from "node:assert/strict"
import test from "node:test"
import { footerLabel } from "../src/footer.ts"
import { enable, metadataKey, reset } from "../src/trust.ts"

test("footer follows trust, reset, and missing session state", () => {
  assert.equal(footerLabel(), "")
  assert.equal(footerLabel({}), "")
  const trusted = enable({})!
  assert.equal(footerLabel(trusted), " TRUSTED ")
  assert.equal(footerLabel(reset(trusted)!), "")
})

test("footer shows changed and invalid backup states without throwing", () => {
  assert.equal(footerLabel({ ...enable({})!, permissions: [] }), " TRUST CHANGED ")
  assert.equal(footerLabel({ metadata: { [metadataKey]: true } }), " TRUST BACKUP INVALID ")
})
