import { describe, expect, it } from "vitest";

import { createResilientStorage, type StorageBackend } from "./storage";

class FakeBackend implements StorageBackend {
  readonly values = new Map<string, string>();
  getCalls = 0;
  setCalls = 0;
  removeCalls = 0;
  throwOnGet = false;
  throwOnSet = false;
  throwOnRemove = false;

  getItem(key: string): string | null {
    this.getCalls += 1;
    if (this.throwOnGet) throw new Error("get failed");
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls += 1;
    if (this.throwOnSet) throw new Error("set failed");
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removeCalls += 1;
    if (this.throwOnRemove) throw new Error("remove failed");
    this.values.delete(key);
  }
}

describe("page-scoped resilient storage", () => {
  it("uses memory after a resolver failure and resolves the backend only once", () => {
    let resolveCalls = 0;
    const storage = createResilientStorage(() => {
      resolveCalls += 1;
      throw new Error("storage getter failed");
    });

    expect(storage.getItem("name")).toBeNull();
    storage.setItem("name", "一時プレイヤー");
    storage.removeItem("other");
    expect(storage.getItem("name")).toBe("一時プレイヤー");
    expect(resolveCalls).toBe(1);
  });

  it("does not touch the backend again after a read failure", () => {
    const backend = new FakeBackend();
    backend.values.set("old", "keep me");
    backend.throwOnGet = true;
    const storage = createResilientStorage(() => backend);

    expect(storage.getItem("old")).toBeNull();
    storage.setItem("new", "session only");
    storage.removeItem("old");
    expect(storage.getItem("new")).toBe("session only");
    expect(backend.getCalls).toBe(1);
    expect(backend.setCalls).toBe(0);
    expect(backend.removeCalls).toBe(0);
    expect(backend.values.get("old")).toBe("keep me");
  });

  it("keeps a new value in memory when writing fails and preserves the old backend value", () => {
    const backend = new FakeBackend();
    backend.values.set("score", "old");
    const storage = createResilientStorage(() => backend);

    expect(storage.getItem("score")).toBe("old");
    backend.throwOnSet = true;
    storage.setItem("score", "new");
    storage.setItem("other", "also session only");
    expect(storage.getItem("score")).toBe("new");
    expect(storage.getItem("other")).toBe("also session only");
    expect(backend.values.get("score")).toBe("old");
    expect(backend.setCalls).toBe(1);
  });

  it("uses a tombstone when removing fails and does not retry the backend", () => {
    const backend = new FakeBackend();
    backend.values.set("name", "old");
    const storage = createResilientStorage(() => backend);

    expect(storage.getItem("name")).toBe("old");
    backend.throwOnRemove = true;
    storage.removeItem("name");
    expect(storage.getItem("name")).toBeNull();
    expect(backend.values.get("name")).toBe("old");
    expect(backend.removeCalls).toBe(1);
    storage.setItem("other", "session only");
    expect(backend.setCalls).toBe(0);
  });
});
