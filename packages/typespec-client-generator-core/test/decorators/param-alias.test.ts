import { ModelProperty } from "@typespec/compiler";
import { strictEqual } from "assert";
import { it } from "vitest";
import { getParamAlias } from "../../src/decorators.js";
import { createSdkContextForTester, TcgcTester } from "../tester.js";

it("basic", async () => {
  const result = await TcgcTester.compile({
    "service.tsp": `
      import "@typespec/http";
      import "@typespec/rest";
      import "@azure-tools/typespec-client-generator-core";
      using TypeSpec.Http;
      using TypeSpec.Rest;
      using Azure.ClientGenerator.Core;

      @service
      namespace MyService;

      op download(@path blob: string): void;
      op upload(@path blobName: string): void;
    `,
    "main.tsp": `
      import "@azure-tools/typespec-client-generator-core";
      import "./service.tsp";
      using Azure.ClientGenerator.Core;

      namespace MyCustomizations;

      model MyClientInitialization {
        @paramAlias("blob")
        @test
        blobName: string;
      }

      @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization});
    `,
  });
  const { program } = result;
  const blobName = (result as unknown as { blobName: ModelProperty }).blobName;
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(getParamAlias(context, blobName), "blob");
});

it("multiple lint warning", async () => {
  const [result, diagnostics] = await TcgcTester.compileAndDiagnose({
    "service.tsp": `
      import "@typespec/http";
      import "@typespec/rest";
      import "@azure-tools/typespec-client-generator-core";
      using TypeSpec.Http;
      using TypeSpec.Rest;
      using Azure.ClientGenerator.Core;

      namespace My.Service;

      op originalName(blobClientName: string): void;
      op firstParamAlias(blobName: string): void;
      op secondParamAlias(bName: string): void;
    `,
    "main.tsp": `
      import "@azure-tools/typespec-client-generator-core";
      import "./service.tsp";
      using Azure.ClientGenerator.Core;

      namespace My.Customizations;

      model ClientInitOptions {
        @paramAlias("blobName")
        @paramAlias("bName")
        @test blobClientName: string;
      }
      @@clientInitialization(My.Service, ClientInitOptions);
    `,
  });
  const { program } = result;
  const blobClientName = (result as unknown as { blobClientName: ModelProperty }).blobClientName;
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/multiple-param-alias",
  );
  strictEqual(
    diagnostics[0].message,
    "Multiple param aliases applied to 'blobClientName'. Only the first one 'bName' will be used.",
  );
  strictEqual(getParamAlias(context, blobClientName), "bName");
});
