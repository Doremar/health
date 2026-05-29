import { describe, it, expect } from "vitest";
import { fileHash } from "../src/pipeline/hash.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("fileHash", () => {
  it("returns stable SHA-256 hex string", async () => {
    const tmp = path.join(os.tmpdir(), `hashtest-${Date.now()}.txt`);
    fs.writeFileSync(tmp, "hello world");
    const h1 = await fileHash(tmp);
    const h2 = await fileHash(tmp);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    fs.unlinkSync(tmp);
  });

  it("differs for different content", async () => {
    const a = path.join(os.tmpdir(), `a-${Date.now()}.txt`);
    const b = path.join(os.tmpdir(), `b-${Date.now()}.txt`);
    fs.writeFileSync(a, "aaa");
    fs.writeFileSync(b, "bbb");
    expect(await fileHash(a)).not.toBe(await fileHash(b));
    fs.unlinkSync(a);
    fs.unlinkSync(b);
  });
});
