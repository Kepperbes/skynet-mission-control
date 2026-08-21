# Install or Roll Back a Specific Skynet OS Version

This repository is the authoritative, version-controlled distribution of this personal Skynet OS installation. Every approved release is identified by an immutable Git tag such as `v2.1.0` or `v3.0.0`.

## Non-Negotiable Data-Safety Rules

An installer or LLM working from this repository must follow these rules:

1. **Never delete or replace personal state.** Preserve `~/.skynet-mission-control`, Hermes configuration/authentication, Obsidian data, Claude/Codex sessions, browser profile data, and every `.env` file.
2. **Never commit credentials or generated machine data.** Do not commit `.env*`, `src/data/live-data.json`, generated graph data, `node_modules`, `dist`, `.wrangler`, or local repair archives.
3. **Back up before switching versions.** Record the current commit/tag and take a timestamped source-and-state snapshot before changing files.
4. **Install source code into a separate directory first.** Do not overwrite a known-working directory until the requested tag builds and passes its release checks.
5. **Do not rerun first-time setup during an upgrade unless explicitly required.** Normal version switching uses the existing external state.
6. **Do not change scheduled tasks, models, providers, API keys, or user settings merely because a release contains different defaults.** Migrate only what the selected release requires, and merge rather than replace.

## Information the Operator Must Supply

- Repository URL: the private GitHub URL for `skynet-mission-control`
- Requested version: an exact tag, for example `v2.1.0`
- Install destination: a new or existing local source directory

Never interpret `latest` as permission to install an unreviewed release. Resolve the requested tag explicitly and show it before installation.

## Safe Installation Procedure

The examples below use Git Bash syntax on Windows. Replace placeholders before running them.

### 1. Inspect the current installation

```bash
git -C '<CURRENT_INSTALL_DIRECTORY>' status --short --branch
git -C '<CURRENT_INSTALL_DIRECTORY>' describe --tags --always
```

If the current installation is not a Git checkout, stop and create a timestamped source backup before continuing.

### 2. Back up personal state

At minimum, preserve these locations when they exist:

```text
<CURRENT_INSTALL_DIRECTORY>
~/.skynet-mission-control
~/.hermes/.env
the active Hermes config reported by: hermes config path
the Skynet Mission Control Dream scheduled-task definition
```

The backup is local and private. It must never be added to this repository.

### 3. Clone the requested release into a staging directory

```bash
git clone '<REPOSITORY_URL>' '<STAGING_DIRECTORY>'
cd '<STAGING_DIRECTORY>'
git fetch --tags --force
git checkout --detach '<REQUESTED_TAG>'
git status --short --branch
git describe --tags --exact-match
```

The final command must print the exact requested tag.

### 4. Install reproducibly and validate

```bash
bun install --frozen-lockfile
bun run build
```

Run every release-specific test named in the selected tag's release notes. A failed build or required test blocks activation.

### 5. Preserve settings while activating

- Keep the same `~/.skynet-mission-control` directory.
- Keep the active Hermes config and authentication stores unchanged.
- Keep `.env.local` private. If the new source directory needs it, copy it locally from the previous installation; never commit it.
- Keep the same browser origin/port when practical so browser-local preferences remain available.
- Reinstall the Dream task only when its installer changed and release notes explicitly require migration. Back up the task first, merge its configuration, then verify a manual run.

Start the staged version:

```bash
bun run dev
```

Verify the dashboard, personal data, model/provider selection, voice settings, Dream state, and any release-specific feature before retiring the old source directory.

## Rollback Procedure

If the new release fails:

1. Stop its dev server.
2. Restart the previous known-working source directory, or stage its exact tag using the installation procedure above.
3. Do not restore personal state unless the upgrade actually modified it.
4. If state restoration is necessary, preserve the failed post-upgrade state first, then restore only the affected files from the timestamped backup.
5. Verify the previous build, dashboard, Dream task, and personal settings.

Do not use `git reset --hard` as a substitute for a data backup. Git protects repository files; it does not protect external state or browser storage.

## Copy/Paste Prompt for an LLM

```text
Install Skynet OS from <REPOSITORY_URL> at the exact release tag <REQUESTED_TAG>.

Read INSTALL-VERSION.md and VERSIONING.md before taking action. Inspect the current installation and create a timestamped rollback backup of the source, ~/.skynet-mission-control, the active Hermes config, ~/.hermes/.env, and the Skynet Mission Control Dream scheduled task. Never print, commit, or replace credentials or personal data.

Clone the requested tag into a separate staging directory. Verify the exact tag, install from the lockfile, run the production build and all release-specific tests, then report the results before activating it. Preserve external state, browser-local settings, models, providers, schedules, and API keys. Do not run first-time setup or overwrite the working installation unless the selected release explicitly requires it and the migration has been reviewed.

If validation fails, leave the existing installation active and report the failure. After activation, verify the dashboard and personal settings, and give me the exact rollback command/path.
```

## Definition of Done

An installation or rollback is complete only when:

- the checkout exactly matches the requested immutable tag;
- dependency installation and the production build pass;
- required release tests pass;
- personal data and settings remain present;
- no credential or generated private data is tracked by Git;
- the active version and rollback path are reported explicitly.
