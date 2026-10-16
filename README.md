# opencode-session-trust

Trust the OpenCode conversation you're in, not every conversation you open.

A small **OpenCode V2 terminal plugin** with explicit, reversible, session-scoped tool permissions. No global autoaccept setting, project-wide approvals, or OpenCode fork.

```text
/trust all       Allow every tool permission in this session
/trust reset     Restore this session's previous permission rules
/trust status    Check whether this plugin has enabled trust
```

`/trust` without arguments shows status. The command palette also includes **Session trust: all / reset / status**. Trusted sessions show `TRUSTED` in the prompt footer.

## Install from GitHub

Clone to a directory you intend to keep:

```sh
git clone https://github.com/jovylle/opencode-session-trust.git
```

Add its **absolute directory path** to the `plugins` array in `~/.config/opencode/cli.json`, preserving your existing settings:

```json
{
  "plugins": ["/absolute/path/to/opencode-session-trust"]
}
```

Reopen the terminal client after installing, then resume any existing session and run `/trust all`. You don't need a new conversation. Installing the plugin does not grant trust by itself.

Alternatively, add the directory to `plugins` in your project `opencode.jsonc`; the package exposes both the server entrypoint and the automatically loaded `./tui` entrypoint. The server entrypoint is intentionally inert. No tools or server slash commands that let the model grant itself trust are registered.

This repository is not yet published to npm. Use the local clone installation above, not an npm package name.

## Scope and safety

| Target | Effect |
| --- | --- |
| Current session | All tool permission actions/resources are allowed |
| Other existing sessions | Unchanged |
| Global/project permission configuration | Unchanged |
| Newly created child sessions | Inherit the parent's current permission rules |
| Existing children when the parent is reset | Unchanged; reset does not recursively revoke inherited trust |
| Organization hard-deny policies | Still enforced |

**This really is trust-all.** The plugin appends an allow-all rule after your session's existing rules. Session rules are evaluated after agent rules, so ordinary configured asks **and denies** can be overridden. This differs from CLI autoaccept, which accepts prompts but retains configured denies. Only enable it for work you trust.

- Trust persists on the conversation across terminal restarts until you run `/trust reset`.
- Closing the terminal, removing the plugin, or disabling it **does not revoke trust**. Reset first.
- Reset restores the original session rules, not a blanket “ask” policy. OpenCode's normal agent, project, and saved-approval behavior still applies.
- Existing pending permission prompts are not automatically answered. Approve or reject them normally; the new rules apply to subsequent checks.
- Clarifying questions are separate from permission approvals and may still appear.
- `/trust status` reports this plugin's saved state, not a full audit of effective permissions or inherited trust in children.
- If another tool changes session permissions while trust is active, the plugin refuses to overwrite them. Inspect and reconcile the session through the API instead.

## How it works

The terminal command captures the active route's session ID, fetches that session, and calls the existing V2 API:

```ts
await client.session.update({
  sessionID,
  permissions: [...previousRules, { action: "*", resource: "*", effect: "allow" }],
  metadata: { ...metadata, "opencode-session-trust": { version: 1, previous: previousRules } },
})
```

The backup lives in that session's metadata alongside its permissions, not in a global configuration file. Repeated `/trust all` does not replace the original backup. Reset restores the backup and marks it inactive. Unrelated metadata is preserved.

## Compatibility

Targets **OpenCode V2**. Typechecked against `@opencode/plugin@2.0.25`; live permission evaluation, session isolation, child inheritance, and reset were verified against an installed **OpenCode v2.0.25** server. A real v2.0.25 TUI smoke test also verified plugin loading and dispatch of all/status/reset. Not compatible with the V1 plugin API.

Official references:

- [Plugin permission and session APIs](https://opencode.ai/v2/docs/build/plugins#permissions)
- [CLI plugins and slash commands](https://opencode.ai/v2/docs/build/plugins/cli)
- [Permission rule precedence](https://opencode.ai/v2/docs/permissions)

## Development

Use Node.js 22.18+ (Node.js 24 recommended):

```sh
npm ci
npm run check
```

Optional integration test with an installed, working OpenCode V2 service:

```sh
npm run test:integration
```

This creates temporary sessions, evaluates a synthetic permission action without executing tools or calling a model, verifies session isolation and child inheritance, restores permissions, and deletes only those test sessions. It does not change existing sessions or configuration.

## License

MIT
