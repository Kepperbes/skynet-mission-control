# Skynet OS Versioning and Release Procedure

## Recommendation: Semantic Versioning

Use standard three-part versions instead of increasing the second number for every change:

- **Patch** — `v3.0.0` → `v3.0.1`: compatible bug fix or documentation repair
- **Minor** — `v3.0.1` → `v3.1.0`: backward-compatible feature or improvement
- **Major** — `v3.1.0` → `v4.0.0`: breaking change or migration requiring deliberate operator action

This keeps frequent updates efficient while communicating rollback and migration risk. The current personal baseline is `v2.1.0`; the reviewed v3 upgrade will be `v3.0.0` because it is a major source upgrade.

## Repository Model

- `main` always points to the newest verified personal release.
- Every release receives an immutable annotated tag (`vX.Y.Z`).
- Update work occurs on a branch such as `upgrade/v3.0.0`.
- Personal/runtime data is never committed.
- Skynet Mission Control remains the product identity; legally required third-party notices are retained only in the appropriate legal files, while personal integration changes are documented in the changelog and commits.

## Release Workflow

1. **Start from a clean verified release.**
2. **Create a timestamped local rollback backup** of source and relevant external state.
3. **Create an update branch.**
4. **Audit incoming code** for source changes, migrations, credentials, personal data, generated files, and destructive setup behavior.
5. **Merge selectively.** Preserve local fixes and external settings; do not overwrite them with vendor defaults.
6. **Update version metadata:** `package.json`, `CURRENT_VERSION`, and `CHANGELOG.md`.
7. **Run release checks:** dependency install from lockfile, production build, targeted tests, secret scan, and runtime smoke test.
8. **Review the final diff and tracked-file list.**
9. **Commit, merge to `main`, and create an annotated tag.**
10. **Push both branch and tag to GitHub.**
11. **Verify the remote commit and tag** by reading them back from GitHub.

## Required Release Record

Each release entry must state:

- version and date;
- source of the update;
- new features and fixes;
- local fixes preserved;
- migration steps taken;
- tests and build commands run;
- known limitations;
- exact prior tag for rollback.

## Git Commands

Use these only after the backup and audit steps are complete:

```bash
git switch -c 'upgrade/vX.Y.Z'
# apply and verify changes
git add --all
git diff --cached --check
git status --short
git commit -m 'release: Skynet OS vX.Y.Z'
git switch main
git merge --ff-only 'upgrade/vX.Y.Z'
git tag -a 'vX.Y.Z' -m 'Skynet OS vX.Y.Z'
git push origin main
git push origin 'vX.Y.Z'
```

Never move or reuse a published version tag. If a release is wrong, fix it in a new version.

## Rollback Principle

Roll back source by checking out an exact prior tag into a separate directory. Restore external state only if the failed upgrade changed it. Git versioning and private state backups solve different problems; both are required.
