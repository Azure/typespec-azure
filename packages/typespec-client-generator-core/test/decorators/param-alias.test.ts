import { Diagnostic, ModelProperty } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getParamAlias } from "../../src/decorators.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("basic", async () => {
  const { blobName } = (await runner.compileWithCustomization(
    `
    @service
    namespace MyService;

    op download(@path blob: string): void;
    op upload(@path blobName: string): void;
    `,
    `
    namespace MyCustomizations;

    model MyClientInitialization {
      @paramAlias("blob")
      @test
      blobName: string;
    }

    @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization});
    `,
  )) as { blobName: ModelProperty };
  strictEqual(getParamAlias(runner.context, blobName), "blob");
});

it("multiple lint warning", async () => {
  const [{ blobClientName }, diagnostics] = (await runner.compileAndDiagnoseWithCustomization(
    `
    namespace My.Service;

    op originalName(blobClientName: string): void;
    op firstParamAlias(blobName: string): void;
    op secondParamAlias(bName: string): void;
    `,
    `
    namespace My.Customizations;

    model ClientInitOptions {
      @paramAlias("blobName")
      @paramAlias("bName")
      @test blobClientName: string;
    }
    @@clientInitialization(My.Service, ClientInitOptions);
    `,
  )) as [{ blobClientName: ModelProperty }, diagnostics: Diagnostic[]];
  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/multiple-param-alias",
  );
  strictEqual(
    diagnostics[0].message,
    "Multiple param aliases applied to 'blobClientName'. Only the first one 'bName' will be used.",
  );
  strictEqual(getParamAlias(runner.context, blobClientName), "bName");
});
