import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { AzureResourceManagerTestLibrary } from "../src/testing/index.js";

export async function createAzureResourceManagerTestHost() {
  return createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      OpenAPITestLibrary,
      AzureCoreTestLibrary,
      VersioningTestLibrary,
      AzureResourceManagerTestLibrary,
    ],
  });
}

export async function createAzureResourceManagerTestRunner() {
  const host = await createAzureResourceManagerTestHost();
  return createTestWrapper(host, {
    autoUsings: [`Azure.ResourceManager`, `TypeSpec.Http`, `TypeSpec.Rest`, `TypeSpec.Versioning`],
  });
}
