import {
  TypeSpecTestLibrary,
  createTestLibrary,
  findTestPackageRoot,
} from "@typespec/compiler/testing";

/** @deprecated Use `createTester` from `@typespec/compiler/testing` instead */
/* eslint-disable @typescript-eslint/no-deprecated */
export const AzureResourceManagerTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "@azure-tools/typespec-azure-resource-manager",
  packageRoot: await findTestPackageRoot(import.meta.url),
});
/* eslint-enable @typescript-eslint/no-deprecated */
