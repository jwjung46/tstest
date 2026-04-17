import type { ThemeDefinition } from "../../shared/styles/theme-contract.ts";

export function applyThemeToDocument(theme: ThemeDefinition) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.colorScheme;

  for (const [tokenKey, tokenValue] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--theme-${tokenKey}`, tokenValue);
  }
}
