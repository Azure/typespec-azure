import {
  OpenAPI2Document,
  getAllServicesAtAllVersions,
  resolveAutorestOptions,
  sortOpenAPIDocument,
} from "@azure-tools/typespec-autorest";
import { NodeHost, compile, logDiagnostics } from "@typespec/compiler";
import { mkdir, rm, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(dir, "openapi");

await rm(outDir, { recursive: true, force: true });
await emitCommonTypesSwagger("customer-managed-keys");
await emitCommonTypesSwagger("managed-identity");
await emitCommonTypesSwagger("private-links");
await emitCommonTypesSwagger("types");

function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

async function emitCommonTypesSwagger(name: string) {
  log("Generating common types for ", name);
  const program = await compile(NodeHost, resolve(dir, `src/${name}.tsp`));

  if (program.diagnostics.length > 0) {
    logDiagnostics(program.diagnostics, NodeHost.logSink);
    process.exit(1);
  }

  const output = await getAllServicesAtAllVersions(
    program,
    resolveAutorestOptions(program, dir, {})
  );
  if (program.diagnostics.length > 0) {
    logDiagnostics(program.diagnostics, NodeHost.logSink);
    process.exit(1);
  }

  if (output.length !== 1) {
    throw new Error("Expected exactly one service");
  }
  const service = output[0];

  if (!service.versioned) {
    throw new Error("Expected exactly one service");
  }

  for (const version of service.versions) {
    const document = version.document;
    if (document.definitions === undefined || Object.keys(document.definitions).length === 0) {
      continue; // we don't save this file
    }

    const cleanedDocument = cleanupDocument(document);
    const sortedDocument = sortOpenAPIDocument(cleanedDocument);

    const versionDir = resolve(outDir, version.version);
    await mkdir(versionDir, { recursive: true });
    const outputFile = resolve(versionDir, `${name.replaceAll("-", "")}.json`);
    await writeFile(outputFile, JSON.stringify(sortedDocument, null, 2), { encoding: "utf-8" });
  }

  log("  ✅ Generated common types for ", name);
}

function cleanupDocument(original: OpenAPI2Document): OpenAPI2Document {
  const document: OpenAPI2Document = JSON.parse(JSON.stringify(original));

  delete document.schemes;
  delete document.produces;
  delete document.consumes;
  delete document.tags;
  delete document.info["x-typespec-generated"];
  if (document.parameters && Object.keys(document.parameters).length === 0) {
    delete document.parameters;
  }
  document.paths = {};

  replaceUuidRefs(document);

  return document;
}

function replaceUuidRefs(document: OpenAPI2Document) {
  if (document.definitions?.["Azure.Core.uuid"]) {
    const uuidDef = document.definitions["Azure.Core.uuid"];
    delete document.definitions["Azure.Core.uuid"];

    for (const definition of Object.values(document.definitions)) {
      for (const property of Object.values(definition.properties || {})) {
        if ("$ref" in property && property.$ref === "#/definitions/Azure.Core.uuid") {
          delete (property as any).$ref;
          Object.assign(property, { ...uuidDef, ...property });
        }
      }
    }
  }
}
