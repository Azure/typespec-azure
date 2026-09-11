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
    .replace(/^_+|_+$/g, "")
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
