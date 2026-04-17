import { setTheme } from "../../../platform/theme/theme.ts";
import { useThemeState } from "../../../platform/theme/useThemeState.ts";

const themeSelectorId = "app-theme-selector";

export default function ThemeSelector() {
  const { availableThemes, themeId } = useThemeState();

  return (
    <div className="theme-selector">
      <label className="theme-selector__label" htmlFor={themeSelectorId}>
        Theme
      </label>
      <select
        className="theme-selector__control"
        id={themeSelectorId}
        onChange={(event) => {
          setTheme(event.target.value);
        }}
        value={themeId}
      >
        {availableThemes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
    </div>
  );
}
