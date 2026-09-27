import type { IDisposable } from './types';

export type ResizeListener = (width: number, height: number) => void;

/** Tracks window size (CSS px). World coordinates equal CSS px. */
export class Viewport implements IDisposable {
  private readonly listeners = new Set<ResizeListener>();

  constructor(private readonly win: Window) {
    win.addEventListener('resize', this.handleResize);
  }

  get width(): number {
    return this.win.innerWidth;
  }

  get height(): number {
    return this.win.innerHeight;
  }

  /** Subscribes and immediately calls with the current size. */
  onResize(listener: ResizeListener): () => void {
    this.listeners.add(listener);
    listener(this.width, this.height);
    return () => this.listeners.delete(listener);
  }

  private handleResize = (): void => {
    for (const l of [...this.listeners]) l(this.width, this.height);
  };

  dispose(): void {
    this.win.removeEventListener('resize', this.handleResize);
    this.listeners.clear();
  }
}
