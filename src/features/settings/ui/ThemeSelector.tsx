import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { setTheme } from "../../../platform/theme/theme.ts";
import { useThemeState } from "../../../platform/theme/useThemeState.ts";
import type { ThemeId } from "../../../shared/styles/theme-registry.ts";
import { useAnchoredOverlay } from "../../../shared/ui/useAnchoredOverlay.tsx";

export default function ThemeSelector() {
  const { availableThemes, themeId } = useThemeState();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();
  const buttonTextId = useId();
  const listboxId = useId();
  const themeIndex = useMemo(
    () => availableThemes.findIndex((theme) => theme.id === themeId),
    [availableThemes, themeId],
  );
  const activeTheme = availableThemes[themeIndex >= 0 ? themeIndex : 0];

  function optionId(index: number) {
    return `${listboxId}-option-${index}`;
  }

  const overlay = useAnchoredOverlay({
    isOpen,
    triggerRef,
    overlayRef: popoverRef,
    initialFocusRef: listboxRef,
    onDismiss: () => {
      setIsOpen(false);
    },
    placement: "bottom-start",
    minWidth: 220,
    offset: 8,
  });

  function openPopover(nextIndex = themeIndex >= 0 ? themeIndex : 0) {
    setActiveIndex(
      Math.min(Math.max(nextIndex, 0), Math.max(availableThemes.length - 1, 0)),
    );
    setIsOpen(true);
  }

  function selectTheme(nextThemeId: ThemeId) {
    setTheme(nextThemeId);
    overlay.dismiss({ restoreFocus: true });
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (availableThemes.length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        openPopover((themeIndex >= 0 ? themeIndex : 0) + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        openPopover((themeIndex >= 0 ? themeIndex : 0) - 1);
        break;
      case "Home":
        event.preventDefault();
        openPopover(0);
        break;
      case "End":
        event.preventDefault();
        openPopover(availableThemes.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        openPopover();
        break;
      default:
        break;
    }
  }

  function handleListboxKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (availableThemes.length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((currentIndex) =>
          Math.min(currentIndex + 1, availableThemes.length - 1),
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((currentIndex) => Math.max(currentIndex - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(availableThemes.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        selectTheme(availableThemes[activeIndex].id);
        break;
      case "Escape":
        event.preventDefault();
        overlay.dismiss({ restoreFocus: true });
        break;
      case "Tab":
        overlay.dismiss();
        break;
      default:
        break;
    }
  }

  return (
    <div className="theme-selector">
      <span className="theme-selector__label" id={labelId}>
        Theme
      </span>
      <button
        ref={triggerRef}
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${labelId} ${buttonTextId}`}
        className="theme-selector__trigger"
        onClick={() => {
          if (isOpen) {
            overlay.dismiss();
            return;
          }

          openPopover();
        }}
        onKeyDown={handleTriggerKeyDown}
        type="button"
      >
        <span className="theme-selector__value" id={buttonTextId}>
          {activeTheme.label}
        </span>
        <span aria-hidden="true" className="theme-selector__chevron">
          v
        </span>
      </button>
      {overlay.renderOverlay(
        <div
          aria-activedescendant={optionId(activeIndex)}
          aria-labelledby={labelId}
          className="theme-selector__listbox"
          id={listboxId}
          onKeyDown={handleListboxKeyDown}
          ref={listboxRef}
          role="listbox"
          tabIndex={-1}
        >
          {availableThemes.map((theme, index) => {
            const isSelected = theme.id === themeId;
            const isActive = index === activeIndex;

            return (
              <div
                aria-selected={isSelected}
                className={[
                  "theme-selector__option",
                  isSelected ? "theme-selector__option--selected" : "",
                  isActive ? "theme-selector__option--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                id={optionId(index)}
                key={theme.id}
                onClick={() => {
                  selectTheme(theme.id);
                }}
                onMouseEnter={() => {
                  setActiveIndex(index);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                role="option"
              >
                <span className="theme-selector__option-copy">
                  <span className="theme-selector__option-label">
                    {theme.label}
                  </span>
                  <span className="theme-selector__option-meta">
                    {theme.colorScheme}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="theme-selector__option-indicator"
                >
                  {isSelected ? "Selected" : ""}
                </span>
              </div>
            );
          })}
        </div>,
        {
          className: "theme-selector__popover",
        },
      )}
    </div>
  );
}
