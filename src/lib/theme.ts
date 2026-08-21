export type Theme = "dark" | "light";

// Skynet OS historically used the dark operator palette. Preserve that
// appearance unless the user has explicitly selected light mode.
export const DEFAULT_THEME: Theme = "dark";

export function resolveStoredTheme(storedTheme: string | null): Theme {
  return storedTheme === "light" ? "light" : DEFAULT_THEME;
}

// Runs before React hydrates so shared page shells never flash white. Keep this
// behavior aligned with resolveStoredTheme: only an explicit "light" opts out.
export const THEME_INIT_SCRIPT =
  'try{document.documentElement.classList.toggle("dark",localStorage.getItem("theme")!=="light")}catch(e){document.documentElement.classList.add("dark")}';
