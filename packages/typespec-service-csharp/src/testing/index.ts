import { resolvePath } from "@typespec/compiler";
import { TypeSpecTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const CSharpServiceEmitterTestLibrary: TypeSpecTestLibrary = {
  name: "@azure-tools/typespec-service-csharp",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../../"),
  files: [
    {
      realDir: "",
      pattern: "package.json",
      virtualPath: "./node_modules/@azure-tools/typespec-service-csharp",
    },
    {
      realDir: "dist/src",
      pattern: "*.js",
      virtualPath: "./node_modules/@azure-tools/typespec-service-csharp/dist/src",
    },
  ],
};
