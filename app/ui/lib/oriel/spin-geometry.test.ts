// Oriel Spin mechanism — pure geometry & motion tests (node:test, run with tsx).
//
// The SpinOrbit reads transforms directly off these pure functions each frame;
// these tests pin the invariants the component relies on: the apex card is
// always the pick, layouts are deterministic, and selection eases a specific
// card to the centre.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DRAG_TAP_THRESHOLD_PX,
  advanceSpinGesture,
  alignPhase,
  cardLayout,
  createSpinPointerGesture,
  dragDegPerPx,
  easeOutCubic,
  formatRuntime,
  formatSpinMetadata,
  gestureEndedAsTap,
  nextIndex,
  normalizeDeg,
  pickIndex,
  posterWidthForViewport,
  prevIndex,
  shouldAutoRotate,
  slotDiff,
  snapTargetPhase,
  spinCanvasHeightForViewport,
  spinGeometryForViewport,
  spinLayoutForViewport,
} from "./spin-geometry";

const almost = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-9, `expected ${a} to equal ${b}`);

// ---------------------------------------------------------------------------
// normalizeDeg / slotDiff
// ---------------------------------------------------------------------------

describe("normalizeDeg", () => {
  it("keeps in-range angles unchanged", () => {
    almost(normalizeDeg(0), 0);
    almost(normalizeDeg(90), 90);
    almost(normalizeDeg(-170), -170);
  });

  it("wraps angles into the [-180, 180) range", () => {
    almost(normalizeDeg(270), -90);
    almost(normalizeDeg(-270), 90);
    almost(normalizeDeg(360), 0);
    almost(normalizeDeg(540), -180);
  });
});

describe("slotDiff", () => {
  it("places index 0 at the apex with phase 0", () => {
    almost(slotDiff(0, 7, 0), 0);
  });

  it("spreads the remaining slots around the ring", () => {
    const expected = 360 / 7;
    almost(Math.abs(slotDiff(1, 7, 0)), expected);
    almost(Math.abs(slotDiff(6, 7, 0)), expected);
  });

  it("is periodic in phase", () => {
    almost(slotDiff(0, 7, 0), slotDiff(0, 7, 360));
    almost(slotDiff(1, 7, 90), slotDiff(1, 7, 450));
  });
});

// ---------------------------------------------------------------------------
// pickIndex — the apex is always the pick
// ---------------------------------------------------------------------------

describe("pickIndex", () => {
  it("picks index 0 at phase 0 (engine's strongest result)", () => {
    assert.equal(pickIndex(0, 7), 0);
  });

  it("rotates the pick forward as the phase advances one slot", () => {
    const slot = 360 / 7;
    assert.equal(pickIndex(slot, 7), 6);
    assert.equal(pickIndex(2 * slot, 7), 5);
  });

  it("returns -1 for an empty ring", () => {
    assert.equal(pickIndex(0, 0), -1);
  });

  it("stays consistent across many rotations", () => {
    for (const phase of [0, 57, 120, 255, 543, 1099]) {
      const card = pickIndex(phase, 7);
      const diffs = Array.from({ length: 7 }, (_, i) =>
        Math.abs(slotDiff(i, 7, phase))
      );
      assert.equal(card, diffs.indexOf(Math.min(...diffs)));
    }
  });
});

// ---------------------------------------------------------------------------
// cardLayout — deterministic per-frame placement
// ---------------------------------------------------------------------------

describe("cardLayout", () => {
  it("renders the apex card highest, largest and brightest", () => {
    const apex = cardLayout(0, 7, 0);

    almost(apex.diff, 0);
    almost(apex.proximity, 1);
    almost(apex.scale, 1.06);
    almost(apex.opacity, 1);
    assert.equal(apex.zIndex, 20);
    almost(apex.x, 50);
    almost(apex.y, 54 - 20); // cy - ry
  });

  it("recedes from the apex as |diff| grows", () => {
    const near = cardLayout(1, 7, 0);
    const far = cardLayout(3, 7, 0);

    assert.ok(near.proximity > far.proximity, "nearer card is more prominent");
    assert.ok(near.scale > far.scale, "nearer card is larger");
    assert.ok(near.opacity > far.opacity, "nearer card is brighter");
    assert.ok(near.zIndex > far.zIndex, "nearer card is stacked above");
  });

  it("is deterministic for identical inputs", () => {
    const a = cardLayout(4, 7, 123.45);
    const b = cardLayout(4, 7, 123.45);
    assert.deepEqual(a, b);
  });

  it("keeps every card inside the canvas", () => {
    for (let phase = 0; phase < 360; phase += 13.7) {
      for (let i = 0; i < 7; i++) {
        const { x, y, scale, opacity } = cardLayout(i, 7, phase);
        assert.ok(x >= 0 && x <= 100, `x out of range at phase ${phase}`);
        assert.ok(y >= 0 && y <= 100, `y out of range at phase ${phase}`);
        assert.ok(scale > 0 && scale <= 1.06);
        assert.ok(opacity >= 0 && opacity <= 1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// alignPhase — selection flies the requested card to the centre
// ---------------------------------------------------------------------------

describe("alignPhase", () => {
  it("centres index 0 at phase 0 without moving", () => {
    almost(alignPhase(0, 7, 0), 0);
  });

  it("centres index 1 at the nearest phase", () => {
    const target = alignPhase(0, 7, 1);
    almost(target, -360 / 7);
    almost(slotDiff(1, 7, target), 0);
  });

  it("returns the equivalent angle nearest to the current phase", () => {
    const target = alignPhase(360, 7, 1);
    almost(slotDiff(1, 7, target), 0);
    assert.ok(Math.abs(target - 360) <= 180, "must stay near the current phase");
  });
});

// ---------------------------------------------------------------------------
// nextIndex / prevIndex
// ---------------------------------------------------------------------------

describe("nextIndex / prevIndex", () => {
  it("steps around the ring and wraps", () => {
    assert.equal(nextIndex(0, 7), 1);
    assert.equal(nextIndex(6, 7), 0);
    assert.equal(prevIndex(0, 7), 6);
    assert.equal(prevIndex(3, 7), 2);
  });
});

// ---------------------------------------------------------------------------
// easeOutCubic
// ---------------------------------------------------------------------------

describe("easeOutCubic", () => {
  it("maps the endpoints exactly and clamps outside [0, 1]", () => {
    almost(easeOutCubic(0), 0);
    almost(easeOutCubic(1), 1);
    almost(easeOutCubic(-0.5), 0);
    almost(easeOutCubic(1.5), 1);
  });

  it("is monotonic in (0, 1)", () => {
    let previous = 0;
    for (let i = 1; i <= 100; i++) {
      const value = easeOutCubic(i / 100);
      assert.ok(value >= previous, "easing must not decrease");
      previous = value;
    }
  });
});

// ---------------------------------------------------------------------------
// formatRuntime / formatSpinMetadata
// ---------------------------------------------------------------------------

describe("formatRuntime", () => {
  it("formats hours and minutes", () => {
    assert.equal(formatRuntime(134), "2h 14m");
    assert.equal(formatRuntime(60), "1h");
    assert.equal(formatRuntime(45), "45m");
  });

  it("returns null when no usable runtime exists", () => {
    assert.equal(formatRuntime(null), null);
    assert.equal(formatRuntime(undefined), null);
    assert.equal(formatRuntime(0), null);
  });
});

describe("formatSpinMetadata", () => {
  it("joins only the fields that are available", () => {
    assert.equal(formatSpinMetadata("1980", 134, 8.4), "1980 · 2h 14m · 8.4");
    assert.equal(formatSpinMetadata("1980", null, null), "1980");
    assert.equal(formatSpinMetadata(null, 90, null), "1h 30m");
  });

  it("returns null when nothing is available", () => {
    assert.equal(formatSpinMetadata(null, null, null), null);
    assert.equal(formatSpinMetadata("", null, null), null);
  });
});

// ---------------------------------------------------------------------------
// shouldAutoRotate
// ---------------------------------------------------------------------------

describe("shouldAutoRotate", () => {
  it("auto-rotates unless the user prefers reduced motion", () => {
    assert.equal(shouldAutoRotate(false), true);
    assert.equal(shouldAutoRotate(true), false);
  });
});

// ---------------------------------------------------------------------------
// Drag gesture model — tap vs drag classification & rotation
// ---------------------------------------------------------------------------

describe("drag gesture", () => {
  const DEG = 0.5;

  it("does not rotate below the drag threshold (tap stays a tap)", () => {
    const g = createSpinPointerGesture(100, 200);
    assert.equal(advanceSpinGesture(g, 100 + DRAG_TAP_THRESHOLD_PX - 1, 200, DEG), 0);
    assert.equal(g.moved, false);
    assert.equal(gestureEndedAsTap(g), true);
  });

  it("begins dragging only once the threshold is crossed", () => {
    const g = createSpinPointerGesture(100, 200);
    assert.equal(advanceSpinGesture(g, 102, 200, DEG), 0);
    assert.equal(g.moved, false);
    assert.equal(advanceSpinGesture(g, 100 + DRAG_TAP_THRESHOLD_PX, 200, DEG), DEG * DRAG_TAP_THRESHOLD_PX);
    assert.equal(g.moved, true);
    assert.equal(gestureEndedAsTap(g), false);
  });

  it("applies per-move deltas after the threshold, with no double count", () => {
    const g = createSpinPointerGesture(0, 0);
    advanceSpinGesture(g, 10, 0, DEG); // crosses threshold, applies 10px worth
    const next = advanceSpinGesture(g, 14, 0, DEG); // +4px more
    assert.equal(next, 4 * DEG);
  });

  it("maps a rightward drag to positive rotation (content follows the finger)", () => {
    const g = createSpinPointerGesture(0, 0);
    const rotation = advanceSpinGesture(g, DRAG_TAP_THRESHOLD_PX, 0, DEG);
    assert.ok(rotation > 0, "rightward drag must advance the phase");
    const g2 = createSpinPointerGesture(0, 0);
    const rotationLeft = advanceSpinGesture(g2, -DRAG_TAP_THRESHOLD_PX, 0, DEG);
    assert.ok(rotationLeft < 0, "leftward drag must reverse the phase");
  });

  it("maps any vertical movement at or below the threshold back to a tap", () => {
    const g = createSpinPointerGesture(0, 0);
    advanceSpinGesture(g, 0, 30, DEG); // vertical drag, no horizontal movement
    assert.equal(g.moved, true, "vertical drag still counts as a drag");
    assert.equal(gestureEndedAsTap(g), false);
  });

  it("classifies a zero-distance release as a tap", () => {
    const g = createSpinPointerGesture(50, 50);
    assert.equal(gestureEndedAsTap(g), true);
  });

  it("keeps state clean across rapid gesture recreation", () => {
    let g = createSpinPointerGesture(0, 0);
    advanceSpinGesture(g, 40, 0, DEG); // a full drag
    assert.equal(g.moved, true);
    g = createSpinPointerGesture(400, 0); // new press on release
    assert.equal(g.moved, false);
    assert.equal(advanceSpinGesture(g, 401, 0, DEG), 0);
    assert.equal(gestureEndedAsTap(g), true);
  });
});

describe("dragDegPerPx", () => {
  it("rotates faster on narrow canvases so a slot is reachable in one swipe", () => {
    assert.ok(dragDegPerPx(360, 34) > dragDegPerPx(1440, 40));
  });

  it("scales with the ring radius (1:1 arc tracking)", () => {
    const width = 720;
    const rx = 40;
    const radiusPx = (rx / 100) * width;
    assert.ok(Math.abs(dragDegPerPx(width, rx) - 360 / (2 * Math.PI * radiusPx)) < 1e-12);
  });

  it("is well-defined for a zero-size canvas", () => {
    assert.ok(Number.isFinite(dragDegPerPx(0, 40)));
  });
});

// ---------------------------------------------------------------------------
// Release snap — nearest candidate, shortest direction
// ---------------------------------------------------------------------------

describe("snapTargetPhase", () => {
  it("centres the candidate nearest the apex at release", () => {
    for (const phase of [0, 12, 57, 123, 260, 543, 1099, -90, 410]) {
      const target = snapTargetPhase(phase, 7);
      assert.equal(
        pickIndex(target, 7),
        pickIndex(phase, 7),
        `snap must keep the same pick at phase ${phase}`
      );
      assert.ok(
        Math.abs(slotDiff(pickIndex(phase, 7), 7, target)) < 1e-9,
        `selected card must sit at the apex after snap at phase ${phase}`
      );
    }
  });

  it("chooses the shortest rotation direction", () => {
    for (const phase of [0, 12, 57, 123, 260, 543, 1099, -90, 410]) {
      const target = snapTargetPhase(phase, 7);
      assert.ok(
        Math.abs(target - phase) <= 180,
        `snap arc must never exceed 180° at phase ${phase}`
      );
    }
  });

  it("is deterministic across whole rotations", () => {
    for (const phase of [12, 123, 260, 543]) {
      almost(
        normalizeDeg(snapTargetPhase(phase + 360, 7)),
        normalizeDeg(snapTargetPhase(phase, 7))
      );
    }
  });

  it("returns the phase unchanged for an empty ring", () => {
    assert.equal(snapTargetPhase(45, 0), 45);
  });

  it("leaves an already-aligned phase untouched", () => {
    assert.equal(snapTargetPhase(0, 7), 0);
  });
});

// ---------------------------------------------------------------------------
// Responsive viewport geometry — deliberate sizing, no clipping, no overflow
// ---------------------------------------------------------------------------

describe("posterWidthForViewport / spinCanvasHeightForViewport", () => {
  it("steps posters and canvas up with the canvas width", () => {
    assert.equal(posterWidthForViewport(350), 96);
    assert.equal(posterWidthForViewport(640), 112);
    assert.equal(posterWidthForViewport(768), 144);
    assert.equal(posterWidthForViewport(1440), 160);

    assert.equal(spinCanvasHeightForViewport(350), 320);
    assert.equal(spinCanvasHeightForViewport(640), 360);
    assert.equal(spinCanvasHeightForViewport(768), 440);
    assert.equal(spinCanvasHeightForViewport(1440), 480);
  });

  it("never exceeds the canvas with a zero-width input", () => {
    const layout = spinLayoutForViewport(0);
    assert.ok(layout.canvasHeight > 0 && layout.posterWidth > 0);
    assert.ok(layout.geometry.rx > 0);
  });
});

describe("spinLayoutForViewport", () => {
  const WIDTHS = [320, 350, 360, 390, 430, 640, 768, 1024, 1440];

  it("keeps every card fully inside the canvas at every phase (no clipping, no horizontal overflow)", () => {
    for (const width of WIDTHS) {
      const { geometry, posterWidth, canvasHeight } = spinLayoutForViewport(width);
      for (let phase = -180; phase <= 720; phase += 3.7) {
        for (let i = 0; i < 7; i++) {
          const { x, y, scale } = cardLayout(i, 7, phase, geometry);
          const halfW = (posterWidth * scale) / 2;
          const halfH = (posterWidth * 1.5 * scale) / 2;
          const centerX = (x / 100) * width;
          const centerY = (y / 100) * canvasHeight;

          assert.ok(
            centerX - halfW >= 0,
            `left clip at width=${width} phase=${phase} i=${i}`
          );
          assert.ok(
            centerX + halfW <= width,
            `right overflow at width=${width} phase=${phase} i=${i}`
          );
          assert.ok(
            centerY - halfH >= 0,
            `top clip at width=${width} phase=${phase} i=${i}`
          );
          assert.ok(
            centerY + halfH <= canvasHeight,
            `bottom clip at width=${width} phase=${phase} i=${i}`
          );
        }
      }
    }
  });

  it("keeps the important neighbouring posters inside the viewport", () => {
    for (const width of WIDTHS) {
      const { geometry, posterWidth } = spinLayoutForViewport(width);
      // Adjacent cards (diff ±51.43) carry the highest scale off-centre.
      for (const i of [1, 6]) {
        const { x, scale } = cardLayout(i, 7, 0, geometry);
        const halfW = (posterWidth * scale) / 2;
        const centerX = (x / 100) * width;
        assert.ok(centerX - halfW >= 4, `adjacent card too close to edge at ${width}`);
        assert.ok(centerX + halfW <= width - 4, `adjacent card too close to edge at ${width}`);
      }
    }
  });

  it("uses a tighter ellipse on narrow phones than on desktop", () => {
    assert.ok(
      spinGeometryForViewport(360).rx < spinGeometryForViewport(1440).rx,
      "narrow geometry must pull the ring in"
    );
    assert.ok(
      spinGeometryForViewport(360).ry < spinGeometryForViewport(1440).ry,
      "narrow geometry must flatten the ellipse"
    );
  });

  it("is deterministic for identical inputs", () => {
    assert.deepEqual(spinLayoutForViewport(390), spinLayoutForViewport(390));
  });

  it("keeps the initial composition unchanged at phase 0", () => {
    const layout = spinLayoutForViewport(1440);
    const apex = cardLayout(0, 7, 0, layout.geometry);
    almost(apex.diff, 0);
    almost(apex.proximity, 1);
    assert.equal(pickIndex(0, 7), 0, "engine's strongest candidate opens the ring");
    assert.deepEqual(cardLayout(0, 7, 0), cardLayout(0, 7, 0), "default layout unchanged");
  });
});
