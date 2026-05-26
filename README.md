# vfp-agent

**Value Framing Packet (VFP) generator** — an AI agent that transforms raw delivery inputs (ideas, tickets, requests, initiatives) into structured 17-section framing artefacts that expose behavioural intent, surface uncertainty, and define the smallest meaningful validation slice.

Installs to **7 AI tools** via a single interactive installer. No npm runtime dependencies.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash
```

Or from a local clone:

```bash
git clone https://github.com/jgleal/vfp-agent
node vfp-agent/bin/install.js
```

Running without flags opens an **interactive selector**. Detected tools are shown first (✓). Pick by number, range, `all`, or press Enter to install to detected tools only.

```
vfp-agent installer

Available tools:

   1  ✓  opencode
   2  ✓  Claude Code
   3  ✓  Cursor
   4  ·  Gemini CLI        (not detected)
   5  ·  OpenAI Codex CLI  (not detected)
   6  ✓  VS Code (Copilot)
   7  ✓  Windsurf

Enter numbers (e.g. 1,3,5), ranges (1-3), "all",
or press Enter to install detected tools only.

>
```

---

## Supported tools

| Tool | Agent destination | Notes |
|------|-------------------|-------|
| **opencode** | `~/.config/opencode/agents/vfp.md` | Native agents support |
| **Claude Code** | `~/.claude/agents/vfp.md` | Native agents support |
| **Cursor** | `~/.cursor/agents/vfp.md` | Native agents support |
| **Gemini CLI** | `~/.gemini/agents/vfp.md` | Native agents support |
| **OpenAI Codex CLI** | `~/.codex/agents/vfp.md` | Native agents support |
| **VS Code (Copilot)** | `~/.copilot/agents/vfp.agent.md` | GitHub Copilot agents |
| **Windsurf** | `~/.codeium/windsurf/memories/global_rules.md` | Appended as a fenced block; no agents dir |

---

## Installer flags

```
--all                  Install to all detected tools without prompting
--only <id>            Install only to the specified tool (repeatable)
--list                 List all supported tool IDs and exit
--dry-run              Show what would happen without making changes
--force                Overwrite existing files
--uninstall, -u        Remove installed files
--non-interactive      Skip all prompts (CI/automation)
--no-color             Disable ANSI output
--help, -h             Show help
```

---

## Notion MCP setup

The VFP agent publishes artefacts to Notion. The installer checks whether the Notion MCP server is configured for each selected tool. If not, it prompts once for a Notion integration token and patches the relevant config file automatically.

**Get a token:** https://www.notion.so/my-integrations → create an integration → copy the token (`ntn_...`).

The token is written into the tool's MCP config (e.g. `opencode.json`, `~/.claude/settings.json`, `~/.cursor/mcp.json`). You only need to enter it once — it is reused across all tools installed in the same session.

### Notion MCP config locations

| Tool | Config file |
|------|-------------|
| opencode | `~/.config/opencode/opencode.json` |
| Claude Code | `~/.claude/settings.json` |
| Cursor | `~/.cursor/mcp.json` |
| VS Code | `~/Library/Application Support/Code/User/mcp.json` (macOS) |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

Gemini CLI and Codex CLI MCP config formats are not yet standardised — configure Notion MCP manually for those tools.

---

## How the agent works

Invoke with: *"generate a VFP"*, *"frame this request"*, *"create a value framing packet"*, or *"help me structure this delivery"*.

The agent:

1. Interprets the behavioural intent of the input (not just paraphrasing it)
2. Detects uncertainty signals before writing
3. Generates all **17 sections** in order
4. Offers to publish the result to Notion

### Publishing to Notion

When you confirm you want to publish, the agent:

1. Calls the Notion MCP to list accessible pages and presents them numbered
2. You pick a target page
3. The VFP is created as a new child page titled `VFP — [description] — [date]` with all 17 sections as structured blocks
4. The agent returns the page URL

### VFP status lifecycle

`Draft` → `Under Review` → `Needs Rework` → `Accepted for Exploration` → `In Delivery` → `Behaviour Validated` → `Archived Learning`

---

## Manual installation — ChatGPT (Custom GPT)

The VFP agent can be configured as a **Custom GPT** on ChatGPT. This is a manual web process, not covered by the CLI installer.

1. Go to [chat.openai.com](https://chat.openai.com) → **Explore GPTs** → **Create**
2. In **Instructions**, paste the contents of [`implementations/vfp-body.md`](implementations/opencode/vfp.md) (everything after the frontmatter)
3. Set a name and description
4. To enable Notion publishing, add a **Custom Action**:
   - Import the Notion OpenAPI spec from `https://developers.notion.com/page/openapi`
   - Set authentication to API Key (`Bearer <your-token>`)
   - Enable the `search`, `createPage`, and `appendBlockChildren` operations
5. Save and share

Note: Notion pages must be explicitly shared with your integration for the agent to access them.

---

## Methodology docs

The [`/methodology`](methodology/) directory contains the canonical reference documents this agent is built on:

- [`core-methodology.md`](methodology/core-methodology.md) — AI-Native Delivery & Value Framing core principles
- [`vfp-guide.md`](methodology/vfp-guide.md) — full 17-section VFP template reference
- [`capability-slicing.md`](methodology/capability-slicing.md) — behavioural slicing patterns
- [`risk-uncertainty.md`](methodology/risk-uncertainty.md) — uncertainty classification and risk signal detection

---

## Uninstall

```bash
node bin/install.js --uninstall
```

Or for a specific tool:

```bash
node bin/install.js --only opencode --uninstall
```

---

## License

MIT
