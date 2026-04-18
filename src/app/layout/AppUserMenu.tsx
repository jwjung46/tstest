import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import { APP_ROUTES } from "../router/paths.ts";
import { useAuthState } from "../../features/auth/model/useAuthState.ts";
import { getAuthenticatedUserSummaryDetails } from "../../features/auth/model/account-ui.ts";
import SignOutForm from "../../features/auth/ui/SignOutForm.tsx";

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

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

      setIsOpen(false);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setIsOpen(false);
      queueMicrotask(() => {
        triggerRef.current?.focus();
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
      setIsOpen(false);
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

      {isOpen ? (
        <div
          aria-labelledby={buttonId}
          className="app-user-menu__popover"
          id={menuId}
          ref={menuRef}
          role="menu"
        >
          <div className="app-user-menu__panel">
            <Link
              className="app-user-menu__item"
              onClick={() => {
                setIsOpen(false);
              }}
              role="menuitem"
              to={APP_ROUTES.account}
            >
              Account
            </Link>
            <Link
              className="app-user-menu__item"
              onClick={() => {
                setIsOpen(false);
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
        </div>
      ) : null}
    </div>
  );
}
