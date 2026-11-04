import { readFile } from "fs/promises";
import { dirname, resolve } from "path";

/** Resolve a local-file JSON reference, retaining its document for relative references inside it. */
export async function resolveJsonReference(
  reference: string,
  fromFile: string,
  documents: Map<string, unknown>,
): Promise<{ file: string; document: unknown; value: unknown }> {
  const [filePart, fragment = ""] = reference.split("#");
  if (/^[a-z]+:\/\//i.test(filePart)) {
    throw new Error(`Only local file references are supported: '${reference}' in ${fromFile}.`);
  }
  const file = filePart ? resolve(dirname(fromFile), filePart) : resolve(fromFile);
  let document = documents.get(file);
  if (document === undefined) {
    document = JSON.parse(await readFile(file, "utf-8"));
    documents.set(file, document);
  }
  let value: unknown = document;
  const pointer = decodeURIComponent(fragment);
  if (pointer !== "" && !pointer.startsWith("/")) {
    throw new Error(`Invalid JSON pointer in '${reference}' from ${fromFile}.`);
  }
  for (const part of pointer === "" ? [] : pointer.slice(1).split("/")) {
    const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
    value =
      value !== null && typeof value === "object"
        ? (value as Record<string, unknown>)[key]
        : undefined;
  }
  if (value === undefined) {
    throw new Error(`Cannot resolve reference '${reference}' in ${fromFile}.`);
  }
  return { file, document, value };
}
