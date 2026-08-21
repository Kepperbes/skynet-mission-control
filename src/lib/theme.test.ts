import { describe, expect, test } from "bun:test";
import { resolveStoredTheme, THEME_INIT_SCRIPT } from "./theme";

function runInitScript(storedTheme: string | null, storageThrows = false) {
  const classes = new Set<string>();
  const classList = {
    add(name: string) {
      classes.add(name);
    },
    remove(name: string) {
      classes.delete(name);
    },
    toggle(name: string, enabled: boolean) {
      if (enabled) classes.add(name);
      else classes.delete(name);
    },
  };
  const localStorage = {
    getItem() {
      if (storageThrows) throw new Error("storage unavailable");
      return storedTheme;
    },
  };
  const document = { documentElement: { classList } };

  new Function("localStorage", "document", THEME_INIT_SCRIPT)(localStorage, document);
  return classes.has("dark");
}

describe("Skynet OS theme defaults", () => {
  test("defaults to the previous dark appearance when no preference is stored", () => {
    expect(resolveStoredTheme(null)).toBe("dark");
    expect(runInitScript(null)).toBe(true);
  });

  test("keeps an explicitly selected light theme", () => {
    expect(resolveStoredTheme("light")).toBe("light");
    expect(runInitScript("light")).toBe(false);
  });

  test("restores dark mode for dark, unknown, or unavailable storage", () => {
    expect(resolveStoredTheme("dark")).toBe("dark");
    expect(resolveStoredTheme("unexpected-value")).toBe("dark");
    expect(runInitScript("dark")).toBe(true);
    expect(runInitScript("unexpected-value")).toBe(true);
    expect(runInitScript(null, true)).toBe(true);
  });
});
