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
import { Link } from "react-router-dom";
import { APP_ROUTES } from "../router/paths.ts";
import { useAuthState } from "../../features/auth/model/useAuthState.ts";
import { getAuthenticatedUserSummaryDetails } from "../../features/auth/model/account-ui.ts";
import SignOutForm from "../../features/auth/ui/SignOutForm.tsx";

type PopoverPosition = {
  top: number;
  right: number;
  width: number;
};

const popoverOffset = 10;
const viewportPadding = 16;
const minimumPopoverWidth = 220;

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

  const width = Math.max(rect.width, minimumPopoverWidth);
  const clampedLeft = clamp(
    rect.right - width,
    viewportPadding,
    Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
  );

  return {
    top: clamp(
      rect.bottom + popoverOffset,
      viewportPadding,
      Math.max(viewportPadding, window.innerHeight - viewportPadding),
    ),
    right: Math.max(viewportPadding, window.innerWidth - clampedLeft - width),
    width,
  };
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppUserMenu() {
  const authState = useAuthState();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const buttonId = useId();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const summary = useMemo(() => {
    if (authState.status !== "authenticated") {
      return null;
    }

    return getAuthenticatedUserSummaryDetails(authState.user);
  }, [authState]);

  const focusTrigger = useCallback(() => {
    queueMicrotask(() => {
      triggerRef.current?.focus();
    });
  }, []);

  const closeMenu = useCallback(
    ({ restoreFocus = false } = {}) => {
      setIsOpen(false);
      setPosition(null);

      if (restoreFocus) {
        focusTrigger();
      }
    },
    [focusTrigger],
  );

  const updateMenuPosition = useCallback(() => {
    const triggerElement = triggerRef.current;

    if (!triggerElement) {
      closeMenu();
      return;
    }

    const nextPosition = getPopoverPosition(triggerElement);

    if (!nextPosition) {
      closeMenu();
      return;
    }

    setPosition(nextPosition);
  }, [closeMenu]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      closeMenu();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      closeMenu({ restoreFocus: true });
    };

    const handleScrollOrResize = () => {
      updateMenuPosition();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen, closeMenu, updateMenuPosition]);

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      setIsOpen(true);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="app-user-menu">
      <button
        ref={triggerRef}
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="app-user-menu__trigger"
        id={buttonId}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
        type="button"
      >
        <span aria-hidden="true" className="app-user-menu__avatar">
          {getInitials(summary.name)}
        </span>
        <span className="app-user-menu__copy">
          <strong className="app-user-menu__name">{summary.name}</strong>
        </span>
      </button>

      {isOpen && position && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-labelledby={buttonId}
              className="app-user-menu__popover"
              id={menuId}
              ref={menuRef}
              role="menu"
              style={{
                minWidth: `${position.width}px`,
                right: `${position.right}px`,
                top: `${position.top}px`,
              }}
            >
              <div className="app-user-menu__panel">
                <Link
                  className="app-user-menu__item"
                  onClick={() => {
                    closeMenu();
                  }}
                  role="menuitem"
                  to={APP_ROUTES.account}
                >
                  Account
                </Link>
                <Link
                  className="app-user-menu__item"
                  onClick={() => {
                    closeMenu();
                  }}
                  role="menuitem"
                  to={APP_ROUTES.subscription}
                >
                  Subscription
                </Link>
                <div className="app-user-menu__sign-out" role="none">
                  <SignOutForm className="app-user-menu__sign-out-form" />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
