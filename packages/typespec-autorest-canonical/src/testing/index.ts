import {
  TypeSpecTestLibrary,
  createTestLibrary,
  findTestPackageRoot,
} from "@typespec/compiler/testing";

export const AutorestCanonicalTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "@azure-tools/typespec-autorest-canonical",
  packageRoot: await findTestPackageRoot(import.meta.url),
});
