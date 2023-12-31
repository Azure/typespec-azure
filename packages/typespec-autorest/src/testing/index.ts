import { TypeSpecTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";

export const AutorestTestLibrary: TypeSpecTestLibrary = {
  name: "@azure-tools/typespec-autorest",
  packageRoot: await findTestPackageRoot(import.meta.url),
  files: [
    {
      realDir: "",
      pattern: "package.json",
      virtualPath: "./node_modules/@azure-tools/typespec-autorest",
    },
    {
      realDir: "dist/src",
      pattern: "*.js",
      virtualPath: "./node_modules/@azure-tools/typespec-autorest/dist/src",
    },
    {
      realDir: "lib",
      pattern: "*.tsp",
      virtualPath: "./node_modules/@azure-tools/typespec-autorest/lib",
    },
  ],
};
