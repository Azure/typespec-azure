import { TypeSpecTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";

export const CSharpServiceEmitterTestLibrary: TypeSpecTestLibrary = {
  name: "@azure-tools/typespec-service-csharp",
  packageRoot: await findTestPackageRoot(import.meta.url),
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
