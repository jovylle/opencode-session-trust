import { Plugin } from "@opencode/plugin/tui"
import type { SessionUpdateInput } from "@opencode/client"
import { enable, reset, status } from "./trust.ts"
import { footerLabel } from "./footer.ts"

export default Plugin.define({
  id: "session-trust.cli",
  setup(context) {
    const busy = new Set<string>()

    async function run(input?: string) {
      const route = context.ui.router.current()
      if (route.type !== "session") {
        context.ui.toast.show({ message: "Open a session before using /trust.", variant: "warning" })
        return
      }
      const sessionID = route.sessionID
      if (busy.has(sessionID)) return
      busy.add(sessionID)
      try {
        const command = input?.trim() || "status"
        if (!["all", "reset", "status"].includes(command)) {
          context.ui.toast.show({ message: "Usage: /trust all | /trust reset | /trust status", variant: "warning" })
          return
        }
        const session = await context.client.session.get({ sessionID })
        if (command === "status") {
          const current = status(session)
          context.ui.toast.show({
            title: "Session trust",
            message: current === "trusted" ? "TRUSTED — all tools allowed for this session. /trust reset to restore."
              : current === "changed" ? "Permissions changed outside this plugin; saved backup needs inspection."
              : "Normal permissions — this plugin has not enabled trust for this session.",
            variant: current === "normal" ? "info" : "warning",
            duration: 6000,
          })
          return
        }
        const patch = command === "all" ? enable(session) : reset(session)
        if (patch) {
          await context.client.session.update({
            sessionID,
            permissions: patch.permissions,
            metadata: patch.metadata as SessionUpdateInput["metadata"],
          })
          context.data.session.invalidate(sessionID)
        }
        context.ui.toast.show({
          title: "Session trust",
          message: command === "all"
            ? "TRUSTED — this session and future children. Persists until /trust reset."
            : patch ? "Previous session permissions restored. Existing children are unchanged."
              : "No trust backup for this session; nothing changed.",
          variant: command === "all" ? "warning" : "success",
          duration: 8000,
        })
      } catch (error) {
        context.ui.toast.show({
          title: "Session trust failed",
          message: error instanceof Error ? error.message : String(error),
          variant: "error",
          duration: 8000,
        })
      } finally {
        busy.delete(sessionID)
      }
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [{
        id: "session-trust.manage",
        title: "Session trust: all / reset / status",
        group: "Session trust",
        palette: true,
        slash: { name: "trust", arguments: true },
        run,
      }],
    }))

    context.ui.slot({
      append: "prompt.footer.status",
      render: (input) => (
        <text>{footerLabel(input.sessionID ? context.data.session.get(input.sessionID) : undefined)}</text>
      ),
    })
  },
})
