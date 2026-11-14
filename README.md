# Bulla

Milestone invoices with on-chain escrow on X Layer. A freelancer creates an invoice, the client funds it, the freelancer submits a delivery hash or link, and the client approves the release, or a published time-lock refunds the client. Flow: Draft → Funded → Submitted → Released / Refunded.

A TapeOut circuit container is the escrow identity and the DeWEB home of the app; a companion contract holds funds and state. Every invoice has a public receipt link that needs no wallet.

> Whoever holds the TapeOut circuit controls its container. Bulla v1 is unaudited.

Built for the X Layer TapeOut Accelerate hackathon (deadline Dec 7, 2026, 23:59 UTC).

*A bulla was a sealed Mesopotamian clay envelope holding tokens for goods owed, broken open only when the deal completed.*

## Planning docs
- `docs/planning/verdict.md`, `competition.md`, `research.md`: idea selection and research
- `docs/planning/claude-code-prompts.md`: phased build prompts
- `docs/planning/non-claude-tasks.md`: human-only wallet, deploy, and submission tasks
