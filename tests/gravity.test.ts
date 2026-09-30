import { describe, expect, it } from 'vitest';
import { accelFromWells, type Well } from '../src/systems/GravitySystem';

const well = (x: number, y: number, radius: number, reach: number, strength: number): Well =>
  ({ pos: { x, y }, radius, reach, strength, blackHole: false, rift: false, entity: null }) as unknown as Well;

describe('accelFromWells (shared by gravity and trajectory prediction)', () => {
  it('pulls toward the well at full strength at its surface', () => {
    const a = accelFromWells({ x: 100, y: 0 }, [well(0, 0, 100, 400, 0.3)]);
    expect(a.x).toBeCloseTo(-0.3);
    expect(a.y).toBeCloseTo(0);
  });

  it('fades to nothing at the edge of reach', () => {
    const a = accelFromWells({ x: 0, y: 400 }, [well(0, 0, 100, 400, 0.3)]);
    expect(a).toEqual({ x: 0, y: 0 });
  });

  it('pushes away for negative strength (repulsors)', () => {
    const a = accelFromWells({ x: 150, y: 0 }, [well(0, 0, 100, 400, -0.3)]);
    expect(a.x).toBeGreaterThan(0);
  });
});
