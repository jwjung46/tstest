import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { APP_ROUTES } from "../router/paths.ts";
import { useAuthState } from "../../features/auth/model/useAuthState.ts";
import { getAuthenticatedUserSummaryDetails } from "../../features/auth/model/account-ui.ts";
import SignOutForm from "../../features/auth/ui/SignOutForm.tsx";
import { useAnchoredOverlay } from "../../shared/ui/useAnchoredOverlay.tsx";

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

  const overlay = useAnchoredOverlay({
    isOpen,
    triggerRef,
    overlayRef: menuRef,
    onDismiss: () => {
      setIsOpen(false);
    },
    placement: "bottom-end",
    minWidth: 220,
    offset: 10,
  });

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
      overlay.dismiss();
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

      {overlay.renderOverlay(
        <div
          aria-labelledby={buttonId}
          className="app-user-menu__panel"
          id={menuId}
          role="menu"
        >
          <Link
            className="app-user-menu__item"
            onClick={() => {
              overlay.dismiss();
            }}
            role="menuitem"
            to={APP_ROUTES.account}
          >
            Account
          </Link>
          <div className="app-user-menu__sign-out" role="none">
            <SignOutForm className="app-user-menu__sign-out-form" />
          </div>
        </div>,
        {
          className: "app-user-menu__popover",
        },
      )}
    </div>
  );
}
