import { AsyncLocalStorage } from 'node:async_hooks';

interface RenderContext {
  cols: number;
}

const storage = new AsyncLocalStorage<RenderContext>();

export function withRenderContext<T>(ctx: RenderContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function currentCols(): number {
  return storage.getStore()?.cols ?? 80;
}

export function isNarrow(): boolean {
  return currentCols() <= 40;
}
