import { TypeSpecTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";

export const AutorestcanonicalTestLibrary: TypeSpecTestLibrary = {
  name: "@azure-tools/typespec-autorest-canonical",
  packageRoot: await findTestPackageRoot(import.meta.url),
  files: [
    {
      realDir: "",
      pattern: "package.json",
      virtualPath: "./node_modules/@azure-tools/typespec-autorest-canonical",
    },
    {
      realDir: "dist/src",
      pattern: "*.js",
      virtualPath: "./node_modules/@azure-tools/typespec-autorest-canonical/dist/src",
    },
    {
      realDir: "lib",
      pattern: "*.tsp",
      virtualPath: "./node_modules/@azure-tools/typespec-autorest-canonical/lib",
    },
  ],
};
