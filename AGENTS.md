# AGENTS.md — Context for AI agents working on this project

This file provides the context an AI agent needs to work effectively on `vfp-agent` across sessions. Read it before making any changes.

---

## What this project is

`vfp-agent` is an installable AI agent that generates Value Framing Packets (VFPs), publishes them to Notion, and breaks them down into developer-ready GitHub sub-issues. It installs to the most common AI coding tools via a single interactive Node.js installer. No npm runtime dependencies. Requires Node.js ≥ 24.

GitHub: `https://github.com/jgleal/vfp-agent`

---

## Design — why this agent exists and how it thinks

### The core problem

Delivery teams consistently underestimate requests not because they lack information, but because they frame them in implementation terms before understanding the behaviour they are trying to change. A ticket that says "add booking system" conceals who does what, what changes in their world, what uncertainty exists, and what the smallest meaningful thing to validate would be.

The VFP agent exists to intervene at the framing stage — before work starts — and make that hidden complexity visible, bounded, and usable.

### What a VFP is

A Value Framing Packet is a structured 17-section artefact. It is not a spec. It is not a requirements document. It is a framing instrument that:

- Interprets the **behavioural intent** behind a request (not its implementation)
- Surfaces **assumptions** as visible, challengeable items — not failures to be resolved before starting
- Identifies **ambiguity** without letting it block progression
- Defines the **smallest meaningful validation slice** that will generate useful learning
- Makes **uncertainty usable** rather than trying to eliminate it

The objective is never to eliminate uncertainty before progression. The objective is to make uncertainty visible, bounded, and usable.

### What the agent is — and is not

The agent is a **behavioural framing specialist**. It is not a requirements analyst, not a technical architect, not a project manager.

This distinction matters when working on the agent. Changes that push it toward spec-writing, implementation planning, or completeness-over-clarity violate the design. A VFP that reads like a PRD has failed.

### The 17-section structure

Each section has a specific purpose. The most important is **§4.10 Proposed Agreement Boundary** — it defines what people currently believe they are agreeing to. It is a continuity-of-intent reference, not a full specification.

**§4.11 Suggested Capability Slices** is critical in the current phase — each slice becomes a developer-ready GitHub sub-issue. Slices must be independently workable, carry a clear done state, and include enough scope context to prevent clarification loops before work begins.

§4.18 (Validation Outcome) is filled during the retrospective (Phase 3+), not at generation time. It is published as a placeholder heading in Notion at generation time.

### The active flow (current phase)

```
Input (GitHub issue or other)
  ↓
Generate VFP — agent interprets behavioural intent, generates all 17 sections
  ↓
Publish to Notion — required step, packet is incomplete until published
  ↓
Comment on source GitHub issue — automatic if input came from a GH issue
  ↓
Human reviews and corrects VFP in Notion
  ↓
Human signals VFP is ready (shares GH issue or Notion URL)
  ↓
Agent fetches corrected VFP from Notion
  ↓
Generate GitHub sub-issues — one per §4.11 slice, self-contained, linked to parent
  ↓
Developers work from sub-issues
```

### The retrospective and why it closes the loop *(Phase 3+ — deferred)*

> **Deferred.** The retro flow is not active in the current phase. The design below is preserved as the spec for Phase 3+. Do not implement or invoke the retro flow until explicitly reactivated.

The retro is not a performance review. It is the moment where a delivered packet is examined for what the framing got right, what it missed, and what the team now understands that they did not before. This learning is the fuel for improving the methodology.

The retro produces three levels of output:

| Level | What | When |
|---|---|---|
| 1 | §4.18 Validation Outcome written to Notion, status → `Archived Learning` | Every retro |
| 2 | Learning entry added to `methodology/learnings.md` as `watching` | When a generalisable pattern is observed |
| 3 | Methodology doc updated via PR, entry → `methodology-updated` | When a pattern is `confirmed` across 2+ independent packets |

Level 3 is intentionally gated. Single-event observations never change the methodology. The agent proposes the change and produces the PR artifact — the human reviews, adjusts if needed, and merges. This preserves the reasoning alongside the diff.

### The learning loop *(Phase 3+ — deferred)*

```
Retro → learnings.md (watching) → second packet confirms → learnings.md (confirmed)
→ agent produces Level 3 draft (diff + PR description) → human opens PR → merges
→ learnings.md (methodology-updated) → --update distributes to all users
```

This loop is the mechanism by which real-world delivery experience improves the methodology. It must remain intact when reactivated. Do not short-circuit it by updating methodology docs directly from a single observation.

### Why Notion publish is required

Publishing to Notion is not a convenience feature. It is the step that makes a packet accessible to the team and anchors it in the delivery record. A packet that exists only in a chat session has no continuity. If the Python3 publish script fails (e.g. `NOTION_TOKEN` not set, network error), the packet must stay in explicit Draft/incomplete state with a clear resume path — not silently skipped.

---

## Repo structure

```
agents/vfp.md              # Single source of truth for the agent prompt (opencode format)
bin/install.js             # Interactive TUI installer — the core of this project
install.sh                 # Curl-pipeable bash shim → delegates to bin/install.js via npx
package.json               # Package config; bin entry point is bin/install.js
tools/                     # Standalone tool scripts — installed at runtime, not shipped with agent
  notion-find-parent.py    # Finds Notion parent page; fast-path PARENT_PAGE_ID, cascade search fallback
  notion-publish.py        # Publishes VFP to Notion; --parent-id, --title via argv; markdown via stdin
  notion-find-parent.ts    # OpenCode Custom Tool wrapper for notion-find-parent.py
  notion-publish.ts        # OpenCode Custom Tool wrapper for notion-publish.py
methodology/               # Canonical methodology documentation (9 files)
  core-methodology.md      # §2 Core Delivery Assumptions, §3 Primary Reasoning Priorities
  vfp-guide.md             # Full VFP guide including §4.18 Validation Outcome
  capability-slicing.md    # Slicing principles and patterns
  risk-uncertainty.md      # Risk classification and uncertainty handling
  pilot-operational-model.md
  validation-evidence-patterns.md
  example-library.md       # Currently empty — needs real VFP examples to be useful; mechanism for adding them not yet defined
  retro-procedure.md       # Phase 3+ spec — 3-level retro output model, PR flow as canonical Level 3 path
  learnings.md             # Phase 3+ spec — running log of observed patterns (watching → confirmed → methodology-proposed → methodology-updated)
docs/
  notion-publish.md        # Notion Markdown API spec: endpoints, auth, format, script, error table
README.md                  # User-facing docs with Mermaid flow diagram
AGENTS.md                  # This file
```

---

## Key technical decisions

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

**Codebase access — tests and docs only**
When running in a directory with a repo, the agent uses the codebase as context by default — no explicit user permission required. Read order: E2E/acceptance/BDD tests → integration/unit tests → README and user-facing docs. Never reads source implementation files, schemas, configs, or infrastructure. All findings are translated to behavioural observations before entering any VFP section — class names, function signatures, file paths, and architectural patterns never appear in the output. If no relevant test or doc files exist, the agent proceeds from the input alone.


`methodology/` docs are only updated at Level 3: confirmed pattern across 2+ independent packets, via PR. Single-event observations go to `learnings.md` as `watching`. The agent proposes changes but does not apply them — human reviews and merges via `gh pr create`.

**`methodology/learnings.md` is not runtime context**
It is source material for doc evolution. The agent writes to it directly using file tools. It is not injected into agent sessions.

**Notion publish — Python3 direct API (three-option resolution)**

The agent publishes to Notion via two REST API calls:
1. `POST /v1/pages` with `Notion-Version: 2022-06-28` — creates the page
2. `PATCH /v1/pages/:id/markdown` with `Notion-Version: 2026-03-11` and `{"replace_content": "..."}` — writes content with real `heading_3` blocks from `###`

The agent resolves which mechanism to use in priority order:
- **Option A — OpenCode Custom Tool** (`notion_publish` / `notion_find_parent`): used when running inside OpenCode; `.ts` wrappers installed to `~/.config/opencode/tools/`
- **Option B — installed script**: `python3 ~/.config/vfp-agent/tools/notion-publish.py` — available after `npx install` on local machines
- **Option C — inline script**: embedded Python3 in `agents/vfp.md`; used in CI and any environment without the installed scripts

This design is documented in `docs/notion-publish.md`. Remote MCP (`https://mcp.notion.com/mcp`) is configured for interactive sessions for general workspace browsing — it is **not** a publish path.

**Tools architecture**

`tools/` contains standalone Python3 scripts. Each script is self-contained: all inputs via argv/env/stdin, no external state. Scripts are installed at runtime by `bin/install.js`:
- `.py` → `~/.config/vfp-agent/tools/` for all providers
- `.ts` → `~/.config/opencode/tools/` for OpenCode only (Custom Tool wrappers)

CI environments do not use installed scripts — the agent falls back to the inline Option C script embedded in `agents/vfp.md`.

`NOTION_TOKEN` must be available in the bash environment (`os.environ.get('NOTION_TOKEN')`). If it is not set, the script exits with an explicit error before making any API call.

The installer configures:
- **Local tools** (opencode, cursor, vscode, windsurf): remote MCP URL (`https://mcp.notion.com/mcp`) for general Notion access in the tool; token prompted at install time and written to shell profile so Python3 finds it
- **claude**: `mcp-remote` bridge for general Notion access; token to shell profile
- **CI** (`PROJECT_OPENCODE_CONFIG`): minimal config (no MCP server); `NOTION_TOKEN` passed as a job env var from a repository secret

Remote MCP (`https://mcp.notion.com/mcp`) is configured for interactive sessions to enable general workspace interaction (search, browse, edit). It is not used for VFP publishing — it requires OAuth and cannot be used headlessly.

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

Tool scripts are installed to:

| Script type | Destination | Providers |
|---|---|---|
| `.py` scripts | `~/.config/vfp-agent/tools/` | all |
| `.ts` wrappers | `~/.config/opencode/tools/` | opencode only |

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

- `Behaviour Validated` → `Archived Learning` via retrospective is **deferred to Phase 3+**
- `Archived Learning` closes the packet lifecycle
- `methodology-proposed` is a learning status between `confirmed` and `methodology-updated` — set when a PR is opened, prevents duplicate proposals while the PR is in flight

---

## What not to do

- Do not duplicate the prompt body in tool-specific files
- Do not add npm runtime dependencies
- Do not update `methodology/` docs from a single observation — use `learnings.md` first
- Do not treat Notion docs as canonical — the repo is the source of truth for methodology
- Do not make the Notion publish step optional in the agent — it is required
- Do not push the agent toward spec-writing, implementation planning, or completeness-over-clarity — that violates the behavioural framing design

---

## Runtime dependencies

These are not installer dependencies — the installer uses Node.js stdlib only. These are dependencies of the agent's workflow at runtime.

**GitHub CLI (`gh`)**
Required to fetch issues as VFP input and to create and link sub-issues. For public repositories, webfetch is a viable fallback for fetching input, but `gh` is required for sub-issue creation in all cases.

```bash
gh issue view <number> --repo <owner/repo>              # fetch issue as VFP input
gh issue view <number> --repo <owner/repo> --comments   # extract Notion URL from VFP comment
gh issue create --repo <owner/repo> --title "..." --body "..."   # create sub-issue
gh api repos/<owner>/<repo>/issues/<parent>/sub_issues \
  --method POST -f sub_issue_id=<child>                 # link sub-issue to parent
```

**Python3**
Required for the Notion publish step. Used to run the embedded script in `agents/vfp.md` (PUBLISHING section) which calls `POST /v1/pages` and `PATCH /v1/pages/:id/markdown`.

**Notion Markdown API**
`PATCH https://api.notion.com/v1/pages/:page_id/markdown` with `Notion-Version: 2026-03-11`. Requires `$NOTION_TOKEN` in the bash environment. The `replace_content` command replaces the entire page body with enhanced markdown. `###` produces real `heading_3` blocks. The installer writes `NOTION_TOKEN` to the shell profile so Python3 finds it at runtime. See `docs/notion-publish.md` for the full API reference.
