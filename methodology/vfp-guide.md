# Value Framing Packet Guide
## Operational Interpretation, Behavioural Framing & Packet Evolution

---

## 1. Purpose

The Value Framing Packet is the central behavioural framing artefact within the AI-Native Delivery methodology.

It exists to:

- reduce ambiguity
- preserve continuity of intent
- align behavioural expectations
- expose hidden assumptions
- support capability slicing
- identify delivery risks
- support validation thinking
- enable future orchestration workflows

The packet is intentionally designed to support both human alignment and AI-assisted delivery reasoning.

**The packet is not intended to eliminate all uncertainty before progression.**

The objective is to improve behavioural understanding and delivery alignment while supporting empirical continuation.

---

## 2. What The Packet Is NOT

The Value Framing Packet is NOT:

- a traditional requirements document
- a full discovery specification
- a governance-heavy approval process
- a technical implementation plan
- a deterministic delivery specification
- a complete architectural definition

Its purpose is to **make uncertainty visible while enabling useful progress.**

---

## 3. Core Operational Philosophy

The packet should:
- help teams understand behavioural intent
- improve delivery conversations
- expose ambiguity safely
- identify hidden scope
- preserve behavioural continuity
- support empirical iteration
- improve validation thinking

The packet should avoid:
- excessive implementation detail
- rigid process language
- governance-heavy behaviour
- fake certainty
- premature technical decomposition
- implementation-first thinking
- consultant-style overanalysis

---

## 4. Packet Lifecycle & Status

A packet may exist in states:

- **Draft** — generated, not yet reviewed
- **Under Review** — being evaluated by stakeholders
- **Needs Rework** — incomplete or behaviourally incorrect
- **Accepted for Exploration** — understanding sufficiently bounded to continue
- **In Delivery** — active implementation
- **Behaviour Validated** — evidence confirms intended behaviour
- **Archived Learning** — completed, preserved for reflective learning

The objective is not to eliminate all ambiguity before progression. The objective is to determine whether understanding is **sufficiently bounded to continue empirically.**

---

## 5. The 17 Sections

---

### 4.1 Request Summary

**Purpose:** Provide a concise interpretation of the request. Interpret behavioural intent — do NOT simply paraphrase.

**Good:** "Customers currently book meeting rooms through reception staff. The request aims to allow customers to view room availability and perform self-service bookings."

**Bad:** "Implement meeting room booking system with backend APIs and frontend flows." ← prematurely shifts to implementation

---

### 4.2 Intended Outcome

**Purpose:** Clarify what stakeholders appear to be trying to achieve. Focus on intent, goals, behavioural improvement, operational usefulness — not implementation completion.

**Good:** "Customers should feel confident they can reliably reserve meeting rooms without depending on reception staff."

**Failure modes:** implementation-oriented outcomes, vague business language, generic productivity statements, output-focused descriptions.

---

### 4.3 Expected User Behaviour

**Purpose:** Define what users should be able to do, what behaviour should become possible, what interaction should improve. Keep it observable and externally meaningful.

**Good:** "Students can ask chapter-level questions and receive guidance connecting concepts across multiple paragraphs."

**Bad:** "Add chapter support feature." ← describes implementation scope, not behaviour

---

### 4.4 Expected Value

**Purpose:** Clarify why the behaviour matters. Value may exist for users, stakeholders, operations, support teams, delivery workflows, or organisational learning.

Value ≠ implementation completion. Value = behavioural usefulness, confidence generation, operational improvement, learning.

---

### 4.5 Known Facts

**Purpose:** Separate confirmed information from interpretation or inference.

Only explicitly confirmed information should appear here. Do not infer facts from assumptions or behavioural interpretation.

---

### 4.6 Assumptions

**Purpose:** Surface inferred behaviour or likely expectations not yet confirmed.

**Assumptions are not failures. They are visible uncertainty.** The objective is assumption visibility, not assumption elimination.

Assumptions should remain explicit, visible, challengeable, and traceable.

---

### 4.7 Ambiguities & Undefined Areas

**Purpose:** Identify unclear behaviour, missing decisions, contradictory expectations, undefined workflows, or unresolved operational context.

**Ambiguity should not automatically block progression.** Preserve visibility, isolate uncertainty, continue where sufficiently bounded, and avoid fake certainty.

---

### 4.8 Scope Boundaries

**Purpose:** Clarify what appears included, what appears excluded, what remains deferred, and what should intentionally remain outside the current behavioural boundary.

Deferred areas should remain visible, intentional, traceable, and behaviourally understandable.

---

### 4.9 Risk & Uncertainty Signals

**Purpose:** Expose delivery intelligence signals. Delivery awareness — not governance escalation.

Classify signals using the patterns from [`risk-uncertainty.md`](./risk-uncertainty.md):
- Semantic Underestimation
- Behavioural Ambiguity
- Validation Uncertainty
- Scope Expansion Risk
- Oversized Capability
- Dependency Complexity
- Operational Uncertainty
- Exploratory Behaviour

---

### 4.10 Proposed Agreement Boundary

**This is the most important section.**

Defines:
- current behaviour
- intended behaviour
- behavioural scope boundaries
- accepted assumptions
- deferred uncertainty
- the smallest meaningful behavioural agreement

This section acts as a continuity-of-intent reference, an alignment layer, a behavioural understanding checkpoint, and a future comparison baseline.

**It defines what people currently believe they are agreeing to** — not a full specification.

**Good:** "A customer can view room availability and reserve a meeting room without depending on reception staff. Premium-only room restrictions remain excluded from the first behavioural validation slice."

---

### 4.11 Suggested Capability Slices

**Purpose:** Generate independently valuable, demonstrable, behaviour-oriented increments.

Each slice should answer: *"What meaningful behaviour, capability, understanding, or validation opportunity becomes possible after this increment exists?"*

Slices should optimise for **behavioural learning and validation**, not implementation convenience.

**Good:** "Customers can view room availability for the current day."
**Weak:** "Create booking API layer." ← implementation-centric, not observable

Exploratory slices are legitimate. Label them explicitly if their purpose is learning rather than production capability.

See [`capability-slicing.md`](./capability-slicing.md) for full slicing principles.

---

### 4.12 Validation Signals

**Purpose:** Define how expected behaviour could be observed. What would tell stakeholders the behaviour is working?

Focus on observable behaviour and usefulness — not implementation completion or passing technical checks.

---

### 4.13 Evidence Expectations

**Purpose:** Define what evidence should exist after validation or implementation.

Possible evidence: screenshots, recordings, traces, demonstrations, analytics, stakeholder validation, user observation, prototype flows, workflow completion, operational behaviour.

Evidence validates behaviour and usefulness — not only technical correctness.

---

### 4.14 Prototype or Mock Validation

**Purpose:** Identify situations where a prototype, simulation, lightweight flow, mockup, or behavioural validation experiment may reduce ambiguity earlier than full implementation.

Not every uncertainty requires full implementation. Sometimes lightweight behavioural validation is sufficient.

---

### 4.15 Delivery Handoff Notes

**Purpose:** Highlight important behavioural considerations, delivery constraints, operational implications, orchestration considerations, or implementation-sensitive areas for Engineering, Delivery, QA, Architecture, and Product.

Preserves continuity of understanding downstream.

---

### 4.16 Questions for Stakeholders

**Purpose:** Generate 2–5 useful clarification questions that reduce ambiguity, expose hidden assumptions, improve validation clarity, or strengthen behavioural understanding.

Questions should remain lightweight, useful, and behaviourally relevant — not process overhead.

---

### 4.17 Recommended Next Step

**Purpose:** Suggest how empirical progress could continue. What is the single best next action?

Ambiguity should not stop progression. The framework supports **bounded empirical continuation.**

**Good:** "Prototype one behavioural slice focused on room availability visibility before implementing booking flows."

---

### 4.18 Validation Outcome *(post-delivery)*

**Purpose:** Record what was actually observed after the slice or capability was implemented and validated. This section is completed after delivery — not during packet generation.

**What to record:**

- Observed behaviour vs. expected behaviour (compare with 4.3 and 4.10)
- Assumption outcomes: which assumptions from 4.6 were confirmed, denied, or remain unresolved
- What was missed or not captured in the original framing
- What unexpected complexity was discovered
- What the implementation actually taught the team
- Whether the validation signals from 4.12 were achievable and useful

**Why this matters:** The packet lifecycle ends at "Archived Learning." This section is the mechanism that makes that status meaningful. Without a validation outcome, "archived" is a dead end. With it, the packet becomes a traceable learning record and a future reference.

**This section is intentionally lightweight.** Three to five honest observations is sufficient. The objective is preserving useful learning — not comprehensive documentation.

---

## 6. Common Failure Modes

| Failure Mode | What It Looks Like | Why It's Harmful |
|---|---|---|
| Over-Technical Framing | Architecture-centric, implementation-heavy, decomposition-first | Weakens behavioural clarity |
| Fake Certainty | Inferred assumptions presented as confirmed truth | Creates hidden risk and false alignment |
| Excessive Verbosity | Long sections that don't improve alignment | Adds process overhead without value |
| Oversized Slices | Roadmap items, large features, multi-workflow initiatives | Weakens empirical validation |
| Validation-Late Thinking | Validation appears only after implementation | Weakens learning and feedback loops |
| Premature Technical Decomposition | Backend/frontend/API reasoning before behaviour is understood | Weakens behavioural reasoning quality |
