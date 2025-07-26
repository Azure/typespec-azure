import {
  TypeSpecTestLibrary,
  createTestLibrary,
  findTestPackageRoot,
} from "@typespec/compiler/testing";

export const AzureCoreTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "@azure-tools/typespec-azure-core",
  packageRoot: await findTestPackageRoot(import.meta.url),
});

export * from "../rules/no-legacy-usage.js";
