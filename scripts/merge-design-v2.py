"""Additive Design OS re-integration for Skynet Mission Control.

Extracts the self-contained Design OS middleware block from the vendor config
(feature/design-os:vite.config.ts lines 1000-5023) and inserts it into the
stable main vite.config.ts right after `configureServer(server) {` — WITHOUT
touching any of main's existing handlers (dream, antigravity, live-data,
spotify, gbrain, app shell). Also stages the additive UI pieces.
"""
import re
import shutil
from pathlib import Path

ROOT = Path(r"C:/Users/Linda/Downloads/Skynet Mission Control")
VENDOR = Path(r"C:/Users/Linda/AppData/Local/Temp/design-os-config.ts")  # copied earlier

def main():
    # 1) Extract the design block from the vendor config
    vendor_lines = VENDOR.read_text(encoding="utf-8", errors="replace").splitlines(keepends=True)
    block = vendor_lines[999:5023]  # lines 1000..5023 inclusive (0-indexed slice)
    print(f"design block: {len(block)} lines ({block[0].strip()[:60]}...)")

    # 2) Back up main config and insert the block
    cfg = ROOT / "vite.config.ts"
    shutil.copy2(cfg, ROOT / "vite.config.ts.pre-design-v2.bak")
    text = cfg.read_text(encoding="utf-8")
    anchor = "configureServer(server) {"
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("anchor not found in main config")
    # find the end of the anchor line
    nl = text.find("\n", idx)
    indent = "          "
    inserted = "".join(block)
    # The vendor block is indented for the plugin context already (10 spaces).
    new_text = text[: nl + 1] + "\n" + inserted + text[nl + 1 :]
    cfg.write_text(new_text, encoding="utf-8")
    print(f"inserted design block after line {text[:idx].count(chr(10)) + 1}")

if __name__ == "__main__":
    main()
