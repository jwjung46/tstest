type OverlayPlacement = "bottom-start" | "bottom-end";

export type AnchoredOverlayPosition = {
  top: number;
  left: number;
  width: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getAnchoredOverlayPosition(input: {
  element: Pick<HTMLElement, "getBoundingClientRect">;
  placement: OverlayPlacement;
  minWidth: number;
  offset: number;
  viewportPadding: number;
}): AnchoredOverlayPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rect = input.element.getBoundingClientRect();

  if (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth
  ) {
    return null;
  }

  const width = Math.max(rect.width, input.minWidth);
  const unclampedLeft =
    input.placement === "bottom-end" ? rect.right - width : rect.left;
  const left = clamp(
    unclampedLeft,
    input.viewportPadding,
    Math.max(
      input.viewportPadding,
      window.innerWidth - width - input.viewportPadding,
    ),
  );
  const top = clamp(
    rect.bottom + input.offset,
    input.viewportPadding,
    Math.max(input.viewportPadding, window.innerHeight - input.viewportPadding),
  );

  return {
    top,
    left,
    width,
  };
}

export type { OverlayPlacement };
