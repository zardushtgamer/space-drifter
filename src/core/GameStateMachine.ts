export type GameState = 'menu' | 'playing' | 'won' | 'lost';

const TRANSITIONS: Readonly<Record<GameState, readonly GameState[]>> = {
  menu: ['playing'],
  playing: ['won', 'lost'],
  won: ['playing'],
  lost: ['playing'],
};

export type StateListener = (to: GameState, from: GameState) => void;

export class GameStateMachine {
  private current: GameState = 'menu';
  private readonly listeners = new Set<StateListener>();

  get state(): GameState {
    return this.current;
  }

  is(state: GameState): boolean {
    return this.current === state;
  }

  canTransition(to: GameState): boolean {
    return TRANSITIONS[this.current].includes(to);
  }

  /** Returns false (and does nothing) for an illegal transition. */
  transition(to: GameState): boolean {
    if (!this.canTransition(to)) return false;
    const from = this.current;
    this.current = to;
    for (const l of [...this.listeners]) l(to, from);
    return true;
  }

  onChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.listeners.clear();
  }
}
