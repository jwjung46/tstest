import type { ThemeDefinition } from "../../shared/styles/theme-contract.ts";

type ThemeRootStyle = {
  colorScheme: string;
  setProperty(name: string, value: string): void;
};

type ThemeDocumentRoot = {
  dataset: Record<string, string | undefined>;
  style: ThemeRootStyle;
};

type ThemeDocumentLike = {
  documentElement: ThemeDocumentRoot;
};

function getThemeDocument(): ThemeDocumentLike | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document;
}

export function applyThemeToDocument(
  theme: ThemeDefinition,
  themeDocument: ThemeDocumentLike | null = getThemeDocument(),
) {
  if (!themeDocument) {
    return;
  }

  const root = themeDocument.documentElement;

  root.dataset.theme = theme.id;
  root.style.colorScheme = theme.colorScheme;

  for (const [tokenKey, tokenValue] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--theme-${tokenKey}`, tokenValue);
  }
}
