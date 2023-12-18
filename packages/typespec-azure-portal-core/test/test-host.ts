import { createTestHost, createTestWrapper, BasicTestRunner } from "@typespec/compiler/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { AutorestTestLibrary } from "@azure-tools/typespec-autorest/testing";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";

import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { SdkTestLibrary } from "@azure-tools/typespec-client-generator-core/testing";
import { PortalCoreTestLibrary } from "../src/testing/index.js";
import {AzureResourceManagerTestLibrary} from "@azure-tools/typespec-azure-resource-manager/testing";
import {
    getAllHttpServices,
    HttpOperation,
    HttpOperationParameter,
    HttpVerb,
    RouteResolutionOptions,
  } from "@typespec/http";
  import { HttpTestLibrary } from "@typespec/http/testing";

export async function createPortalCoreHost() {

  return createTestHost({
    libraries: [RestTestLibrary, AzureResourceManagerTestLibrary, HttpTestLibrary, PortalCoreTestLibrary, VersioningTestLibrary, SdkTestLibrary, OpenAPITestLibrary,
      AutorestTestLibrary,
      AzureCoreTestLibrary,], // Add other libraries you depend on in your tests
  });
}
export async function createPortalCoreTestRunner() {
  const host = await createPortalCoreHost();
  return createTestWrapper(host, { autoUsings: ["Azure.Portal", "Azure.ClientGenerator.Core",
  "TypeSpec.Rest",
  "TypeSpec.Http",
  "TypeSpec.Versioning",`Azure.ResourceManager`] });
}
