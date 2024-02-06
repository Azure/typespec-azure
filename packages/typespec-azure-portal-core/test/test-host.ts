import { AutorestTestLibrary } from "@azure-tools/typespec-autorest/testing";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { SdkTestLibrary } from "@azure-tools/typespec-client-generator-core/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { PortalCoreTestLibrary } from "../src/testing/index.js";

export async function createPortalCoreHost() {
  return createTestHost({
    libraries: [
      RestTestLibrary,
      AzureResourceManagerTestLibrary,
      HttpTestLibrary,
      PortalCoreTestLibrary,
      VersioningTestLibrary,
      SdkTestLibrary,
      OpenAPITestLibrary,
      AutorestTestLibrary,
      AzureCoreTestLibrary,
    ], // Add other libraries you depend on in your tests
  });
}
export async function createPortalCoreTestRunner() {
  const host = await createPortalCoreHost();
  return createTestWrapper(host, {
    autoUsings: [
      "Azure.Portal",
      "Azure.ClientGenerator.Core",
      "TypeSpec.Rest",
      "TypeSpec.Http",
      "TypeSpec.Versioning",
      `Azure.ResourceManager`,
    ],
  });
}
