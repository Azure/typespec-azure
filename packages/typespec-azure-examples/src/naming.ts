import type { ExampleVariant } from "./types.js";

/**
 * Shared naming convention for legacy `x-ms-examples` files, used both by `tsp-examples-migrate`
 * (to decide when the original name/key can be reconstructed and therefore omitted from
 * `examples.yaml`) and by the `typespec-autorest` emitter (to materialize the legacy files). Keeping
 * this in one place guarantees the two sides agree, so the round-trip stays lossless.
 */

/** Turn an arbitrary title into a file-name-safe slug (`With WebHook` -> `With_WebHook`). */
export function slugify(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 120);
}

/** Strip a trailing `.json` extension (case-insensitive). */
export function stripJsonExtension(fileName: string): string {
  return fileName.replace(/\.json$/i, "");
}

/**
 * The conventional legacy example file name for an operation. The dominant Azure convention names
 * example files after the `operationId` (`Widgets_Get.json`); when an operation carries multiple
 * distinct examples the title is appended (`Widgets_Get_WithFilter.json`).
 */
export function defaultLegacyExampleFilename(operationId: string, title?: string): string {
  return title ? `${operationId}_${slugify(title)}.json` : `${operationId}.json`;
}

/** Derive the shared SDK/Swagger file name, preserving older filename metadata when no ID exists. */
export function getExampleFilename(
  operationId: string,
  example: Pick<ExampleVariant, "id" | "title" | "legacyFilename">,
): string {
  if (example.id !== undefined) return `${example.id}.json`;
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Older source files use this compatibility field.
  return example.legacyFilename ?? defaultLegacyExampleFilename(operationId, example.title);
}

export function exampleLineageKey(example: {
  readonly id?: unknown;
  readonly title?: unknown;
}): string {
  return typeof example.id === "string"
    ? `id:${example.id}`
    : `title:${typeof example.title === "string" ? example.title : ""}`;
}

export function isValidExampleId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    !/[/\\<>:"|?*\u0000-\u001f]/.test(id) &&
    !/\.json$/i.test(id)
  );
}
