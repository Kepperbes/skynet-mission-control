# Alfred Upstream Feature Port Protocol

**Repository:** `Kepperbes/skynet-mission-control`
**Purpose:** Safely port selected features from the original upstream Agentic OS into Skynet Mission Control without replacing, reverting, deleting, or silently changing Balcom's existing custom system.
**Audience:** Alfred and any other AI coding agent working on upstream integrations.
**Authority:** Mandatory for every task involving code, features, fixes, designs, routes, scripts, dependencies, configuration, or assets sourced from the upstream version of the OS.

---

## 1. Prime Directive

**Skynet Mission Control is the authoritative product. the upstream OS is a donor source, not the source of truth.**

The goal of an upstream integration is:

> Extract the specific capability Balcom wants from upstream version, understand how it works, and re-implement or port only the minimum required pieces into the current Skynet Mission Control architecture.

The goal is **not** to update Skynet Mission Control to upstream current codebase.

Use this mental model:

```text
WRONG:
Skynet Mission Control + upstream update -> make Skynet match upstream

RIGHT:
Skynet Mission Control + selected upstream feature -> preserve Skynet and add one capability
```

The local/personal implementation always wins unless Balcom explicitly instructs otherwise.

**Default rule: ADD or ADAPT. Never REPLACE.**

---

## 2. Historical Reason This Protocol Exists

A previous attempt to import a feature from upstream OS replaced major local code, including `vite.config.ts`. The application still appeared to run, but multiple Skynet-specific capabilities disappeared or regressed.

Among the affected capabilities were the Work system, Dream behavior, Antigravity detection, Knowledge Graph functionality, and startup behavior.

That incident establishes an important lesson:

> A successful build or a page that loads is not evidence that an upstream port was successful. Silent loss of existing functionality is a failed integration.

This protocol therefore treats preservation as a first-class acceptance criterion.

---

## 3. Required Reading Before Any Upstream Integration

Before analyzing or modifying code, read these files in the current repository:

1. `ALFRED-UPSTREAM-FEATURE-PORT-PROTOCOL.md` if it is present in the repository.
2. `VERSIONING.md`
3. `CHANGELOG.md`
4. `INTEGRATION.md`
5. `CLAUDE.md`
6. `package.json`
7. `scripts/personal-release-check.ts`

If the requested feature touches a subsystem with its own documentation, read that documentation too.

Do not rely on memory from a prior session. Re-read the current files because Skynet Mission Control evolves independently of upstream project.

If this protocol conflicts with generic upstream instructions, installer documentation, upstream README, or upstream upgrade process, **this protocol wins for Balcom's repository** unless Balcom explicitly says otherwise.

---

## 4. Non-Negotiable Ownership Model

Treat the codebases as two independently evolving products.

### Authoritative system

`Kepperbes/skynet-mission-control`

This contains Balcom's desired behavior, custom features, local compatibility fixes, product identity, operator workflows, and integration policy.

### Donor system

the original upstream Agentic OS source.

This is a source of ideas and implementation fragments.

### Consequence

Never assume that because a file has the same path or filename in both projects, upstream version is newer, better, or authoritative.

A same-named file may now represent substantially different systems.

---

## 5. Standalone Repository Policy

Skynet Mission Control must present itself as a standalone product and repository.

### Repository-facing naming rule

Do not add donor-maintainer names, donor-specific upgrade narratives, or donor-specific migration documents to the GitHub repository.

Repository documentation should use neutral terms such as:

```text
upstream
donor source
reference implementation
external source
selected upstream feature
```

Do not use a person's name as part of normal Skynet Mission Control documentation, filenames, comments, UI copy, changelog prose, branch guidance, or integration procedures unless a legal/license obligation specifically requires it.

### Remove donor-specific upgrade documentation

Any legacy donor-specific upgrade document under `docs/` should be removed from the GitHub repository after its useful safety lessons have been incorporated into this generic protocol.

Use this check to identify it without preserving donor-specific naming in repository documentation:

```bash
git ls-files "docs/UPGRADE-FROM-*.md"
```

Remove the donor-specific upgrade document returned by that check. Do not recreate it under another donor-specific filename inside the repository.

### Where donor-specific upgrade notes belong

If Balcom wants detailed notes about a particular upstream release, source archive, donor implementation, or historical comparison, keep those notes **outside the GitHub repository**, preferably in a dedicated folder on Balcom's Desktop.

Example:

```text
Desktop/
└── Skynet Upstream Integration Notes/
    ├── upstream-release-YYYY-MM-DD.md
    ├── feature-x-port-notes.md
    └── source-comparison.md
```

These external notes may contain donor names, URLs, release identifiers, implementation details, and historical context because they are private operator records rather than part of Skynet Mission Control itself.

### Keep the repository self-contained

The GitHub repository should explain:

- what Skynet Mission Control is;
- how Skynet Mission Control works;
- how to develop, test, release, and roll back Skynet Mission Control;
- how to import selected functionality from an external upstream source safely.

It should not read like a fork-maintenance log or an upgrade guide for another person's product.

### License and attribution exception

Do not remove or alter license text, copyright notices, or attribution that is legally required by the license governing inherited source code.

If repository cleanup appears to conflict with a license or copyright requirement:

1. preserve the legally required notice;
2. remove non-required promotional or historical references separately;
3. report the conflict to Balcom before deleting the required notice.

The goal is a standalone product identity without accidentally violating inherited license obligations.

---

## 6. Absolutely Forbidden Operations

Unless Balcom explicitly authorizes a full upstream migration, do **not** perform any of the following during a selective feature port:

```bash
git pull upstream main
git merge upstream/main
git rebase upstream/main
git reset --hard upstream/main
git checkout upstream/main -- .
git restore --source upstream/main .
git checkout --theirs .
git checkout --theirs <shared-or-protected-file>
```

Also forbidden:

```text
Copying upstream entire src/ directory over ours
Copying upstream entire scripts/ directory over ours
Replacing vite.config.ts
Replacing package.json wholesale
Replacing bun.lock wholesale
Replacing CLAUDE.md wholesale
Replacing .gitignore wholesale
Replacing routeTree.gen.ts with upstream generated copy
Using rsync/robocopy/cp with destructive mirror or overwrite semantics across the project
Deleting local-only files because upstream does not have them
Running upstream installer or setup process against Balcom's established environment
Treating a vendor zip as an "update" to install over the existing project
```

Do not use an automatic conflict strategy that chooses upstream side.

Do not interpret "take the feature from upstream" as permission to take all files changed in the upstream release.

---

## 7. External State Is Protected

A source-code feature port must not silently modify machine state.

Unless the task explicitly requires it and Balcom approves it, do not modify, reset, replace, reinstall, migrate, or clean:

- `~/.skynet-mission-control/`
- `~/.claude/`
- active Hermes configuration
- Hermes auth
- Hermes environment files
- Hermes sessions
- `~/.hermes/`
- Codex auth/config
- `.env.local`
- secrets or API keys
- Windows Task Scheduler entries
- cron jobs
- launchd jobs
- browser `localStorage`
- generated personal activity data
- Graphify's installed environment
- existing user knowledge graphs
- OS startup applications or startup behavior

**Do not run `bun run setup` as part of an upstream feature port.**

Do not run installation scripts merely because upstream feature includes one. First inspect what the script writes and determine whether the feature can be integrated at source level without changing external state.

---

## 8. Preflight Gate: No Changes Until This Is Complete

Before editing anything, establish the baseline.

### 7.1 Confirm repository and branch

```bash
git rev-parse --show-toplevel
git status --short
git branch --show-current
git rev-parse HEAD
```

The repository must be Skynet Mission Control.

If there are unrelated uncommitted changes, **do not erase, reset, overwrite, or silently stash them**. Preserve them and treat them as owner work.

### 7.2 Record the current release

Read:

```text
CURRENT_VERSION
package.json
CHANGELOG.md
```

The two version sources should agree.

### 7.3 Run the existing personal safety gate

```bash
bun run check:personal
```

If the current baseline fails its own personal guards, record the failure before doing upstream work. Do not "fix" the guard by deleting or weakening it.

### 7.4 Create rollback insurance

Before importing upstream code:

```bash
git bundle create <safe-path>/skynet-pre-port.bundle --all
```

Also record:

```bash
git rev-parse HEAD
git status --short
```

If an existing Skynet backup procedure is available, run it as well when appropriate.

### 7.5 Create a dedicated integration branch

Never develop the port directly on `main`.

Example:

```bash
git switch main
git switch -c upstream-port/<feature-name>-YYYYMMDD
```

`main` is the known-good recovery point.

---

## 9. Analyze Before Implementing

Every upstream feature port has two phases:

### Phase A: Reconnaissance

Do not change Skynet code yet.

Determine:

- What user-visible feature Balcom actually wants.
- Which upstream files implement that feature.
- Which functions, components, routes, assets, middleware blocks, types, packages, and scripts it truly depends on.
- Which of those files already exist in Skynet.
- Which Skynet versions have diverged.
- Which local features rely on the same shared files.
- Whether the feature changes external state.
- Whether the feature assumes macOS, Linux, Windows, or a specific local directory.
- Whether upstream implementation assumes configuration or data that Skynet handles differently.

### Phase B: Selective Port

Only after the dependency map is understood should code be added.

A feature port should be implemented as a minimal patch against Skynet, not as a file synchronization operation.

---

## 10. Mandatory File Classification

Classify every incoming file or changed area into one of these categories.

### Class A: New, isolated files

Examples:

- a new self-contained component
- a new route
- a new image or asset
- a new helper used only by the requested feature

These are the safest candidates to port.

Even here, inspect imports and side effects before copying.

### Class B: Shared files changed in both products

Examples:

- `vite.config.ts`
- `src/components/app-sidebar.tsx`
- `src/routes/agents.hermes.tsx`
- `src/routes/dashboard.tsx`
- `src/styles.css`
- `package.json`

**Never replace these wholesale.**

Port only the required functions, imports, handlers, UI entries, types, constants, or small hunks.

### Class C: Generated files

Example:

- `src/routeTree.gen.ts`

Do not take upstream generated output. Add the source route and let Skynet's own tooling regenerate the file.

Then inspect the generated diff.

### Class D: Skynet-owned or personal files

Examples include personal branding, local integrations, Work system files, Graphify data, personal guards, platform fixes, and local policies.

upstream absence of these files is irrelevant.

**Never delete them because upstream does not contain them.**

### Class E: Installers, migrations, or state-changing code

These require separate review.

Do not run them during a source port until their exact effects are known and Balcom has approved any external-state modification.

---

## 11. High-Risk / Protected Areas

The following areas have significant Skynet-specific behavior and must be treated as protected.

A requested feature may require editing them, but **upstream version must never replace Skynet's version**.

### Critical application nervous system

- `vite.config.ts`

This contains a very large amount of Skynet-specific middleware and local behavior. Shared middleware should be surgically inserted into the existing Skynet implementation.

Never use line count as a merge strategy. Understand handlers and behavior.

### Hermes command center

- `src/routes/agents.hermes.tsx`
- `src/components/hermes-mission-control.tsx`
- `src/components/intelligence-portal.tsx`
- `src/components/floating-oracle.tsx`
- `voice-lab/`

These contain extensive local Hermes/voice/mission-control behavior.

### Work system

- `src/routes/work.tsx`
- `src/routes/workspaces.*`
- `src/components/work/**`
- `src/lib/work-*.ts`
- `scripts/port-work-v2.py`

The Work system has previously been lost during an unsafe integration. Its continued presence and functionality are explicit regression checks.

### Design system

- `src/routes/design.tsx`
- `src/components/design-brands.tsx`
- `scripts/design-capture.mjs`
- `scripts/install-design-capture.ts`
- `scripts/merge-design-v2.py`

### Mission Control identity and personal policy

- `src/lib/brand.ts`
- branding in setup/shell/dashboard
- `CHANGELOG.md`
- `CURRENT_VERSION`
- `VERSIONING.md`

Preserve the Skynet Mission Control identity. Preserve third-party copyright and attribution only where legally required by the governing license, and only in the appropriate legal files (LICENSE / NOTICE). Do not restore donor branding to the product, UI, package metadata, or normal repository documentation.

### Graphify and knowledge graph integration

- `src/lib/graph-paths.ts`
- `scripts/setup-graphify-brain.sh`
- `src/data/graphs/index.json`
- `src/data/graphs/**`
- `src/routes/codegraph.tsx`
- graph-related middleware in `vite.config.ts`

Do not replace graph registries or personal graph artifacts with upstream copies.

### Hermes configuration safety

- `src/lib/hermes-config.ts`
- its tests
- Ministry configuration behavior

Preserve active-config resolution, backup behavior, permission preservation, validation, and rollback behavior.

### Aggregator and platform compatibility

- `scripts/aggregate.ts`
- `scripts/platform.ts`
- platform-specific detection behavior

Skynet contains Windows-specific compatibility work. Do not replace these with a macOS-oriented upstream file.

### Dream system

- `scripts/run-dream.ts`
- `scripts/run-dream.test.ts`
- Dream handlers/configuration

Preserve the bundled Dream contract and tested scheduled-run behavior.

### Model routing and recovery behavior

- `src/components/home-command.tsx`
- `src/lib/model-lane.ts`
- `src/lib/turn-watchdog.ts`
- `scripts/model-lane-check.ts`
- `scripts/turn-watchdog-check.ts`
- related portions of `vite.config.ts`

---

## 12. Current Personal Invariants That Must Survive

Do not assume these are permanent forever. Re-read `scripts/personal-release-check.ts` every time.

At the time this protocol was created, the repository explicitly guards important behaviors including:

- package version matching `CURRENT_VERSION`
- Skynet Mission Control as the canonical application identity
- legally required third-party copyright/attribution preserved only in legal files (LICENSE/NOTICE), never donor branding in product, UI, or docs
- Hermes Ministry using the active Hermes configuration
- validation/read-back when saving Hermes configuration
- backup permissions being preserved
- Windows-compatible Graphify path handling
- Graphify setup using supported agent platform values
- Windows virtualenv support
- reviewed/pinned Graphify installation behavior
- REISift CRM graph registration and tracking
- Claude default/failover policy preserving the owner's chosen model behavior
- no unwanted automatic Opus 5 failover
- Codex OAuth fallback using the verified Sol slug
- Dream using the bundled contract
- Dream scheduled execution retaining its tested timeout
- private/generated files remaining ignored

A selective upstream feature is not allowed to quietly undo these policies.

---

## 13. Safe Way to Inspect upstream Code

Prefer a separate temporary clone, extracted archive, or read-only donor directory.

Good:

```text
C:\temp\upstream-os\
C:\temp\skynet-port-analysis\
/tmp/upstream-os/
```

Then compare the two projects.

Examples:

```bash
git diff --no-index <skynet-file> <upstream-file>
diff -u <skynet-file> <upstream-file>
```

For Git remotes, fetching is acceptable. Merging is not.

Conceptually:

```bash
git fetch upstream
git show upstream/<ref>:path/to/file
```

Use upstream branch as a code browser and source of patches, not as a branch to merge into Skynet.

---

## 14. How to Port a New UI Feature

For a new route or UI module:

1. Identify the smallest self-contained route/component set.
2. Copy only genuinely new files.
3. Resolve imports against Skynet's current shared components.
4. If an import points to a shared file that differs, adapt the new feature to Skynet rather than replacing the shared file.
5. Add the smallest necessary sidebar/navigation entry.
6. Let Skynet regenerate router output.
7. Inspect all generated changes.
8. Verify all existing navigation still appears.
9. Verify no existing route disappeared.

If the feature's visual styling conflicts with Skynet's design system, adapt the feature to Skynet's current theme rather than replacing global styles.

---

## 15. How to Port Vite Middleware or Server Endpoints

This is the highest-risk common case.

If upstream feature includes handlers in `vite.config.ts`:

1. Locate the exact middleware block or endpoint.
2. Trace every helper, type, import, constant, environment variable, and path it uses.
3. Determine whether Skynet already has equivalent helpers.
4. Reuse Skynet helpers where possible.
5. Port only the feature-specific block and missing dependencies.
6. Insert it at a stable location in Skynet's existing `configureServer`.
7. Confirm endpoint names do not collide.
8. Confirm the port does not alter unrelated middleware ordering.
9. Never replace the entire plugin or config file.

If a large block must be inserted, prefer a deterministic port script with stable anchors and validation over manual mass editing.

Existing examples in the repository include:

- `scripts/merge-design-v2.py`
- `scripts/port-work-v2.py`

---

## 16. Dependency Rules

If the selected upstream feature requires new packages:

1. Identify exactly which packages are required.
2. Check whether Skynet already has equivalent dependencies.
3. Add only required packages.
4. Avoid unrelated package upgrades.
5. Do not replace `package.json`.
6. Do not copy upstream lockfile over Skynet's lockfile.
7. If the package manager updates `bun.lock`, review the lockfile diff.
8. Treat major framework upgrades as a separate migration, not incidental feature-port work.

If a feature cannot be ported without upgrading foundational packages, stop and report the migration requirement before proceeding.

---

## 17. Deletion Policy

Upstream integration should almost never delete Skynet code.

Before accepting any deletion, answer:

- Is this file owned by the feature being intentionally replaced?
- Is the Skynet feature truly obsolete?
- Is the deletion required for correctness?
- What existing behavior depends on it?
- Is there a test proving the old behavior is no longer required?
- Did Balcom authorize the removal?

If not, preserve the file.

A file absent from upstream codebase is **not evidence** that it should be removed from Skynet.

---

## 18. Required Diff Review Before Testing

After implementation, inspect the patch before running acceptance tests.

Required:

```bash
git status --short
git diff --stat
git diff --name-status main...HEAD
git diff --check
git diff main...HEAD
```

Look specifically for:

- unexpected deleted files
- large unrelated rewrites
- formatting-only churn
- entire-file replacements
- version metadata changes that were not requested
- changes to secrets or `.env` files
- changes to generated personal data
- unexpected lockfile churn
- changes outside the feature's dependency map
- changes to protected files that are larger than the intended surgical edit

If the diff is broader than the feature, reduce it before continuing.

---

## 19. Mandatory Validation Gates

A port is not complete because it compiles.

Run the project's current applicable guards. At minimum, when available:

```bash
bun run check:personal
bun run check:model-lanes
bun run check:turn-watchdog
bun test
bun run build
```

Also run feature-specific tests.

If one of these commands does not exist in the current future version, inspect `package.json` and use the current equivalent. Do not delete a failing guard merely to obtain a green result.

---

## 20. Regression Smoke Tests

The exact set may evolve. Re-check the current app structure.

At minimum, verify that existing core surfaces still load in addition to the newly imported feature.

Typical surfaces include:

```text
/
 /dashboard
 /work
 /design
 /memory
 /codegraph
 /agents/hermes
 /setup
```

Typical local endpoints include:

```text
/__live-data
/__dream_engines
/__graphify_list
/__work_state
/__hermes_status
```

Use the exact endpoints currently present in the repository.

Also verify, where applicable:

- Work tab is still present.
- Existing Work projects/tasks remain visible.
- Design remains available if previously installed.
- Dream review still loads and uses the expected engine behavior.
- Antigravity detection still works.
- Knowledge Graph still lists the expected local graphs.
- REISift CRM remains registered.
- Hermes chat remains functional.
- Voice behavior remains functional if touched.
- Model selection/failover policy remains intact.
- Skynet Mission Control branding remains intact.
- Dark/light theme behavior remains intact.
- No unwanted application launches or startup side effects were introduced.
- The requested new feature works.

Restart the dev server cleanly before smoke testing. Do not trust a stale server or stale browser bundle.

Use a hard refresh when needed.

---

## 21. Protect External State During Testing

Testing should prefer an isolated application server against existing state without rewriting that state.

Before and after a risky port, compare hashes or metadata for external state when practical.

If a test unexpectedly modifies:

- Hermes config
- `~/.skynet-mission-control`
- `.env.local`
- scheduled tasks
- user graphs
- auth files
- local sessions

stop and investigate before considering the port successful.

Do not normalize the unexpected mutation as "part of the update."

---

## 22. Required Final Integration Report

Before merge, produce a report with these sections.

### Requested feature

Exactly what Balcom asked to import.

### Upstream source

Version, branch, commit, archive, or source identifier used.

### Files inspected

Relevant upstream files and relevant Skynet files.

### Files added

Every newly added file.

### Existing files modified

Every modified Skynet file and why it had to change.

### Protected files touched

Explicitly identify any protected/high-risk file that changed.

### What was deliberately NOT imported

List unrelated upstream changes that were excluded.

### Local behavior preserved

List Skynet-specific behavior verified to remain intact.

### Dependency changes

Packages added, removed, or upgraded.

### External-state changes

The expected answer for most feature ports is:

```text
None.
```

If not none, explain exactly what changed and why.

### Validation

Commands run and results.

### Smoke tests

Existing surfaces tested plus the new feature.

### Rollback point

Baseline commit/tag/bundle.

### Remaining risks

Anything not fully verified.

---

## 23. Merge Policy

Do not merge the integration branch into `main` merely because tests pass.

Before merge:

1. Show the final diff summary.
2. Show the validation results.
3. State whether any protected files changed.
4. State whether any external state changed.
5. State what upstream changes were intentionally excluded.
6. Confirm the new feature works.
7. Confirm existing Skynet features still work.

**Ask Balcom before merging to `main`.**

If pushed to GitHub, prefer pushing the feature branch first so the integration remains reviewable and reversible.

---

## 24. Versioning Policy for Selective Ports

Do not automatically adopt upstream version number.

upstream release version and Skynet Mission Control's version are separate concepts.

Example:

```text
upstream releases V4.2
Balcom ports one feature from V4.2
Skynet does NOT automatically become V4.2
```

Use Skynet's own semantic-versioning process in `VERSIONING.md`.

Document the donor source in the changelog without surrendering Skynet's independent version identity.

---

## 25. Conflict Resolution Rule

When upstream and Skynet both changed the same logic:

**Do not choose a side automatically.**

Instead:

1. Understand Skynet's current behavior.
2. Understand what upstream new feature needs.
3. Preserve Skynet's behavior.
4. Layer the minimum new behavior into it.
5. Add or update a regression test where practical.

If the two behaviors are fundamentally incompatible, stop and explain the design conflict to Balcom rather than silently selecting upstream implementation.

---

## 26. Stop Conditions

Stop implementation and report to Balcom before proceeding if any of the following are true:

- The requested feature requires replacing a protected file.
- The feature requires a foundational framework migration.
- The feature requires deleting an existing Skynet capability.
- The feature changes external machine state unexpectedly.
- The feature requires overwriting Hermes configuration.
- The feature requires running a broad installer or setup routine.
- The upstream implementation assumes a different operating system in a way that may break Balcom's environment.
- The upstream feature requires secrets not already configured.
- A required personal guard fails because of the port.
- The build succeeds but a pre-existing Skynet feature disappears.
- You cannot explain why a large shared-file diff is necessary.
- You are unsure whether an existing block is custom Skynet behavior or inherited upstream behavior.
- The implementation would require `git merge`, `git pull`, `--theirs`, destructive sync, or project-wide copy operations.

Uncertainty is a reason to inspect more deeply, not a reason to overwrite.

---

## 27. Example: Correct Selective Port

Balcom says:

> "upstream added Feature X. I want Feature X, but I do not want his other changes."

Correct procedure:

```text
1. Freeze and record current Skynet baseline.
2. Create rollback bundle.
3. Create upstream-port/feature-x branch.
4. Inspect upstream Feature X implementation.
5. Map Feature X dependencies.
6. Classify each relevant file.
7. Copy genuinely new isolated Feature X files.
8. Surgically add required imports/navigation/middleware to Skynet shared files.
9. Regenerate Skynet-generated files locally.
10. Add only necessary dependencies.
11. Review full diff for unrelated churn/deletions.
12. Run personal guards, tests, and build.
13. Restart cleanly.
14. Test Feature X.
15. Regression-test Work, Design, Dream, Hermes, Graphify, Mission Control identity, and other touched systems.
16. Produce the integration report.
17. Keep donor-specific comparison/upgrade notes outside the repository.
18. Confirm `git ls-files "docs/UPGRADE-FROM-*.md"` returns no donor-specific upgrade document.
19. Ask Balcom before merging to main.
```

Incorrect procedure:

```text
1. Download upstream latest version.
2. Copy it over Skynet.
3. Resolve obvious compile errors.
4. Run the app.
5. Assume success because Feature X appears.
```

---

## 28. Operational Mantra

When integrating upstream work, repeat this rule:

> **Skynet is the product. Upstream is a reference implementation. Preserve first, port second, verify both.**

And the shortest possible safety rule:

> **Never synchronize the products. Transplant only the requested capability.**

---

## 29. Definition of Done

An upstream feature port is complete only when all of the following are true:

- The requested feature works.
- No unrelated upstream features were imported.
- Existing Skynet features still work.
- No Skynet-only file disappeared.
- No protected file was replaced wholesale.
- Personal guards pass.
- Relevant tests pass.
- Production build passes.
- The final diff is understood.
- External state is unchanged unless explicitly authorized.
- Rollback is available.
- The integration is documented.
- Donor-specific integration notes are stored outside the GitHub repository.
- No donor-specific `docs/UPGRADE-FROM-*.md` document remains in the repository.
- Repository-facing documentation uses standalone Skynet Mission Control terminology.
- Balcom has approved merging the branch to `main`.

If any of those statements is false, the integration is not done.
