---
name: vfp-retro-procedure
description: Retrospective procedure spec — DEFERRED to Phase 3+. Preserved as future spec. Do not invoke this skill in active sessions until the retro flow is reactivated.
---

> **DEFERRED — Phase 3+.** The retrospective flow is not active in the current phase. This file is the canonical spec and should remain intact for future activation. Do not use the content below to guide active agent sessions until explicitly reactivated.

# Retrospective Procedure

This document defines when and how to run a VFP retrospective: what triggers it, what outputs it produces at each level, how those outputs are stored, and how individual observations eventually become methodology changes.

---

## 1. Purpose

A VFP retrospective closes the learning loop. Without it, a packet moves to `Archived Learning` as a dead end. With it, the packet becomes a traceable record that can improve how future packets are written and how future delivery is framed.

The objective is not documentation for its own sake. The objective is a methodology that improves through operational evidence rather than theory.

---

## 2. When to raise a retro

### Primary trigger

A VFP moves to **`Behaviour Validated`** status. This is the expected and normal trigger. Every VFP that reaches this status should go through a retrospective before being archived.

### Secondary triggers

- A VFP is being **abandoned or superseded** before delivery completes. A partial or failed outcome is still worth recording — failed assumptions and missing framing are as useful as validated ones.
- **Mid-delivery** — significant unexpected behaviour is discovered that the packet didn't anticipate. Rather than waiting, capture the observation while it is fresh. The §4.18 section can be partially completed at any point.

### What does NOT trigger a retro

- Timer-based rhythms (sprint retros, weekly cadence). VFP retrospectives are per-packet, not per-calendar.
- Governance checkpoints or audit requirements.
- Routine delivery that matched expectations with no notable observations. In this case, §4.18 can be brief (1–2 lines) and no learning entry is required.

---

## 3. Three output levels

A retrospective produces outputs at three distinct levels. Not every retro reaches all three levels — that is by design.

---

### Level 1 — VFP Validation Outcome

**What:** Section 4.18 of the packet is filled with post-delivery observations.

**Where stored:** In the Notion VFP page itself.

**When:** At the start of every retrospective.

**What to record in §4.18:**

- Observed behaviour vs. expected behaviour (compare with §4.3 and §4.10)
- Assumption outcomes from §4.6: which were confirmed, which were wrong, which remain unresolved
- What the original framing missed or underestimated
- Unexpected complexity discovered during implementation
- What the implementation actually taught the team
- Whether the validation signals from §4.12 were achievable and useful

**Guideline:** Three to five honest observations is sufficient. The objective is preserving useful learning — not comprehensive documentation.

**After §4.18 is filled:** Update the VFP status from `Behaviour Validated` to **`Archived Learning`**. This closes the packet lifecycle.

---

### Level 2 — Learning Record

**What:** An extracted insight from §4.18 that is worth preserving beyond the specific packet context. Not tied to the packet — a general observation about framing, slicing, assumptions, or process.

**Where stored:** `methodology/learnings.md` in this repository.

**When:** After filling §4.18, if any observation is worth generalising. Not every retro produces a learning entry. Routine packets with no notable observations do not require one.

**When to extract a learning (ask yourself):**

- "Would this observation be useful when framing a similar request in future?"
- "Did the packet systematically miss something the framework should have caught?"
- "Did an assumption pattern appear here that I've seen before?"
- "Did the validation signal design fail in a way that other packets might repeat?"

If yes to any of the above: extract a learning entry.

**Learning entry format** (see `learnings.md` for the full log):

```
### [SHORT SIGNAL TITLE]
- **Pattern type**: framing | slicing | validation | assumptions | process | evidence
- **Signal**: one-sentence description of the recurring observation
- **Source packets**: list of VFP references or dates
- **Status**: watching | confirmed | methodology-updated
- **Notes**: context, nuance, or related sections
```

**Status progression:**

| Status | Meaning |
|--------|---------|
| `watching` | First time this pattern has been observed. Noted, no action yet. |
| `confirmed` | Pattern observed independently in 2 or more packets. A Level 3 draft should be produced and a PR opened. |
| `methodology-proposed` | A PR has been opened proposing the methodology change. Awaiting review and merge. |
| `methodology-updated` | The PR has been merged. The relevant methodology doc is updated. Learning is closed. |

When adding a new learning, always check whether an existing `watching` entry in `learnings.md` describes the same pattern. If yes: update its status to `confirmed` rather than adding a duplicate.

---

### Level 3 — Methodology Change

**What:** An update to one or more `methodology/*.md` files, and potentially `agents/vfp.md` if the pattern affects how VFPs are generated. The change is proposed via a PR — even for a single-author repo. The PR preserves the reasoning alongside the diff and creates a clean reversion path if a learning turns out to be wrong.

**Where stored:** Merged PR on `main`. GitHub preserves the PR description as permanent record of why the change was made. `--update` distributes the merged change to all installed users.

**When:** A learning entry reaches `confirmed` status (2+ independent packets showing the same pattern).

**Exception:** A single significant structural gap — something the framework systematically failed to surface, not just missed in one packet — may directly trigger a Level 3 change without waiting for confirmation. Document the reasoning in the learning entry.

**Which file to update by pattern type:**

| Pattern type | Primary file to update |
|---|---|
| Section quality, framing guidance | `vfp-guide.md` |
| Slicing failures, oversized slices | `capability-slicing.md` |
| Risk signals, uncertainty blind spots | `risk-uncertainty.md` |
| Evidence, validation signal design | `validation-evidence-patterns.md` |
| Process, flow, ceremonies | `core-methodology.md` |
| Agent failure modes, heuristics, detection | `agents/vfp.md` |

Multiple files may be updated for a single confirmed pattern.

**The agent produces a Level 3 draft** when a learning reaches `confirmed`. This draft contains:
- The specific change to make (before/after or diff format)
- A ready-to-use PR title and description with evidence summary

**To apply the change:**

1. Review the agent's draft — adjust if the proposed wording needs correction
2. `git checkout -b learning/[pattern-slug]`
3. Apply the change to the relevant file(s)
4. Update the learning entry in `learnings.md` from `confirmed` to `methodology-proposed`
5. `gh pr create --title '...' --body '...'` using the generated description
6. Review the diff as a fresh reader before merging
7. `gh pr merge`
8. Update the learning entry from `methodology-proposed` to `methodology-updated`, adding a reference to the section(s) changed

---

## 4. The retrospective session — step by step

This is the full sequence for running a retro manually. If you are using the VFP agent, see Section 5 for the guided flow.

**Duration:** 20–40 minutes for a typical packet. Lightweight packets may take less.

---

**Step 1 — Open the VFP**

Open the VFP in Notion (or the raw text if Notion is unavailable). Have the packet visible throughout.

---

**Step 2 — Fill §4.18**

Work through the §4.18 fields in order. For each, compare against the corresponding earlier section:

| §4.18 field | Compare with |
|---|---|
| Observed vs. expected behaviour | §4.3 (Expected User Behaviour) and §4.10 (Agreement Boundary) |
| Assumption outcomes | §4.6 (Assumptions) |
| What the framing missed | §4.7 (Ambiguities) and §4.9 (Risk Signals) |
| Validation signal quality | §4.12 (Validation Signals) |

Write 3–5 honest observations. Do not aim for completeness — aim for honesty.

---

**Step 3 — Update the VFP status**

Change the VFP status from `Behaviour Validated` to `Archived Learning`. The packet lifecycle is now closed.

---

**Step 4 — Decide whether to extract a learning**

Review what you wrote in §4.18. Ask: is there anything here that generalises beyond this packet?

If no: the retro is complete. No further action needed.

If yes: continue to Step 5.

---

**Step 5 — Extract learning entries**

For each observation worth preserving:

1. Open `methodology/learnings.md`
2. Check existing entries for a matching pattern
3. If a match exists with status `watching`: update it to `confirmed`
4. If a match exists with status `confirmed`: it should already have triggered a methodology change — flag this as a second data point if the change wasn't applied yet
5. If no match: add a new entry with status `watching`
6. Commit the update to `learnings.md`

---

**Step 6 — Apply methodology change via PR**

If any learning reached `confirmed` (either now or in a previous retro), the agent will have produced a Level 3 draft. If running the retro manually:

1. Identify the relevant methodology file(s) using the pattern-type table in Section 3
2. Draft the specific change — the exact text to add, modify, or replace
3. If the pattern affects agent generation quality: also update `agents/vfp.md` (failure modes, heuristic signals, section guidance)
4. Create a branch: `git checkout -b learning/[pattern-slug]`
5. Apply the change
6. Update the learning entry in `learnings.md` from `confirmed` to `methodology-proposed`
7. Open the PR: `gh pr create --title 'methodology: [brief description]' --body '...'`. Include in the body: what changed, why (the confirmed pattern), and which packets provided the evidence.
8. Review the diff — read it as a fresh reader, not as the author
9. `gh pr merge`
10. Update the learning entry from `methodology-proposed` to `methodology-updated`. Add a reference to the section(s) changed.
11. Anyone with the agent installed can now run `--update` to receive the change

---

## 5. Running the retro with agent support

The VFP agent supports a guided retrospective mode. Invoke it with:

- *"run a retro on this VFP"*
- *"help me fill the validation outcome"*
- *"this VFP has been delivered, let's capture learnings"*
- *"archive this packet"*

The agent will:

1. Ask for the VFP content (paste it, or provide the Notion page URL/ID if Notion MCP is available)
2. Walk through §4.18 with targeted questions for each field
3. Generate the §4.18 content for review
4. Offer to update the VFP in Notion and set the status to `Archived Learning`
5. Ask whether any insights from §4.18 are worth extracting as learning entries
6. If yes: generate formatted learning entries and check against existing `learnings.md` patterns
7. Flag if any new entry matches an existing `watching` pattern (potential `confirmed` upgrade)
8. If any learning reaches `confirmed`: produce a Level 3 draft — a specific diff against the relevant methodology file(s) and a ready-to-use PR title + description

The agent does not automatically update `methodology/*.md` files — that step requires human judgment and deliberate commit. The Level 3 draft is a proposal for the human to review, adjust, and apply via PR.

---

## 6. What does NOT cause a methodology change

The following should not be treated as methodology change triggers, even if they feel significant in the moment:

- A single packet where assumptions were wrong (assumptions being wrong is expected — the framework exists to make them visible, not eliminate them)
- A packet that was framed poorly due to rushing or incomplete input
- An outlier delivery context that is unlikely to recur
- Personal preference about section wording

Methodology changes should reflect confirmed patterns in how the framework performs across multiple delivery contexts — not reactions to individual outcomes.

---

## 7. Relationship to other methodology documents

| Document | Relationship |
|---|---|
| `core-methodology.md §9–11` | Defines the philosophy behind evidence collection, evaluation, and methodology improvement. This document is the operational procedure that implements it. |
| `vfp-guide.md §4.18` | Defines the §4.18 section fields and purpose. This document defines the process for filling it and acting on it. |
| `validation-evidence-patterns.md` | Reference for evidence types and collection approaches during delivery. Used when deciding what to record in §4.18. |
| `learnings.md` | The running log of extracted learnings. Maintained as part of the retro process defined here. |
| `example-library.md` | Grows with worked examples from completed packets. A retrospective that yields a strong example may also add an entry here. |

---

## 8. Scalability of learnings.md

`learnings.md` is a flat markdown file. This is intentional — it is simple, human-readable, and git-versioned with no tooling dependency.

At low-to-moderate usage (one team, a handful of VFPs per week), this will remain practical for years. The high bar for Level 2 entries means the file grows slowly by design.

**If it becomes unwieldy**, the natural split is by `pattern_type`, since every entry already carries that tag:

- `learnings-framing.md`
- `learnings-slicing.md`
- `learnings-validation.md`
- `learnings-assumptions.md`
- `learnings-process.md`
- `learnings-evidence.md`

At that point, the retro agent loads only the relevant category file rather than the full log.

A further step — if organisation-scale adoption makes even per-category files large — would be a lightweight index file listing entry titles, status, and dates, with full content in separate files. This preserves fast scanning without loading all content into context.

A vector database or semantic search layer is not warranted unless retrieval needs to be semantic rather than tag-based, and there is tooling infrastructure to support it. Neither condition is expected in the foreseeable operational context.

**Current action: none.** Track file size through normal use; split by category when loading the full file becomes a noticeable friction point.
