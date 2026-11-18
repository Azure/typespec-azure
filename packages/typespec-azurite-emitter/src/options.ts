import type { JSONSchemaType } from "@typespec/compiler";

export interface AzuriteEmitterOptions {
  /**
   * Relative path (within the emitter output dir) where generated artifacts are written.
   */
  outputDir?: string;

  /**
   * Module specifier used by generated artifacts to import the handwritten Azurite serialization
   * runtime.
   */
  runtimeImport?: string;
}

export interface NormalizedAzuriteEmitterOptions {
  outputDir: string;
  runtimeImport: string;
}

export const azuriteEmitterOptionsSchema: JSONSchemaType<AzuriteEmitterOptions> = {
  type: "object",
  additionalProperties: false,
  properties: {
    outputDir: { type: "string", nullable: true },
    runtimeImport: { type: "string", nullable: true },
  },
};

export function normalizeOptions(
  rawOptions: AzuriteEmitterOptions | undefined,
): NormalizedAzuriteEmitterOptions {
  return {
    outputDir: rawOptions?.outputDir?.trim() || ".",
    runtimeImport: rawOptions?.runtimeImport?.trim() || "../runtime/serializationRuntime",
  };
}
