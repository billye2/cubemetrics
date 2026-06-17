// Node 22+ (we're on 26) registers a global `localStorage` getter that throws/
// returns undefined unless `--localstorage-file` is passed, and — because it's a
// non-configurable-looking global on `globalThis` — happy-dom can't install its
// own Window localStorage over it. So in DOM test environments bare `localStorage`
// reads as undefined. Install a minimal in-memory Storage shim instead. No-op
// under the default `node` environment (no `window`).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

if (typeof window !== "undefined" && !window.localStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}
