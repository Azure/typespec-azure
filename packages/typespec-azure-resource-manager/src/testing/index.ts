import { TypeSpecTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";

export const AzureResourceManagerTestLibrary: TypeSpecTestLibrary = {
  name: "@azure-tools/typespec-azure-resource-manager",
  packageRoot: await findTestPackageRoot(import.meta.url),
  files: [
    {
      realDir: "",
      pattern: "package.json",
      virtualPath: "./node_modules/@azure-tools/typespec-azure-resource-manager",
    },
    {
      realDir: "dist/src",
      pattern: "*.js",
      virtualPath: "./node_modules/@azure-tools/typespec-azure-resource-manager/dist/src",
    },
    {
      realDir: "lib",
      pattern: "*.tsp",
      virtualPath: "./node_modules/@azure-tools/typespec-azure-resource-manager/lib",
    },
  ],
};
