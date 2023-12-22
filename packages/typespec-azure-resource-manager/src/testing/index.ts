import {
  TypeSpecTestLibrary,
  createTestLibrary,
  findTestPackageRoot,
} from "@typespec/compiler/testing";

export const AzureResourceManagerTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "@azure-tools/typespec-azure-resource-manager",
  packageRoot: await findTestPackageRoot(import.meta.url),
});
