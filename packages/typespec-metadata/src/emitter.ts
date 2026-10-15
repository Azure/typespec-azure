import { isPreviewVersion } from "@azure-tools/typespec-azure-core";
import type { SdkClientType, SdkHttpOperation } from "@azure-tools/typespec-client-generator-core";
import { createSdkContext } from "@azure-tools/typespec-client-generator-core";
import {
  emitFile,
  getDirectoryPath,
  resolvePath,
  type EmitContext,
  type Program,
} from "@typespec/compiler";
import { getVersions } from "@typespec/versioning";
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

  // Use TCGC for fallback API version resolution and SDK type detection
  const sdkContext = await createSdkContext(context as any);
  const apiVersionsMap = sdkContext.sdkPackage.metadata.apiVersions;
  let fallbackApiVersion: string | undefined;
  if (apiVersionsMap && apiVersionsMap.size > 0) {
    if (apiVersionsMap.size > 1) {
      fallbackApiVersion = "multiple-versions";
    } else {
      fallbackApiVersion = [...apiVersionsMap.values()][0];
    }
  }

  // Resolve SDK type (preview/stable) by checking all client API versions
  const resolvedSdkType = resolveSdkType(
    context.program,
    sdkContext.sdkPackage.clients,
    sdkContext.previewStringRegex,
  );

  const languageResult = await collectLanguagePackages(
    context.program,
    commonOutputDir,
    fallbackApiVersion,
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
 *
 * Priority:
 * 1. `@previewVersion` decorator on any version enum member (always wins)
 * 2. Regex match against the `previewStringRegex` on client API version strings
 */
function resolveSdkType(
  program: Program,
  clients: SdkClientType<SdkHttpOperation>[],
  previewStringRegex: RegExp,
): "preview" | "stable" | undefined {
  // First check: @previewVersion decorator on version enum members
  for (const client of clients) {
    if (!client.__raw?.services) continue;
    for (const serviceNs of client.__raw.services) {
      const versionResult = getVersions(program, serviceNs);
      if (versionResult.length === 2 && versionResult[1]) {
        const versionMap = versionResult[1];
        for (const version of versionMap.getVersions()) {
          if (isPreviewVersion(program, version.enumMember)) {
            return "preview";
          }
        }
      }
    }
  }

  // Second check: regex match on client API version strings
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
