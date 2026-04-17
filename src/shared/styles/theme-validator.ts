import {
  themeTokenKeys,
  type ThemeDefinition,
  type ThemeTokenKey,
} from "./theme-contract.ts";

const themeTokenKeySet = new Set<ThemeTokenKey>(themeTokenKeys);

export function assertValidThemeRegistry(registry: readonly ThemeDefinition[]) {
  const seenThemeIds = new Set<string>();

  for (const theme of registry) {
    if (seenThemeIds.has(theme.id)) {
      throw new Error(`Duplicate theme id: ${theme.id}`);
    }

    seenThemeIds.add(theme.id);

    const tokenEntries = Object.entries(theme.tokens);
    const tokenKeys = tokenEntries.map(([key]) => key);

    for (const [tokenKey, tokenValue] of tokenEntries) {
      if (!themeTokenKeySet.has(tokenKey as ThemeTokenKey)) {
        throw new Error(
          `Theme "${theme.id}" defines an unknown token key: ${tokenKey}`,
        );
      }

      if (typeof tokenValue !== "string" || tokenValue.length === 0) {
        throw new Error(
          `Theme "${theme.id}" must define a non-empty value for token "${tokenKey}"`,
        );
      }
    }

    for (const tokenKey of themeTokenKeys) {
      if (!tokenKeys.includes(tokenKey)) {
        throw new Error(`Theme "${theme.id}" is missing token "${tokenKey}"`);
      }
    }
  }
}
