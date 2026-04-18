import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { setTheme } from "../../../platform/theme/theme.ts";
import { useThemeState } from "../../../platform/theme/useThemeState.ts";
import type { ThemeId } from "../../../shared/styles/theme-registry.ts";

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

const popoverOffset = 8;
const viewportPadding = 16;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPopoverPosition(element: HTMLElement): PopoverPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rect = element.getBoundingClientRect();

  if (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    return null;
  }

  const width = Math.max(rect.width, 220);
  const left = clamp(
    rect.left,
    viewportPadding,
    Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
  );
  const top = clamp(
    rect.bottom + popoverOffset,
    viewportPadding,
    Math.max(viewportPadding, window.innerHeight - viewportPadding),
  );

  return {
    top,
    left,
    width,
  };
}

export default function ThemeSelector() {
  const { availableThemes, themeId } = useThemeState();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
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

  const focusTrigger = useCallback(() => {
    queueMicrotask(() => {
      triggerRef.current?.focus();
    });
  }, []);

  const closePopover = useCallback(
    ({ restoreFocus = false } = {}) => {
      setIsOpen(false);

      if (restoreFocus) {
        focusTrigger();
      }
    },
    [focusTrigger],
  );

  const updatePopoverPosition = useCallback(() => {
    const triggerElement = triggerRef.current;

    if (!triggerElement) {
      closePopover();
      return;
    }

    const nextPosition = getPopoverPosition(triggerElement);

    if (!nextPosition) {
      closePopover();
      return;
    }

    setPosition(nextPosition);
  }, [closePopover]);

  function openPopover(nextIndex = themeIndex >= 0 ? themeIndex : 0) {
    setActiveIndex(
      clamp(nextIndex, 0, Math.max(availableThemes.length - 1, 0)),
    );
    setIsOpen(true);
  }

  function selectTheme(nextThemeId: ThemeId) {
    setTheme(nextThemeId);
    closePopover({ restoreFocus: true });
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
          clamp(currentIndex + 1, 0, availableThemes.length - 1),
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((currentIndex) =>
          clamp(currentIndex - 1, 0, availableThemes.length - 1),
        );
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
        closePopover({ restoreFocus: true });
        break;
      case "Tab":
        closePopover();
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePopoverPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }

      closePopover();
    };

    const handleScrollOrResize = () => {
      updatePopoverPosition();
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    document.addEventListener("pointerdown", handlePointerDown, true);

    queueMicrotask(() => {
      listboxRef.current?.focus();
    });

    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isOpen, closePopover, updatePopoverPosition]);

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
            closePopover();
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
      {isOpen && position && typeof document !== "undefined"
        ? createPortal(
            <div
              className="theme-selector__popover"
              ref={popoverRef}
              style={{
                left: `${position.left}px`,
                minWidth: `${position.width}px`,
                top: `${position.top}px`,
              }}
            >
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
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
