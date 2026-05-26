# Methodology Learnings Log

This file is the running record of operational insights extracted from VFP validation outcomes (§4.18). It sits between the individual packet record (stored in Notion) and a full methodology change (applied to the relevant `methodology/*.md` file).

Entries here represent patterns observed in practice — not theory. The methodology is updated when a pattern is confirmed across multiple packets, not when it appears for the first time.

---

## How to add a learning

1. Run a retrospective following [`retro-procedure.md`](./retro-procedure.md)
2. Identify an observation from §4.18 worth generalising beyond the packet
3. Check existing entries below for a matching pattern
   - If a match exists at `watching`: update its status to `confirmed` and add the new source packet
   - If no match: add a new entry with status `watching`
4. If any entry reaches `confirmed`: the agent produces a Level 3 draft (diff + PR description). Apply it via PR and update the entry to `methodology-proposed`.
5. When the PR is merged: update the entry to `methodology-updated`
6. Commit the file at each status change

---

## Entry format

```
### [SHORT SIGNAL TITLE]
- **Pattern type**: framing | slicing | validation | assumptions | process | evidence
- **Signal**: one-sentence description of the recurring observation
- **Source packets**: VFP title or reference, date
- **Status**: watching | confirmed | methodology-proposed | methodology-updated
- **Methodology change**: section(s) updated, PR link (if applicable)
- **Notes**: context, nuance, or related methodology sections
```

**Status key:**

| Status | Meaning |
|--------|---------|
| `watching` | First observation. No action yet — waiting for a second independent occurrence. |
| `confirmed` | Observed in 2+ independent packets. Produce a Level 3 draft and open a PR. |
| `methodology-proposed` | PR is open proposing the change. Awaiting review and merge. |
| `methodology-updated` | PR merged. The relevant methodology doc is updated. Learning is closed. |

---

## Learnings

*No entries yet. This log grows through operational use.*

*The first entry will be added after the first VFP reaches `Behaviour Validated` and goes through a retrospective.*
