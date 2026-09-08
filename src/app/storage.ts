/**
 * A small, page-scoped wrapper around Web Storage.
 *
 * Browsers can throw while resolving localStorage or while reading/writing it
 * (private browsing, disabled storage, a full quota, and embedded contexts are
 * common examples). Once that happens the backend is permanently abandoned for
 * this page. Values are kept in memory so a run can continue without retrying a
 * broken persistence layer or overwriting an older record after a failed read.
 */

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}
export interface ResilientStorage extends StorageBackend {
  removeItem(key: string): void;
}

export type StorageResolver = () => StorageBackend | null;

function resolveBrowserStorage(): StorageBackend | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createResilientStorage(
  resolve: StorageResolver = resolveBrowserStorage,
): ResilientStorage {
  const memory = new Map<string, string | null>();
  let backend: StorageBackend | null = null;
  let backendResolved = false;

  const disableBackend = (): void => {
    backend = null;
    backendResolved = true;
  };

  const getBackend = (): StorageBackend | null => {
    if (backendResolved) return backend;
    backendResolved = true;
    try {
      backend = resolve();
    } catch {
      backend = null;
    }
    return backend;
  };

  return {
    getItem(key: string): string | null {
      const source = getBackend();
      if (!source) return memory.get(key) ?? null;
      try {
        const value = source.getItem(key);
        memory.set(key, value);
        return value;
      } catch {
        const cached = memory.get(key) ?? null;
        disableBackend();
        return cached;
      }
    },

    setItem(key: string, value: string): void {
      // Update the session view first. If a backend mutates and then throws,
      // retouching it is unsafe; the in-memory value remains authoritative.
      memory.set(key, value);
      const source = getBackend();
      if (!source) return;
      try {
        source.setItem(key, value);
      } catch {
        disableBackend();
      }
    },

    removeItem(key: string): void {
      // A tombstone prevents a failed remove from falling back to an old
      // backend value during the same page lifetime.
      memory.set(key, null);
      const source = getBackend();
      if (!source) return;
      try {
        if (!source.removeItem) throw new Error("removeItem unavailable");
        source.removeItem(key);
      } catch {
        disableBackend();
      }
    },
  };
}
