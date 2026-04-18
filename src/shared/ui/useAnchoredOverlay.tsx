import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  getAnchoredOverlayPosition,
  type AnchoredOverlayPosition as OverlayPosition,
  type OverlayPlacement,
} from "./anchored-overlay.ts";

type DismissOptions = {
  restoreFocus?: boolean;
};

type RenderOptions = {
  className: string;
};

type UseAnchoredOverlayOptions = {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  placement?: OverlayPlacement;
  minWidth?: number;
  offset?: number;
  viewportPadding?: number;
};

export function useAnchoredOverlay({
  isOpen,
  triggerRef,
  overlayRef,
  initialFocusRef,
  onDismiss,
  placement = "bottom-start",
  minWidth = 220,
  offset = 8,
  viewportPadding = 16,
}: UseAnchoredOverlayOptions) {
  const [position, setPosition] = useState<OverlayPosition | null>(null);

  const focusTrigger = useCallback(() => {
    queueMicrotask(() => {
      triggerRef.current?.focus();
    });
  }, [triggerRef]);

  const dismiss = useCallback(
    ({ restoreFocus = false }: DismissOptions = {}) => {
      onDismiss();
      setPosition(null);

      if (restoreFocus) {
        focusTrigger();
      }
    },
    [focusTrigger, onDismiss],
  );

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;

    if (!triggerElement) {
      dismiss();
      return;
    }

    const nextPosition = getAnchoredOverlayPosition({
      element: triggerElement,
      placement,
      minWidth,
      offset,
      viewportPadding,
    });

    if (!nextPosition) {
      dismiss();
      return;
    }

    setPosition(nextPosition);
  }, [dismiss, minWidth, offset, placement, triggerRef, viewportPadding]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        overlayRef.current?.contains(target)
      ) {
        return;
      }

      dismiss();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      dismiss({ restoreFocus: true });
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    queueMicrotask(() => {
      initialFocusRef?.current?.focus();
    });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [
    dismiss,
    initialFocusRef,
    isOpen,
    overlayRef,
    triggerRef,
    updatePosition,
  ]);

  const overlayStyle = useMemo(() => {
    if (!position) {
      return null;
    }

    return {
      left: `${position.left}px`,
      minWidth: `${position.width}px`,
      top: `${position.top}px`,
    };
  }, [position]);

  const renderOverlay = useCallback(
    (children: ReactNode, options: RenderOptions) => {
      if (!isOpen || !overlayStyle || typeof document === "undefined") {
        return null;
      }

      return createPortal(
        <div
          className={options.className}
          ref={overlayRef}
          style={overlayStyle}
        >
          {children}
        </div>,
        document.body,
      );
    },
    [isOpen, overlayRef, overlayStyle],
  );

  return {
    dismiss,
    renderOverlay,
    updatePosition,
  };
}
