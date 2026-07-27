import type { SdkClientType, SdkHttpOperation } from "@azure-tools/typespec-client-generator-core";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import { emitFile, getDirectoryPath, resolvePath, type EmitContext } from "@typespec/compiler";
import { stringify as stringifyYaml } from "yaml";
import packageJson from "../package.json" with { type: "json" };
import { buildSpecMetadata, collectLanguagePackages } from "./collector.js";
import type { MetadataSnapshot } from "./metadata.js";
import {
  normalizeOptions,
  type MetadataEmitterOptions,
  type NormalizedMetadataEmitterOptions,
} from "./options.js";

const SNAPSHOT_VERSION = packageJson.version;

export async function $onEmit(context: EmitContext<MetadataEmitterOptions>): Promise<void> {
  const options = normalizeOptions(context.options);
  const typespecMetadata = buildSpecMetadata(context.program);

  // Get the common tsp-output directory (parent of this emitter's output dir)
  const commonOutputDir = getDirectoryPath(getDirectoryPath(context.emitterOutputDir));

  // Resolve API version using TCGC
  const sdkContext = await createSdkContext(context as any);
  let resolvedApiVersion: string | undefined;
  if (sdkContext.apiVersion === "all") {
    resolvedApiVersion = "all";
  } else {
    const apiVersionsMap = sdkContext.sdkPackage.metadata.apiVersions;
    if (apiVersionsMap && apiVersionsMap.size > 0) {
      if (apiVersionsMap.size > 1) {
        resolvedApiVersion = "multiple-versions";
      } else {
        resolvedApiVersion = [...apiVersionsMap.values()][0];
      }
    }
  }

  // Resolve SDK type (preview/stable) by checking all client API versions
  const resolvedSdkType = resolveSdkType(
    sdkContext.sdkPackage.clients,
    sdkContext.previewStringRegex,
  );

  const languageResult = await collectLanguagePackages(
    context.program,
    commonOutputDir,
    resolvedApiVersion,
    resolvedSdkType,
  );

  const snapshot: MetadataSnapshot = {
    emitterVersion: SNAPSHOT_VERSION,
    generatedAt: new Date().toISOString(),
    typespec: typespecMetadata,
    languages: languageResult.languages,
    sourceConfigPath: languageResult.sourceConfigPath,
  };

  await writeSnapshot(context, options, snapshot);
}

async function writeSnapshot(
  context: EmitContext<MetadataEmitterOptions>,
  options: NormalizedMetadataEmitterOptions,
  snapshot: MetadataSnapshot,
): Promise<void> {
  const serialized =
    options.format === "json"
      ? JSON.stringify(snapshot, null, 2) + "\n"
      : stringifyYaml(snapshot, {
          lineWidth: 0,
        });
  const outputPath = resolvePath(context.emitterOutputDir, options.outputFile);
  await emitFile(context.program, {
    path: outputPath,
    content: serialized,
  });
}

/**
 * Determine whether the SDK targets preview or stable API versions.
 * Walks all clients (including sub-clients) and checks each version string
 * against the preview regex.
 *
 * Note: The `@previewVersion` decorator is handled by TCGC internally during
 * version filtering, so versions marked with it that don't match the regex
 * are already excluded from `client.apiVersions` by the time we inspect them.
 * Once TCGC exposes `isPreview` on its metadata, we can consume it directly.
 */
function resolveSdkType(
  clients: SdkClientType<SdkHttpOperation>[],
  previewStringRegex: RegExp,
): "preview" | "stable" | undefined {
  let hasAnyVersion = false;

  function checkClient(client: SdkClientType<SdkHttpOperation>): boolean {
    for (const version of client.apiVersions) {
      hasAnyVersion = true;
      if (previewStringRegex.test(version)) {
        return true;
      }
    }

    // Recurse into sub-clients
    if (client.children) {
      for (const child of client.children) {
        if (checkClient(child)) {
          return true;
        }
      }
    }

    return false;
  }

  for (const client of clients) {
    if (checkClient(client)) {
      return "preview";
    }
  }

  return hasAnyVersion ? "stable" : undefined;
}
