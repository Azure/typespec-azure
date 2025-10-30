import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";

export const ApiTester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@azure-tools/typespec-autorest-canonical",
    "@typespec/versioning",
  ],
});

export const Tester = ApiTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/openapi",
  "@typespec/versioning",
)
  .using("Http", "Rest", "OpenAPI", "Versioning")
  .emit("@azure-tools/typespec-autorest-canonical");

export async function openApiFor(code: string) {
  const runner = await Tester.createInstance();
  const results = await runner.compile(code);
  return JSON.parse(results.outputs["canonical/openapi.json"]);
}

export async function diagnoseOpenApiFor(code: string) {
  return Tester.diagnose(code);
}
