# AGENTS.md — Context for AI agents working on this project

This file provides the context an AI agent needs to work effectively on `vfp-agent` across sessions. Read it before making any changes.

---

## What this project is

`vfp-agent` is an installable AI agent that generates Value Framing Packets (VFPs) — structured 17-section artefacts that expose behavioural intent, surface uncertainty, and define the smallest meaningful validation slice for a delivery request. It also guides retrospectives after delivery to close the packet lifecycle and feed learning back into the methodology.

The agent installs to 7 AI tools via a single interactive Node.js installer. No npm runtime dependencies.

GitHub: `https://github.com/jgleal/vfp-agent`

---

## Repo structure

```
agents/vfp.md              # Single source of truth for the agent prompt (opencode format)
bin/install.js             # Interactive TUI installer — the core of this project
install.sh                 # Curl-pipeable bash shim → delegates to bin/install.js via npx
package.json               # Package config; bin entry point is bin/install.js
methodology/               # Canonical methodology documentation (9 files)
  core-methodology.md      # §2 Core Delivery Assumptions, §3 Primary Reasoning Priorities
  vfp-guide.md             # Full VFP guide including §4.18 Validation Outcome
  capability-slicing.md    # Slicing principles and patterns
  risk-uncertainty.md      # Risk classification and uncertainty handling
  pilot-operational-model.md
  validation-evidence-patterns.md
  example-library.md       # Examples intentionally sparse — populated via learning loop
  retro-procedure.md       # 3-level retro output model, PR flow as canonical Level 3 path
  learnings.md             # Running log of observed patterns (watching → confirmed → methodology-proposed → methodology-updated)
README.md                  # User-facing docs with Mermaid flow diagram
AGENTS.md                  # This file
```

---

## Key design decisions

**Single source of truth for the prompt**
`agents/vfp.md` is the only place the VFP prompt body exists. The installer reads it and transforms the frontmatter per target tool at write time. The body is never duplicated. Do not edit tool-specific output files directly — edit `agents/vfp.md`.

**Zero npm runtime dependencies**
The installer uses Node.js stdlib only. No dependencies in `package.json`. This is intentional and must be preserved. The installer runs via `npx` (dev tooling, not runtime).

**Zero-dependency Node installer**
`install.sh` is a one-line curl-pipeable shim: `exec npx -y "github:jgleal/vfp-agent" "$@"`. All logic lives in `bin/install.js`. The shim must stay minimal.

**Interactive TUI as default**
`bin/install.js` presents a keyboard-navigable tool selector by default (`↑/↓` move, `space` toggle, `a` all/none, `enter` confirm, `q` quit). `--all` flag skips the TUI for scripted use.

**`--update` flag**
Reads `~/.config/vfp-agent/state.json` (`{ sha, tools, installedAt }`), fetches latest SHA from `https://api.github.com/repos/jgleal/vfp-agent/commits/main` with `Accept: application/vnd.github.sha`, compares, and reinstalls all previously installed tools if behind. Always fetches the source file from GitHub (not local) when updating.

**State file location**
`~/.config/vfp-agent/state.json` on macOS/Linux. `%APPDATA%\vfp-agent\state.json` on Windows. Written after a successful install. Read by `--update`.

**Notion publish is required**
Publishing a generated VFP to Notion is a required step in the packet lifecycle — not optional. A packet that has not been published is in Draft state and incomplete. The agent must make this clear. Notion page selection happens at publish time, not install time.

**Methodology changes are gated**
`methodology/` docs are only updated at Level 3: confirmed pattern across 2+ independent packets, via PR. Single-event observations go to `learnings.md` as `watching`. The agent proposes changes but does not apply them — human reviews and merges via `gh pr create`.

**`methodology/learnings.md` is not runtime context**
It is source material for doc evolution. The agent writes to it directly using file tools. It is not injected into agent sessions.

---

## Tool install paths

The installer writes the agent prompt to these locations per tool:

| Tool | Path |
|---|---|
| opencode | `~/.config/opencode/agents/vfp.md` |
| claude | `~/.claude/agents/vfp.md` |
| cursor | `~/.cursor/agents/vfp.md` (or project `.cursor/agents/`) |
| gemini | `~/.gemini/agents/vfp.md` |
| codex | `~/.codex/agents/vfp.md` |
| vscode | tool-specific path (see `bin/install.js`) |
| windsurf | tool-specific path (see `bin/install.js`) |

MCP config (Notion) is injected into each tool's config file:

| Tool | MCP config path |
|---|---|
| opencode | `~/.config/opencode/opencode.json` |
| claude | `~/.claude/settings.json` |
| cursor | `~/.cursor/mcp.json` |
| vscode | `~/Library/Application Support/Code/User/mcp.json` |
| windsurf | `~/.codeium/windsurf/mcp_config.json` |

---

## VFP packet lifecycle

```
Draft → Under Review → Needs Rework → Accepted for Exploration → In Delivery → Behaviour Validated → Archived Learning
```

- `Behaviour Validated` is the retro trigger
- `Archived Learning` closes the packet lifecycle
- `methodology-proposed` is a learning status between `confirmed` and `methodology-updated` — set when a PR is opened, prevents duplicate proposals while the PR is in flight

---

## Learning-to-PR pipeline

1. Retro produces a learning entry → written to `learnings.md` as `watching`
2. Second independent packet confirms the same pattern → status → `confirmed`
3. Agent produces a Level 3 draft: target file, before/after diff, PR description
4. Human runs: `git checkout -b learning/[slug]` → applies diff → `gh pr create` → `gh pr merge`
5. Learning entry updated to `methodology-updated`
6. Any user with the agent installed can run `--update` to receive the change

---

## What not to do

- Do not duplicate the prompt body in tool-specific files
- Do not add npm runtime dependencies
- Do not update `methodology/` docs from a single observation — use `learnings.md` first
- Do not treat Notion docs as canonical — the repo is the source of truth for methodology
- Do not make the Notion publish step optional in the agent — it is required
