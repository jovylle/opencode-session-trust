export type Rule = {
  readonly action: string
  readonly resource: string
  readonly effect: "allow" | "ask" | "deny"
}

export type Session = {
  readonly permissions?: readonly Rule[]
  readonly metadata?: Readonly<Record<string, unknown>>
}

export const metadataKey = "opencode-session-trust"
export const allowAll: Rule = { action: "*", resource: "*", effect: "allow" }

type Backup = {
  version: 1
  previous: Rule[]
}

type Patch = {
  permissions: Rule[]
  metadata: Record<string, unknown>
}

function isRule(value: unknown): value is Rule {
  if (!value || typeof value !== "object") return false
  const rule = value as Record<string, unknown>
  return typeof rule.action === "string" && typeof rule.resource === "string"
    && (rule.effect === "allow" || rule.effect === "ask" || rule.effect === "deny")
}

function backup(session: Session): Backup | undefined {
  const value = session.metadata?.[metadataKey]
  if (value === undefined || value === null) return undefined
  if (typeof value !== "object") throw new Error("Invalid trust backup; refusing to overwrite permissions.")
  const saved = value as Record<string, unknown>
  if (saved.version !== 1 || !Array.isArray(saved.previous) || !saved.previous.every(isRule)) {
    throw new Error("Invalid trust backup; refusing to overwrite permissions.")
  }
  return { version: 1, previous: saved.previous }
}

function sameRules(left: readonly Rule[], right: readonly Rule[]): boolean {
  return left.length === right.length && left.every((rule, index) => {
    const other = right[index]
    return rule.action === other.action && rule.resource === other.resource && rule.effect === other.effect
  })
}

export function status(session: Session): "trusted" | "normal" | "changed" {
  const saved = backup(session)
  if (!saved) return "normal"
  return sameRules(session.permissions ?? [], [...saved.previous, allowAll]) ? "trusted" : "changed"
}

export function enable(session: Session): Patch | undefined {
  const current = status(session)
  if (current === "trusted") return undefined
  if (current === "changed") throw new Error("Session permissions changed outside this plugin; refusing to overwrite them.")
  const previous = (session.permissions ?? []).map((rule) => ({ ...rule }))
  return {
    permissions: [...previous, { ...allowAll }],
    metadata: {
      ...session.metadata,
      [metadataKey]: { version: 1, previous },
    },
  }
}

export function reset(session: Session): Patch | undefined {
  const saved = backup(session)
  if (!saved) return undefined
  if (status(session) === "changed") {
    throw new Error("Session permissions changed outside this plugin; refusing to overwrite them. Inspect the session through the API.")
  }
  return {
    permissions: saved.previous,
    metadata: { ...session.metadata, [metadataKey]: null },
  }
}
