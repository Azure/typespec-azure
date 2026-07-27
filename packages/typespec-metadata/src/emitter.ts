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

  const languageResult = await collectLanguagePackages(
    context.program,
    commonOutputDir,
    resolvedApiVersion,
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
