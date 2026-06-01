# Notion Publish — Reference

The VFP agent publishes to Notion via Python3 urllib using the Notion REST API directly. No MCP server, no npm packages, no third-party libraries. This document is the authoritative reference for that implementation.

---

## Authentication

All API calls require a bearer token in the `Authorization` header.

```
Authorization: Bearer <NOTION_TOKEN>
```

**Getting a token**

1. Go to https://www.notion.so/developers/tokens
2. Click "New personal access token" (top right)
3. Give it a name (e.g. "VFP agent")
4. Enable the "Notion API" capability
5. Copy the token (starts with `ntn_`)

A Personal Access Token acts as you — it can access any page visible in your workspace without requiring per-page Share → Invite steps. This is the recommended token type.

**Local use**: the installer writes `NOTION_TOKEN` to your shell profile (`.zshrc`, `.bashrc`, etc.) so Python3 picks it up at runtime.

**CI use**: store as a repository secret named `NOTION_TOKEN` and pass it to the job via `env: NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}`.

---

## Endpoints

### Create a page

```
POST https://api.notion.com/v1/pages
Notion-Version: 2022-06-28
Content-Type: application/json
Authorization: Bearer <token>
```

Body:
```json
{
  "parent": { "page_id": "<parent_page_id>" },
  "properties": {
    "title": { "title": [{ "text": { "content": "VFP — <brief title>" } }] }
  }
}
```

Returns a page object. Use `id` (the page ID) and `url` (the public URL).

---

### Write content via Markdown API

```
PATCH https://api.notion.com/v1/pages/<page_id>/markdown
Notion-Version: 2026-03-11
Content-Type: application/json
Authorization: Bearer <token>
```

Body:
```json
{
  "type": "replace_content",
  "replace_content": { "new_str": "<full VFP markdown>" }
}
```

`replace_content.new_str` replaces the entire page body. `###` headings produce real `heading_3` blocks in Notion. Plain paragraphs are `paragraph` blocks. Bullet lines (`- item`) produce `bulleted_list_item` blocks.

**Note**: the Markdown API requires `Notion-Version: 2026-03-11` — a different version from the create endpoint.

---

### Find parent page

If `PARENT_PAGE_ID` is set in the environment, it is used directly — no search call is made. This is the recommended setup for teams with a fixed VFPs page.

If not set, the agent searches:

```
POST https://api.notion.com/v1/search
Notion-Version: 2022-06-28
Content-Type: application/json
Authorization: Bearer <token>
```

Body:
```json
{
  "query": "VFPs",
  "filter": { "property": "object", "value": "page" }
}
```

Cascade: try `"VFPs"` → `"VFP"` → `"Value Framing"` until results are returned. Take `results[0].id` as the parent page ID.

---

## VFP Markdown Format

```
Status: Draft
Date: 2026-01-15
Source: [GitHub Issue #12 — owner/repo](https://github.com/owner/repo/issues/12)

### §4.1 Request Summary

Prose content here. Plain paragraph, no bullets.

### §4.2 Intended Outcome

Prose content here.

### §4.3 Expected User Behaviour

- The user does X
- The user does Y

### §4.4 Current Behaviour

Prose describing the current state.

### §4.5 Constraints

- Constraint one
- Constraint two

### §4.6 Assumptions

- Assumption one
- Assumption two

### §4.7 Open Questions

- Question one
- Question two

### §4.8 Dependencies

- Dependency one

### §4.9 Risk Signals

- **Semantic Underestimation**: description
- **Behavioural Ambiguity**: description
- **Scope Expansion Risk**: description

### §4.10 Proposed Agreement Boundary

Prose describing what people currently believe they are agreeing to.

### §4.11 Suggested Capability Slices

- Slice 1 — done state, scope note
- Slice 2 — done state, scope note

### §4.12 Validation Approach

- Approach one
- Approach two

### §4.13 Success Signals

- Signal one
- Signal two

### §4.14 Effort Signals

Prose — not a point estimate. Observable signals of complexity.

### §4.15 Delivery Posture

Prose — recommended stance given the uncertainty profile.

### §4.16 Stakeholder Touchpoints

- Touchpoint one

### §4.17 Recommended Next Step

Prose — single most important thing to do next.

### §4.18 Validation Outcome

*To be completed at retrospective.*
```

**Rules**:
- Metadata block (`Status:`, `Date:`, `Source:`) at the very top, before any `###` heading
- Omit the `Source:` line if not triggered from a GitHub issue
- Exactly one blank line between sections
- Prose sections (§4.1, §4.2, §4.4, §4.10, §4.14, §4.15, §4.17): no bullets, plain text
- List sections (§4.3, §4.5–§4.9, §4.11–§4.13, §4.16): `- item` per line
- §4.18 always ends with the placeholder sentence above

---

## Complete Python3 Script

The canonical script used by the VFP agent. Copy verbatim — fill `PARENT_PAGE_ID`, `TITLE`, `MARKDOWN`.

```python
import urllib.request, json, os, sys

TOKEN = os.environ.get('NOTION_TOKEN', '')
if not TOKEN:
    sys.exit('ERROR: NOTION_TOKEN is not set')

def notion(method, path, body=None, ver='2022-06-28'):
    h = {
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': 'application/json',
        'Notion-Version': ver,
    }
    req = urllib.request.Request(
        f'https://api.notion.com/v1/{path}',
        data=json.dumps(body).encode() if body else None,
        headers=h, method=method,
    )
    return json.loads(urllib.request.urlopen(req).read())

PARENT_PAGE_ID = '<id>'
TITLE = 'VFP — <brief title>'
MARKDOWN = """..."""

page = notion('POST', 'pages', {
    'parent': {'page_id': PARENT_PAGE_ID},
    'properties': {'title': {'title': [{'text': {'content': TITLE}}]}},
})
page_id = page['id']
page_url = page['url']

notion('PATCH', f'pages/{page_id}/markdown',
    {'replace_content': MARKDOWN},
    ver='2026-03-11',
)

print(page_url)
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `NOTION_TOKEN is not set` | Env var missing | Export `NOTION_TOKEN` or check CI secret |
| HTTP 401 | Token invalid or revoked | Regenerate token at notion.so/developers/tokens |
| HTTP 403 | Page not shared with token user | Personal Access Tokens don't need Share steps — verify token type |
| HTTP 404 on markdown PATCH | Wrong `Notion-Version` header | Must use `2026-03-11` for the markdown endpoint |
| HTTP 429 | Rate limited | Wait and retry — daily quota per API key |
| `no VFPs/VFP/Value Framing page found` | Search returned no results | Create a page named "VFPs" in your workspace |

---

## Evolution

To modify the publish behaviour, edit `agents/vfp.md` (the PUBLISHING section) and keep this document in sync. The script in this doc is the canonical reference — if they diverge, `agents/vfp.md` takes precedence (it is the single source of truth for the agent).

Changes to the Notion API version or endpoint structure should be verified against https://developers.notion.com/reference before updating.
