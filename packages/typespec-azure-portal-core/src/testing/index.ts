import { resolvePath } from "@typespec/compiler";
import { createTestLibrary, findTestPackageRoot } from "@typespec/compiler/testing";
import { fileURLToPath } from "url";

export const PortalCoreTestLibrary = createTestLibrary({
  name: "@azure-tools/typespec-azure-portal-core",
  // Set this to the absolute path to the root of the package. (e.g. in this case this file would be compiled to ./dist/src/testing/index.js)
  packageRoot: await findTestPackageRoot(import.meta.url),
});
