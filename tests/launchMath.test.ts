import { describe, expect, it } from 'vitest';
import { clampLength, computeLaunch, dragVector } from '../src/core/launchMath';

const p = { maxDrag: 100, forceScale: 0.1, maxSpeed: 20 };
const zero = { x: 0, y: 0 };

describe('launch math', () => {
  it('clampLength leaves short vectors and zero untouched', () => {
    expect(clampLength({ x: 3, y: 4 }, 10)).toEqual({ x: 3, y: 4 });
    expect(clampLength(zero, 10)).toEqual(zero);
  });

  it('clampLength scales long vectors to max, keeping direction', () => {
    const v = clampLength({ x: 30, y: 40 }, 10);
    expect(v.x).toBeCloseTo(6);
    expect(v.y).toBeCloseTo(8);
  });

  it('drag vector is release - start, clamped to maxDrag', () => {
    expect(dragVector({ x: 10, y: 10 }, { x: 40, y: 50 }, 100)).toEqual({ x: 30, y: 40 });
    const d = dragVector(zero, { x: 0, y: 500 }, 100);
    expect(d).toEqual({ x: 0, y: 100 });
  });

  it('launches in the drag direction scaled by forceScale', () => {
    const r = computeLaunch(zero, zero, { x: 50, y: 0 }, p);
    expect(r.velocity.x).toBeCloseTo(5);
    expect(r.velocity.y).toBeCloseTo(0);
    expect(r.force).toBeCloseTo(0.5);
  });

  it('caps force at 1 for over-long drags', () => {
    const r = computeLaunch(zero, zero, { x: 0, y: -1000 }, p);
    expect(r.force).toBeCloseTo(1);
    expect(r.velocity.y).toBeCloseTo(-10);
  });

  it('adds to current velocity then clamps total speed', () => {
    const r = computeLaunch({ x: 15, y: 0 }, zero, { x: 100, y: 0 }, p);
    expect(r.velocity.x).toBeCloseTo(20);
  });

  it('zero-length drag keeps current velocity and zero force', () => {
    const r = computeLaunch({ x: 1, y: 2 }, { x: 5, y: 5 }, { x: 5, y: 5 }, p);
    expect(r.velocity).toEqual({ x: 1, y: 2 });
    expect(r.force).toBe(0);
  });
});
