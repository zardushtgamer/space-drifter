import { describe, expect, it, vi } from 'vitest';
import { GameStateMachine } from '../src/core/GameStateMachine';

describe('GameStateMachine', () => {
  it('starts in menu', () => {
    expect(new GameStateMachine().state).toBe('menu');
  });

  it('follows the legal path menu -> playing -> won -> playing -> lost', () => {
    const m = new GameStateMachine();
    expect(m.transition('playing')).toBe(true);
    expect(m.transition('won')).toBe(true);
    expect(m.transition('playing')).toBe(true);
    expect(m.transition('lost')).toBe(true);
    expect(m.state).toBe('lost');
  });

  it('rejects illegal transitions', () => {
    const m = new GameStateMachine();
    expect(m.transition('won')).toBe(false);
    expect(m.transition('menu')).toBe(false);
    m.transition('playing');
    expect(m.transition('playing')).toBe(false);
    m.transition('lost');
    expect(m.transition('won')).toBe(false);
    expect(m.state).toBe('lost');
  });

  it('notifies listeners with to/from and supports unsubscribe', () => {
    const m = new GameStateMachine();
    const fn = vi.fn();
    const unsub = m.onChange(fn);
    m.transition('playing');
    expect(fn).toHaveBeenCalledWith('playing', 'menu');
    unsub();
    m.transition('won');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not notify on rejected transitions', () => {
    const m = new GameStateMachine();
    const fn = vi.fn();
    m.onChange(fn);
    m.transition('lost');
    expect(fn).not.toHaveBeenCalled();
  });
});
