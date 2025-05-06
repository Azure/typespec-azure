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
let outDir = resolve(dir, "openapi");

export async function generateCommonTypes(outputDir: string) {
  outDir = resolve(dir, outputDir);

  await rm(outDir, { recursive: true, force: true });
  const commonTypes = [
    "customer-managed-keys",
    "managed-identity",
    "managed-identity-with-delegation",
    "mobo",
    "network-security-perimeter",
    "private-links",
    "types",
  ];

  for (const type of commonTypes) {
    await emitCommonTypesSwagger(type);
  }
}

function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

async function emitCommonTypesSwagger(name: string) {
  log("Generating common types for ", name);
  const program = await compile(NodeHost, resolve(dir, `common-types/${name}.tsp`));

  if (program.diagnostics.length > 0) {
    logDiagnostics(program.diagnostics, NodeHost.logSink);
    process.exit(1);
  }

  const output = await getAllServicesAtAllVersions(
    program,
    resolveAutorestOptions(program, dir, {}),
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

  document.info.version = getCommonTypeVersion(document.info.version);
  replaceUuidRefs(document, "Azure.Core.uuid");
  replaceUuidRefs(document, "Azure.Core.azureLocation");
  replaceUuidRefs(document, "Azure.Core.armResourceType");
  replaceParameterName(
    document,
    "PrivateEndpointConnectionParameter",
    "PrivateEndpointConnectionName",
  );
  replaceDefintionName(document, "SystemData", "systemData");
  replaceDefintionName(document, "LocationData", "locationData");
  replaceDefintionName(document, "EncryptionProperties", "encryptionProperties");

  return document;
}

function replaceUuidRefs(document: OpenAPI2Document, refId: string) {
  if (document.definitions?.[refId]) {
    const refDef = document.definitions[refId];
    delete document.definitions[refId];

    for (const definition of Object.values(document.definitions)) {
      for (const property of Object.values(definition.properties || {})) {
        if ("$ref" in property && property.$ref === `#/definitions/${refId}`) {
          delete (property as any).$ref;
          Object.assign(property, { ...refDef, ...property });
        }
      }
    }
  }
}

function replaceParameterName(document: OpenAPI2Document, oldName: string, newName: string) {
  if (document.parameters && oldName in document.parameters) {
    const value = document.parameters[oldName];
    value.name = newName.charAt(0).toLowerCase() + newName.slice(1);
    document.parameters[newName.charAt(0).toUpperCase() + newName.slice(1)] = value;
    delete document.parameters[oldName];
  }
}

function replaceDefintionName(document: OpenAPI2Document, oldName: string, newName: string) {
  if (document.definitions && oldName in document.definitions) {
    document.definitions[newName] = document.definitions[oldName];
    delete document.definitions[oldName];

    for (const definition of Object.values(document.definitions)) {
      for (const property of Object.values(definition.properties || {})) {
        if ("$ref" in property && property.$ref === `#/definitions/${oldName}`) {
          property.$ref = `#/definitions/${newName}`;
        }
      }
    }
  }
}

function getCommonTypeVersion(version: string): string {
  const sanitizedVersion = version.startsWith("v") ? version.slice(1) : version;
  return sanitizedVersion.includes(".") ? sanitizedVersion : `${sanitizedVersion}.0`;
}
