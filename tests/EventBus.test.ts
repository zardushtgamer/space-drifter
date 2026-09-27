import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/EventBus';
import type { EventMap } from '../src/core/events';

describe('EventBus', () => {
  it('delivers typed payloads to subscribers', () => {
    const bus = new EventBus<EventMap>();
    const fn = vi.fn();
    bus.on('player:damaged', fn);
    bus.emit('player:damaged', { hp: 50, maxHp: 100 });
    expect(fn).toHaveBeenCalledWith({ hp: 50, maxHp: 100 });
  });

  it('emits payload-less events without arguments', () => {
    const bus = new EventBus<EventMap>();
    const fn = vi.fn();
    bus.on('game:started', fn);
    bus.emit('game:started');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('off and the returned unsubscribe both remove listeners', () => {
    const bus = new EventBus<EventMap>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('drag:end', a);
    const unsubB = bus.on('drag:end', b);
    bus.off('drag:end', a);
    unsubB();
    bus.emit('drag:end');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(bus.listenerCount()).toBe(0);
  });

  it('does not leak other events when one is emitted', () => {
    const bus = new EventBus<EventMap>();
    const fn = vi.fn();
    bus.on('boss:damaged', fn);
    bus.emit('player:damaged', { hp: 1, maxHp: 2 });
    expect(fn).not.toHaveBeenCalled();
  });

  it('allows unsubscribing during dispatch', () => {
    const bus = new EventBus<EventMap>();
    const second = vi.fn();
    const unsub = bus.on('drag:end', () => unsub());
    bus.on('drag:end', second);
    bus.emit('drag:end');
    expect(second).toHaveBeenCalledTimes(1);
    expect(bus.listenerCount('drag:end')).toBe(1);
  });

  it('rejects wrong payload types at compile time', () => {
    const bus = new EventBus<EventMap>();
    // @ts-expect-error payload shape must match the event
    bus.emit('player:damaged', { id: 1 });
    // @ts-expect-error payload required
    bus.emit('obstacle:hit');
    // @ts-expect-error unknown event
    bus.on('nope', () => {});
    expect(true).toBe(true);
  });
});
