import { resolvePath } from "@typespec/compiler";
import { TypeSpecTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const AzureResourceManagerTestLibrary: TypeSpecTestLibrary = {
  name: "@azure-tools/typespec-azure-resource-manager",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../../"),
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
