import { TypeSpecTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";

export const AzureCoreTestLibrary: TypeSpecTestLibrary = {
  name: "@azure-tools/typespec-azure-core",
  packageRoot: await findTestPackageRoot(import.meta.url),
  files: [
    {
      realDir: "",
      pattern: "package.json",
      virtualPath: "./node_modules/@azure-tools/typespec-azure-core",
    },
    {
      realDir: "dist/src",
      pattern: "*.js",
      virtualPath: "./node_modules/@azure-tools/typespec-azure-core/dist/src",
    },
    {
      realDir: "lib",
      pattern: "*.tsp",
      virtualPath: "./node_modules/@azure-tools/typespec-azure-core/lib",
    },
  ],
};
