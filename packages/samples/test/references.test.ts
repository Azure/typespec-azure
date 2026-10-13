import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { it } from "vitest";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

it("resolves local references in ARM sample snapshots and their common types", async () => {
  const documents = new Map<string, JsonValue>();
  const visited = new Set<string>();

  async function loadDocument(path: string): Promise<JsonValue> {
    if (!documents.has(path)) {
      documents.set(path, JSON.parse(await readFile(path, "utf8")));
    }
    return documents.get(path)!;
  }

  async function checkDocument(path: string): Promise<void> {
    if (visited.has(path)) return;
    visited.add(path);

    const pending = [await loadDocument(path)];
    while (pending.length > 0) {
      const value = pending.pop();
      if (value === null || typeof value !== "object") continue;
      pending.push(...Object.values(value));
      if (!("$ref" in value) || typeof value.$ref !== "string") continue;

      const reference = new URL(value.$ref, pathToFileURL(path));
      if (reference.protocol !== "file:") continue;

      const targetPath = fileURLToPath(reference);
      let target = await loadDocument(targetPath);
      const fragment = decodeURIComponent(reference.hash.slice(1));
      if (fragment !== "") {
        assert(fragment.startsWith("/"), `Unsupported JSON pointer ${value.$ref} in ${path}`);
        for (const part of fragment.slice(1).split("/")) {
          const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
          assert(
            target !== null && typeof target === "object" && Object.hasOwn(target, key),
            `Unresolved reference ${value.$ref} in ${path}`,
          );
          target = Reflect.get(target, key);
        }
      }
      await checkDocument(targetPath);
    }
  }

  async function checkDirectory(path: string): Promise<void> {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const entryPath = resolve(path, entry.name);
      if (entry.isDirectory()) {
        await checkDirectory(entryPath);
      } else if (entry.name.endsWith(".json")) {
        await checkDocument(entryPath);
      }
    }
  }

  await checkDirectory(fileURLToPath(new URL("./output/azure/resource-manager/", import.meta.url)));
  assert(visited.size > 0, "Expected ARM sample snapshots to validate");
});
