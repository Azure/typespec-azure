import { ModelProperty } from "@typespec/compiler";
import { t } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { it } from "vitest";
import { getParamAlias } from "../../src/decorators.js";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
} from "../tester.js";

it("basic", async () => {
  const { program, blobName } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
      @service
      namespace MyService;

      op download(@path blob: string): void;
      op upload(@path blobName: string): void;
    `,
      t.code`
      namespace MyCustomizations;

      model MyClientInitialization {
        @paramAlias("blob")
        ${t.modelProperty("blobName")}: string;
      }

      @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization});
    `,
    ),
  );
  const context = await createSdkContextForTester(program);
  strictEqual(getParamAlias(context, blobName as ModelProperty), "blob");
});

it("multiple lint warning", async () => {
  const [{ program, blobClientName }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
    createClientCustomizationInput(
      `
      namespace My.Service;

      op originalName(blobClientName: string): void;
      op firstParamAlias(blobName: string): void;
      op secondParamAlias(bName: string): void;
    `,
      t.code`
      namespace My.Customizations;

      model ClientInitOptions {
        @paramAlias("blobName")
        @paramAlias("bName")
        ${t.modelProperty("blobClientName")}: string;
      }
      @@clientInitialization(My.Service, ClientInitOptions);
    `,
    ),
  );
  const context = await createSdkContextForTester(program);
  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/multiple-param-alias",
  );
  strictEqual(
    diagnostics[0].message,
    "Multiple param aliases applied to 'blobClientName'. Only the first one 'bName' will be used.",
  );
  strictEqual(getParamAlias(context, blobClientName as ModelProperty), "bName");
});
