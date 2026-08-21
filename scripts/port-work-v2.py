"""Port the Work feature (Kanban board) API into the v2 config additively."""
import shutil
from pathlib import Path

ROOT = Path(r"C:/Users/Linda/Downloads/Skynet Mission Control")
VENDOR = Path(r"C:/Users/Linda/AppData/Local/Temp/canonical-config.ts")
CFG = ROOT / "vite.config.ts"

lines = VENDOR.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)

def grab(start, end):
    """1-indexed inclusive slice."""
    return "".join(lines[start - 1 : end])

work_imports = grab(43, 48)          # import { ... } from "./src/lib/work-store.server"; + work-domain
work_error_fn = grab(50, 52)         # function workErrorMessage(...) {...}
work_store_inst = grab(1029, 1031)   # const workStore = new WorkStore({...});
work_middleware = grab(1049, 1171)   # server.middlewares.use("/__work_state", ...);

text = CFG.read_text(encoding="utf-8")

# 1) imports after the hermes-config import
anchor_import = 'import { resolveHermesConfigPath, saveMoaPresetVerified } from "./src/lib/hermes-config";'
assert anchor_import in text, "import anchor missing"
text = text.replace(anchor_import, anchor_import + "\n" + work_imports, 1)

# 2) workErrorMessage after the import block (before the IS_WIN section)
anchor_win = "// ── Cross-platform binary resolution (Windows support) ──"
assert anchor_win in text, "win anchor missing"
text = text.replace(anchor_win, work_error_fn + "\n" + anchor_win, 1)

# 3) workStore instantiation + middleware after configureServer(server) {
anchor_cs = "configureServer(server) {"
assert anchor_cs in text, "configureServer anchor missing"
idx = text.find(anchor_cs)
nl = text.find("\n", idx)
work_block = work_store_inst + "\n" + work_middleware
text = text[: nl + 1] + work_block + text[nl + 1 :]

shutil.copy2(CFG, ROOT / "vite.config.ts.pre-work.bak")
CFG.write_text(text, encoding="utf-8")
print(f"work ported: imports + workErrorMessage + workStore + /__work_state middleware")
print(f"config now {len(text.splitlines())} lines")
