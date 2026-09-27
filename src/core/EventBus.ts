export type Listener<P> = (payload: P) => void;

/** Payload-less events take no argument; others require it. */
type EmitArgs<P> = [P] extends [undefined] ? [] : [payload: P];

export class EventBus<M extends object> {
  private readonly listeners = new Map<keyof M, Set<Listener<never>>>();

  /** Subscribes and returns an unsubscribe function. */
  on<K extends keyof M>(event: K, listener: Listener<M[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => this.off(event, listener);
  }

  off<K extends keyof M>(event: K, listener: Listener<M[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(listener as Listener<never>);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof M>(event: K, ...args: EmitArgs<M[K]>): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Copy so listeners may unsubscribe during dispatch.
    for (const listener of [...set]) {
      (listener as Listener<M[K]>)(args[0] as M[K]);
    }
  }

  listenerCount(event?: keyof M): number {
    if (event !== undefined) return this.listeners.get(event)?.size ?? 0;
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }
}
