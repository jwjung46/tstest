export const themeTokenKeys = [
  "canvas-bg-start",
  "canvas-bg-end",
  "text-primary",
  "text-secondary",
  "text-muted",
  "text-inverse",
  "surface-panel",
  "surface-panel-strong",
  "surface-panel-soft",
  "surface-card",
  "surface-card-soft",
  "surface-field",
  "surface-field-strong",
  "surface-interactive",
  "border-subtle",
  "border-default",
  "border-strong",
  "border-accent",
  "accent-solid",
  "accent-strong",
  "accent-soft",
  "accent-text",
  "accent-on-solid",
  "selection-surface",
  "selection-border",
  "selection-text",
  "status-success-surface",
  "status-success-border",
  "status-success-text",
  "status-danger-surface",
  "status-danger-border",
  "status-danger-text",
  "status-info-surface",
  "status-info-border",
  "status-info-text",
  "focus-ring",
  "shadow-panel",
  "shadow-elevated",
] as const;

export type ThemeTokenKey = (typeof themeTokenKeys)[number];

export type ThemeTokens = Record<ThemeTokenKey, string>;

export type ThemeId = string;

export type ThemeColorScheme = "light" | "dark";

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  colorScheme: ThemeColorScheme;
  tokens: ThemeTokens;
};

export function defineTheme(definition: ThemeDefinition): ThemeDefinition {
  return definition;
}
