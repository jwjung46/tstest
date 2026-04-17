import {
  defineTheme,
  type ThemeDefinition,
  type ThemeId,
} from "./theme-contract.ts";
import { assertValidThemeRegistry } from "./theme-validator.ts";

export const defaultThemeId = "default";

const themeRegistry = [
  defineTheme({
    id: "default",
    label: "Default",
    colorScheme: "light",
    tokens: {
      "canvas-bg-start": "#f4efe4",
      "canvas-bg-end": "#dcecf2",
      "text-primary": "#132238",
      "text-secondary": "#526277",
      "text-muted": "#6a7a8f",
      "text-inverse": "#ffffff",
      "surface-panel": "rgba(255, 255, 255, 0.82)",
      "surface-panel-strong": "#ffffff",
      "surface-panel-soft": "rgba(255, 255, 255, 0.72)",
      "surface-card": "rgba(255, 255, 255, 0.86)",
      "surface-card-soft": "rgba(255, 255, 255, 0.62)",
      "surface-field": "rgba(255, 255, 255, 0.94)",
      "surface-field-strong": "#ffffff",
      "surface-interactive": "rgba(255, 255, 255, 0.9)",
      "border-subtle": "rgba(19, 34, 56, 0.08)",
      "border-default": "rgba(19, 34, 56, 0.12)",
      "border-strong": "rgba(19, 34, 56, 0.14)",
      "border-accent": "rgba(15, 118, 110, 0.18)",
      "accent-solid": "#0f766e",
      "accent-strong": "#115e59",
      "accent-soft": "rgba(15, 118, 110, 0.12)",
      "accent-text": "#115e59",
      "accent-on-solid": "#ffffff",
      "selection-surface": "rgba(15, 118, 110, 0.08)",
      "selection-border": "rgba(15, 118, 110, 0.42)",
      "selection-text": "#115e59",
      "status-success-surface": "rgba(15, 118, 110, 0.1)",
      "status-success-border": "rgba(15, 118, 110, 0.18)",
      "status-success-text": "#115e59",
      "status-danger-surface": "rgba(171, 43, 54, 0.08)",
      "status-danger-border": "rgba(171, 43, 54, 0.18)",
      "status-danger-text": "#8d1f2b",
      "status-info-surface": "rgba(19, 34, 56, 0.04)",
      "status-info-border": "rgba(19, 34, 56, 0.12)",
      "status-info-text": "#132238",
      "focus-ring": "rgba(15, 118, 110, 0.34)",
      "shadow-panel": "0 24px 60px rgba(19, 34, 56, 0.12)",
      "shadow-elevated": "0 30px 80px rgba(19, 34, 56, 0.18)",
    },
  }),
  defineTheme({
    id: "ocean",
    label: "Ocean",
    colorScheme: "light",
    tokens: {
      "canvas-bg-start": "#eef8fb",
      "canvas-bg-end": "#d7ebf6",
      "text-primary": "#10253c",
      "text-secondary": "#4a6177",
      "text-muted": "#64798d",
      "text-inverse": "#ffffff",
      "surface-panel": "rgba(248, 253, 255, 0.84)",
      "surface-panel-strong": "#ffffff",
      "surface-panel-soft": "rgba(238, 248, 252, 0.78)",
      "surface-card": "rgba(251, 255, 255, 0.88)",
      "surface-card-soft": "rgba(233, 244, 248, 0.72)",
      "surface-field": "rgba(255, 255, 255, 0.95)",
      "surface-field-strong": "#ffffff",
      "surface-interactive": "rgba(255, 255, 255, 0.92)",
      "border-subtle": "rgba(16, 37, 60, 0.08)",
      "border-default": "rgba(16, 37, 60, 0.13)",
      "border-strong": "rgba(16, 37, 60, 0.18)",
      "border-accent": "rgba(11, 105, 146, 0.2)",
      "accent-solid": "#0b6992",
      "accent-strong": "#0a5576",
      "accent-soft": "rgba(11, 105, 146, 0.12)",
      "accent-text": "#0a5576",
      "accent-on-solid": "#ffffff",
      "selection-surface": "rgba(11, 105, 146, 0.1)",
      "selection-border": "rgba(11, 105, 146, 0.36)",
      "selection-text": "#0a5576",
      "status-success-surface": "rgba(22, 128, 112, 0.1)",
      "status-success-border": "rgba(22, 128, 112, 0.2)",
      "status-success-text": "#166b61",
      "status-danger-surface": "rgba(178, 56, 72, 0.08)",
      "status-danger-border": "rgba(178, 56, 72, 0.18)",
      "status-danger-text": "#8f2435",
      "status-info-surface": "rgba(16, 37, 60, 0.05)",
      "status-info-border": "rgba(16, 37, 60, 0.12)",
      "status-info-text": "#10253c",
      "focus-ring": "rgba(11, 105, 146, 0.32)",
      "shadow-panel": "0 24px 60px rgba(16, 37, 60, 0.14)",
      "shadow-elevated": "0 32px 80px rgba(16, 37, 60, 0.2)",
    },
  }),
  defineTheme({
    id: "graphite",
    label: "Graphite",
    colorScheme: "dark",
    tokens: {
      "canvas-bg-start": "#111827",
      "canvas-bg-end": "#0b1220",
      "text-primary": "#edf3fb",
      "text-secondary": "#cad7e8",
      "text-muted": "#8fa0b8",
      "text-inverse": "#08111f",
      "surface-panel": "rgba(16, 24, 39, 0.82)",
      "surface-panel-strong": "#172033",
      "surface-panel-soft": "rgba(17, 24, 39, 0.74)",
      "surface-card": "rgba(20, 30, 48, 0.9)",
      "surface-card-soft": "rgba(23, 32, 51, 0.72)",
      "surface-field": "rgba(12, 19, 32, 0.94)",
      "surface-field-strong": "#162235",
      "surface-interactive": "rgba(21, 32, 49, 0.96)",
      "border-subtle": "rgba(143, 160, 184, 0.18)",
      "border-default": "rgba(143, 160, 184, 0.24)",
      "border-strong": "rgba(143, 160, 184, 0.36)",
      "border-accent": "rgba(68, 211, 255, 0.28)",
      "accent-solid": "#12a6d6",
      "accent-strong": "#0d86ad",
      "accent-soft": "rgba(18, 166, 214, 0.16)",
      "accent-text": "#75dbff",
      "accent-on-solid": "#08111f",
      "selection-surface": "rgba(18, 166, 214, 0.18)",
      "selection-border": "rgba(117, 219, 255, 0.4)",
      "selection-text": "#b8efff",
      "status-success-surface": "rgba(45, 212, 191, 0.14)",
      "status-success-border": "rgba(45, 212, 191, 0.3)",
      "status-success-text": "#7cf3de",
      "status-danger-surface": "rgba(251, 113, 133, 0.16)",
      "status-danger-border": "rgba(251, 113, 133, 0.3)",
      "status-danger-text": "#fec6d0",
      "status-info-surface": "rgba(143, 160, 184, 0.12)",
      "status-info-border": "rgba(143, 160, 184, 0.24)",
      "status-info-text": "#edf3fb",
      "focus-ring": "rgba(117, 219, 255, 0.36)",
      "shadow-panel": "0 24px 60px rgba(0, 0, 0, 0.34)",
      "shadow-elevated": "0 34px 90px rgba(0, 0, 0, 0.46)",
    },
  }),
] as const satisfies readonly ThemeDefinition[];

if (import.meta.env?.DEV) {
  assertValidThemeRegistry(themeRegistry);
}

export function getThemeRegistry() {
  return themeRegistry;
}

export function getThemeDefinition(themeId: string) {
  const resolvedThemeId = resolveThemeId(themeId);

  return (
    themeRegistry.find((theme) => theme.id === resolvedThemeId) ??
    themeRegistry[0]
  );
}

export function resolveThemeId(value: unknown): ThemeId {
  if (
    typeof value === "string" &&
    themeRegistry.some((theme) => theme.id === value)
  ) {
    return value;
  }

  return defaultThemeId;
}
