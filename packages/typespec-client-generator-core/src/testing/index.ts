import { resolvePath } from "@typespec/compiler";
import { createTestLibrary, TypeSpecTestLibrary } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const SdkTestLibrary: TypeSpecTestLibrary = createTestLibrary({
  name: "@azure-tools/typespec-client-generator-core",
  packageRoot: resolvePath(fileURLToPath(import.meta.url), "../../../../"),
});
