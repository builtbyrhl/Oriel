// Oriel Spin mechanism — pure geometry & motion tests (node:test, run with tsx).
//
// The SpinOrbit reads transforms directly off these pure functions each frame;
// these tests pin the invariants the component relies on: the apex card is
// always the pick, layouts are deterministic, and selection eases a specific
// card to the centre.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  alignPhase,
  cardLayout,
  easeOutCubic,
  formatRuntime,
  formatSpinMetadata,
  nextIndex,
  normalizeDeg,
  pickIndex,
  prevIndex,
  shouldAutoRotate,
  slotDiff,
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
