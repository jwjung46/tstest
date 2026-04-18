import test from "node:test";
import assert from "node:assert/strict";

import { getAnchoredOverlayPosition } from "../src/shared/ui/anchored-overlay.ts";

function withViewport({ width, height }, run) {
  const previousWindow = globalThis.window;

  globalThis.window = {
    innerWidth: width,
    innerHeight: height,
  };

  try {
    run();
  } finally {
    globalThis.window = previousWindow;
  }
}

test("anchored overlay aligns to the trigger and respects the minimum width", () => {
  withViewport({ width: 1280, height: 720 }, () => {
    const position = getAnchoredOverlayPosition({
      element: {
        getBoundingClientRect() {
          return {
            top: 80,
            left: 120,
            right: 280,
            bottom: 128,
            width: 160,
          };
        },
      },
      placement: "bottom-start",
      minWidth: 220,
      offset: 8,
      viewportPadding: 16,
    });

    assert.deepEqual(position, {
      top: 136,
      left: 120,
      width: 220,
    });
  });
});

test("anchored overlay clamps end-aligned panels inside the viewport", () => {
  withViewport({ width: 320, height: 240 }, () => {
    const position = getAnchoredOverlayPosition({
      element: {
        getBoundingClientRect() {
          return {
            top: 24,
            left: 260,
            right: 300,
            bottom: 56,
            width: 40,
          };
        },
      },
      placement: "bottom-end",
      minWidth: 220,
      offset: 8,
      viewportPadding: 16,
    });

    assert.deepEqual(position, {
      top: 64,
      left: 80,
      width: 220,
    });
  });
});

test("anchored overlay returns null when the trigger is fully outside the viewport", () => {
  withViewport({ width: 800, height: 600 }, () => {
    const position = getAnchoredOverlayPosition({
      element: {
        getBoundingClientRect() {
          return {
            top: 640,
            left: 120,
            right: 240,
            bottom: 700,
            width: 120,
          };
        },
      },
      placement: "bottom-start",
      minWidth: 220,
      offset: 8,
      viewportPadding: 16,
    });

    assert.equal(position, null);
  });
});
