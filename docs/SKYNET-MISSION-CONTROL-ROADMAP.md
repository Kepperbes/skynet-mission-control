# Skynet Mission Control — Personalized Dashboard Roadmap

_Approved direction: 2026-07-29 · Implementation status: planned_

## Product rule

Use one canonical task record and expose it through multiple views. Do not create independent task stores in Mission Control, Hermes, Obsidian, and project folders.

Every canonical task must carry:

- project;
- owner;
- status;
- priority;
- deadline;
- blocker or dependency;
- source;
- completion evidence.

## Approved modules

1. **Today** — top outcomes, meetings, deadlines, and focus blocks.
2. **Kanban** — Now, Next, Waiting/Blocked, and Done views over the canonical task record.
3. **Calendar** — today and week views with task/calendar conflict detection.
4. **Project health** — website, underwriting tool, CRM, and Mission Control delivery state.
5. **Blocker radar** — overdue, idle, dependency-blocked, or unowned work.
6. **Delegation queue** — work Hermes or GPT-5.6 Sol can own.
7. **Momentum** — completion consistency, recovery, and streaks without punitive framing.
8. **Knowledge health** — Obsidian and Graphify freshness and ingestion state.
9. **Agent activity** — runs, failures, outputs, costs, and approvals.

## Calendar backlog

- [ ] Confirm the iCloud Calendar account and calendars Balcom wants displayed.
- [ ] Implement a secure backend CalDAV connector using an Apple app-specific password; never expose credentials to the browser.
- [ ] Start read-only and normalize events into the Mission Control calendar view.
- [ ] Use iCloud as the primary calendar source.
- [ ] Exclude Google Calendar from the initial calendar view even though the iPhone currently displays both accounts.
- [ ] Add account/source badges and conflict handling before any write-back capability.
- [ ] Add scheduling or event creation only after a separate approval and write-safety test.

## Adaptive gamification

Approved states:

- **Clear** — commitments are on track.
- **Focused** — a deadline is approaching; emphasize the next action.
- **Recovery** — commitments slipped; simplify the interface and present one recovery action.
- **Momentum** — sustained completion; use restrained positive reinforcement.

The theme must use several signals rather than changing state because a single task is overdue. Never shame the operator or encourage unhealthy streak behavior.

## Dependency order

1. Canonical task schema and adapters.
2. Read-only iCloud Calendar connector.
3. Today, Kanban, project health, and blocker radar.
4. Delegation queue and completion-evidence loop.
5. Knowledge health with Graphify registry and Obsidian freshness.
6. Adaptive gamification and theme states.
7. Calendar write-back, only if separately approved.
