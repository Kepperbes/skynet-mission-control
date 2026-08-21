#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
# setup-graphify-brain.sh — wire graphify into the Agentic OS as ONE shared
# brain across the dashboard, Hermes, and Claude Code.
#
# Idempotent: safe to re-run. After this, ingesting a repo in Skynet Mission Control
# dashboard makes it queryable by BOTH agents, because both read the
# dashboard's registry (src/data/graphs/index.json) as the source of truth.
#
# Usage:  bash scripts/setup-graphify-brain.sh
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail

OS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
INDEX="$OS_DIR/src/data/graphs/index.json"
case "$(uname -s 2>/dev/null || true)" in
  MINGW*|MSYS*|CYGWIN*) CLAUDE_PLATFORM="windows" ;;
  Darwin*) CLAUDE_PLATFORM="claude" ;;
  *) CLAUDE_PLATFORM="claude" ;;
esac
if command -v python3 >/dev/null 2>&1; then PYTHON_CMD="python3"; else PYTHON_CMD="python"; fi

echo "▎ Graphify shared-brain setup"
echo

# 1. Install graphify (the program) — once, on the machine.
GRAPHIFY_PACKAGE='graphifyy[pdf,office]==0.9.30'
if ! command -v graphify >/dev/null 2>&1 && [ ! -x "$HOME/.local/bin/graphify.exe" ] && [ ! -x "$HOME/.notebooklm-venv/bin/graphify" ] && [ ! -x "$HOME/.graphify-venv/bin/graphify" ] && [ ! -x "$HOME/.graphify-venv/Scripts/graphify.exe" ]; then
  echo "1. Installing graphify…"
  if command -v uv >/dev/null 2>&1; then
    uv tool install --upgrade "$GRAPHIFY_PACKAGE" --python 3.12
  elif command -v pipx >/dev/null 2>&1; then
    pipx install "$GRAPHIFY_PACKAGE"
  else
    "$PYTHON_CMD" -m venv "$HOME/.graphify-venv"
    if [ -x "$HOME/.graphify-venv/Scripts/pip.exe" ]; then
      "$HOME/.graphify-venv/Scripts/pip.exe" install -q "$GRAPHIFY_PACKAGE"
    else
      "$HOME/.graphify-venv/bin/pip" install -q "$GRAPHIFY_PACKAGE"
    fi
  fi
else
  echo "1. graphify already installed ✓"
fi

# 2. Resolve the binary + symlink onto PATH so every agent can call it.
GBIN=""
for c in "$(command -v graphify || true)" "$HOME/.local/bin/graphify.exe" "$HOME/.local/bin/graphify" "$HOME/.notebooklm-venv/bin/graphify" "$HOME/.graphify-venv/bin/graphify" "$HOME/.graphify-venv/Scripts/graphify.exe" "/opt/homebrew/bin/graphify"; do
  [ -n "$c" ] && [ -x "$c" ] && { GBIN="$c"; break; }
done
if [ -z "$GBIN" ]; then echo "✗ could not find the graphify binary after install"; exit 1; fi
mkdir -p "$HOME/.local/bin"
if [ "$GBIN" != "$HOME/.local/bin/graphify.exe" ] && [ "$GBIN" != "$HOME/.local/bin/graphify" ]; then
  ln -sf "$GBIN" "$HOME/.local/bin/graphify"
fi
echo "2. graphify resolved → $GBIN ✓"

# 3. Introduce graphify to both agents (skill files — not extra installs).
echo "3. Registering with agents…"
"$GBIN" install --platform "$CLAUDE_PLATFORM" >/dev/null 2>&1 && echo "   • Claude Code ✓" || echo "   • Claude Code — skipped"
"$GBIN" install --platform hermes  >/dev/null 2>&1 && echo "   • Hermes ✓"      || echo "   • Hermes — skipped"

# 4. Point both skills at the dashboard registry (the shared brain).
NOTE_MARKER="Shared brain — Skynet Mission Control knowledge graph registry"
read -r -d '' NOTE <<EOF || true
## Shared brain — Skynet Mission Control knowledge graph registry

Your Skynet Mission Control dashboard maintains a master registry of every graphed project at:

  $INDEX

ALWAYS read this file FIRST when asked about "my projects", "what have I ingested", "the codebase", or any specific project by name. Each entry has: id, name, lang, nodeCount, edgeCount, communities, and godNodes. A locally ingested entry may also have an absolute graphPath.

To answer about a project: find its entry. Use graphPath when present; otherwise resolve <registry-directory>/<id>.json. Query that file with graphify (query / path / explain) or read graph.json. The Skynet Mission Control registry entry is THIS operating system itself.

Ingesting a repo in the dashboard adds it here automatically — one shared memory across Hermes, Claude Code, and the dashboard.

---

EOF
HERMES_SKILL=""
if command -v hermes >/dev/null 2>&1; then
  HERMES_CONFIG="$(hermes config path 2>/dev/null || true)"
  [ -n "$HERMES_CONFIG" ] && HERMES_SKILL="$(dirname "$HERMES_CONFIG")/skills/graphify/SKILL.md"
fi
for skill in "$HERMES_SKILL" "$HOME/.hermes/skills/graphify/SKILL.md" "$HOME/.claude/skills/graphify/SKILL.md"; do
  [ -f "$skill" ] || continue
  if ! grep -q "$NOTE_MARKER" "$skill"; then
    # Preserve SKILL.md YAML frontmatter: append the local registry contract
    # instead of inserting content before the opening `---` delimiter.
    printf '\n%s\n' "$NOTE" >> "$skill"
    echo "4. linked registry → $(basename "$(dirname "$(dirname "$skill")")")/graphify ✓"
  fi
done

# 5. Verify every registry entry resolves to a graph. Keep bundled entries
# portable: do not dirty the repository with machine-specific absolute paths.
if [ -f "$INDEX" ]; then
  "$PYTHON_CMD" - "$INDEX" <<'PY'
import json, os, sys
p = sys.argv[1]; absdir = os.path.dirname(os.path.abspath(p))
idx = json.load(open(p))
missing = []
for e in idx:
    gp = e.get("graphPath") or os.path.join(absdir, e["id"] + ".json")
    if not os.path.isfile(gp): missing.append(e["id"])
if missing:
    raise SystemExit(f"registry entries missing graphs: {', '.join(missing)}")
print(f"5. registry: {len(idx)} project graph paths resolve ✓")
PY
fi

# 6. Reload Hermes so it picks up the skill change.
if command -v hermes >/dev/null 2>&1; then
  hermes gateway restart >/dev/null 2>&1 && echo "6. Hermes gateway restarted ✓" || echo "6. restart Hermes manually (hermes gateway restart)"
fi

echo
echo "✅ Done. Ingest a repo in the dashboard, then ask either agent about it."
