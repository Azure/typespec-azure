import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { createTestHost, createTestWrapper } from "@typespec/compiler/testing";
import { HttpTestLibrary } from "@typespec/http/testing";
import { RestTestLibrary } from "@typespec/rest/testing";
import { VersioningTestLibrary } from "@typespec/versioning/testing";
import { CSharpServiceEmitterOptions } from "../src/lib.js";
import { CSharpServiceEmitterTestLibrary } from "../src/testing/index.js";

export async function createCSharpServiceEmitterTestHost() {
  const result = await createTestHost({
    libraries: [
      HttpTestLibrary,
      RestTestLibrary,
      AzureCoreTestLibrary,
      VersioningTestLibrary,
      CSharpServiceEmitterTestLibrary,
    ],
  });

  return result;
}

export async function createCSharpServiceEmitterTestRunner(
  emitterOptions: CSharpServiceEmitterOptions = { "skip-format": true }
) {
  const host = await createCSharpServiceEmitterTestHost();

  const result = createTestWrapper(host, {
    autoUsings: [
      "Azure.Core.Traits",
      "Azure.Core",
      "TypeSpec.Http",
      "TypeSpec.Rest",
      "TypeSpec.Versioning",
    ],
    compilerOptions: {
      emitters: {
        [CSharpServiceEmitterTestLibrary.name]: emitterOptions as any,
      },
      noEmit: false,
    },
  });

  return result;
}

export function getStandardService(code: string): string {
  return `
  @service({title: "Microsoft.Contoso", version: "2023-03-01-preview"})
  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
    namespace Microsoft.Contoso {
      ${code}
    }`;
}
