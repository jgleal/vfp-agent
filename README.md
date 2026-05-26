# vfp-agent

Value Framing Packet (VFP) generator — an installable AI agent for opencode, Claude Code, Gemini CLI, Cursor, and Windsurf.

---

## What is a VFP?

A Value Framing Packet is a 17-section structured artefact that transforms a raw delivery input (idea, ticket, transcript, initiative) into a behaviourally-grounded frame that:

- Makes uncertainty **visible, bounded, and usable** — rather than eliminating it
- Separates **confirmed facts** from **assumptions** from **ambiguities**
- Produces **capability slices** oriented around observable behaviour, not implementation layers
- Defines a **proposed agreement boundary** — the smallest thing stakeholders currently believe they're agreeing to
- Identifies **validation signals** and **evidence expectations** before work begins

A VFP is not a requirements document. It is not a specification. It is a behavioural framing artefact that improves delivery intelligence.

### Status lifecycle

`Draft` → `Under Review` → `Needs Rework` → `Accepted for Exploration` → `In Delivery` → `Behaviour Validated` → `Archived Learning`

### Methodology

Full methodology documentation lives in [`methodology/`](./methodology/):

- [`core-methodology.md`](./methodology/core-methodology.md) — foundational principles of AI-Native delivery and value framing
- [`vfp-guide.md`](./methodology/vfp-guide.md) — complete guide to generating VFPs
- [`capability-slicing.md`](./methodology/capability-slicing.md) — how to slice capabilities for behavioural learning
- [`risk-uncertainty.md`](./methodology/risk-uncertainty.md) — uncertainty classification and risk signal patterns

---

## Install

### One-line (curl)

```bash
curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash
```

Auto-detects installed tools and installs to all of them.

### With options

```bash
# Install to opencode only
curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash -s -- --only opencode

# Pre-configure your Notion parent page ID
curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash -s -- --notion-page-id YOUR_PAGE_ID

# Preview without making changes
curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash -s -- --dry-run
```

### Local clone

```bash
git clone https://github.com/jgleal/vfp-agent
cd vfp-agent
node bin/install.js
```

### Via npx

```bash
npx -y github:jgleal/vfp-agent
```

---

## Supported tools

| Tool | Install location |
|------|-----------------|
| opencode | `~/.config/opencode/agents/vfp.md` |
| Claude Code | `~/.claude/agents/vfp.md` |
| Gemini CLI | `~/.gemini/GEMINI.md` (appended) |
| Cursor | `~/.cursor/rules/vfp.mdc` |
| Windsurf | `~/.codeium/windsurf/memories/global_rules.md` (appended) |

---

## Usage

After installing, invoke the agent with phrases like:

- "generate a VFP for this ticket"
- "frame this request as a VFP"
- "create a value framing packet for [idea]"
- "help me structure this delivery"

The agent will interpret the behavioural intent, detect uncertainty signals, and generate all 17 sections. After generation, it offers to publish the packet to Notion.

### Notion integration

To enable Notion publishing, provide your Notion parent page ID during install:

```bash
node bin/install.js --notion-page-id YOUR_PAGE_ID
```

Or replace the `NOTION_PARENT_PAGE_ID` placeholder in the installed file manually.

Your Notion integration must have access to the target page. To connect: open the page in Notion → Share → invite your integration.

---

## CLI flags

```
--all                  Install to all detected tools
--only <id>            Install only to the specified tool (repeatable)
--list                 List all supported tools and exit
--dry-run              Preview changes without writing anything
--force                Overwrite existing files and blocks
--uninstall, -u        Remove installed files
--notion-page-id <id>  Pre-configure the Notion parent page ID
--non-interactive      Disable prompts (for CI/pipelines)
--no-color             Disable ANSI colors
--help, -h             Show help
```

---

## Uninstall

```bash
node bin/install.js --uninstall
# or
curl -fsSL https://raw.githubusercontent.com/jgleal/vfp-agent/main/install.sh | bash -s -- --uninstall
```

---

## Requirements

- Node.js ≥ 18

---

## License

MIT
