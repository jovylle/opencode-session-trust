import { status, type Session } from "./trust.ts"

export function footerLabel(session?: Session): string {
  if (!session) return ""
  try {
    const current = status(session)
    return current === "trusted" ? " TRUSTED " : current === "changed" ? " TRUST CHANGED " : ""
  } catch {
    return " TRUST BACKUP INVALID "
  }
}
