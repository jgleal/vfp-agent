# Core Methodology
## AI-Native Delivery & Value Framing — Phase 2

> The goal is not perfect specification management.
> The goal is lightweight re-evaluation while preserving continuity of understanding.

---

## TL;DR

This framework explores a semi-orchestrated AI-native delivery model focused on improving behavioural framing, ambiguity handling, capability slicing, validation thinking, and continuity of intent.

Instead of transforming requests directly into implementation tasks, the framework introduces a **Value Framing Layer** that structures delivery intent before implementation begins.

The goal is not autonomous software delivery.

The goal is to improve how delivery work is understood, validated, sliced, and evolved — while preserving visible uncertainty and empirical progression.

---

## 1. Purpose

The goal of Phase 2 is to move from a manual GPT-based experiment into a semi-orchestrated model where requests can be transformed into structured, behaviour-oriented delivery artefacts.

This phase is not focused on full automation, autonomous agents, or implementation. It defines how the system should behave, what artefacts it should generate, how knowledge should be organised, and how the framework should evolve through usage.

---

## 2. Core Idea

The system acts as an upstream intent-definition and value-framing layer.

A user provides an initial request, idea, feature, initiative, transcript, ticket, or delivery problem.

The system then helps transform that input into a structured **Value Framing Packet** that clarifies:

- what behaviour is expected
- what value is intended
- what is known
- what is assumed
- what remains ambiguous
- what risks exist
- what capability slices could move the work forward
- how the result could be validated
- what evidence should exist later

The purpose is not to fully eliminate uncertainty before work begins.

**The purpose is to make uncertainty visible, bounded, and usable for empirical delivery.**

---

## 3. Continuity of Intent

The framework is designed to preserve continuity between:

- the original request
- the interpreted behaviour
- the agreed delivery scope
- the implementation
- the evidence generated afterward

The goal is to reduce the loss of intent that often occurs when work moves between refinement, implementation, validation, and delivery conversations.

---

## 4. Functional Flow

```
Input (idea, ticket, transcript, request)
  ↓
Value Framing Layer
  ↓
Human Validation
  ↓
Capability Slicing
  ↓
Delivery Artefact Generation
  ↓
Implementation / Exploration
  ↓
Evidence Collection
  ↓
Evaluation
  ↓
Methodology Improvement
```

Human validation confirms:
- behavioural alignment
- intended value
- acceptable assumptions
- bounded scope
- whether proposed slices are useful enough to continue empirically

---

## 5. Input Layer

The input can come from different sources:

- a raw idea
- a user request
- a client message
- a Slack thread
- a meeting transcript
- an Azure DevOps item
- a Jira ticket
- a Notion initiative
- a GitHub issue
- a product discussion

The input does not need to be perfect. The system should assume many inputs will be incomplete, ambiguous, oversized, or partially wrong.

**The system should not simply convert input into tasks. It should first clarify intent, behaviour, value, uncertainty, and validation.**

---

## 6. Value Framing Layer

The Value Framing Packet is the central artefact.

It is both:
- a human alignment artefact
- an upstream orchestration payload

It should be clear enough for humans to validate, and structured enough to support future automation or downstream AI-assisted workflows.

**The packet is not a traditional requirements document. It is a continuity-of-intent artefact.**

---

## 7. Packet Review & Regeneration

A Value Framing Packet should not be treated as automatically correct when generated.

Two acceptable correction paths:
1. Update the original input (preferred — preserves continuity)
2. Update the generated packet directly (acceptable during Phase 2 experimentation)

When a packet is regenerated, the system should make visible:
- what changed
- which assumptions were corrected
- what ambiguity remains
- whether slices changed
- whether the packet is now sufficiently understood to continue

---

## 8. Core Principles

| Optimise for | Avoid |
|---|---|
| Behavioural clarity | Implementation-first thinking |
| Visible uncertainty | Fake certainty |
| Validation readiness | Specification completeness |
| Learning velocity | Output volume |
| Bounded progression | Rigid readiness gates |
| Continuity of intent | Intent drift |
