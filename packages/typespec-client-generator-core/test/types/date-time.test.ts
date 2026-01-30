import { strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";
import { getSdkTypeHelper } from "./utils.js";

it("default", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        prop: utcDateTime;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.wireType.kind, "string");
  strictEqual(sdkType.encode, "rfc3339");
});

it("rfc3339", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
        @usage(Usage.input | Usage.output)
        model Test {
          @encode(DateTimeKnownEncoding.rfc3339)
          prop: utcDateTime;
        }
      `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.wireType.kind, "string");
  strictEqual(sdkType.encode, "rfc3339");
});

it("rfc7231", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(DateTimeKnownEncoding.rfc7231)
        prop: utcDateTime;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.wireType.kind, "string");
  strictEqual(sdkType.encode, "rfc7231");
});

// TODO -- uncomment or modify when https://github.com/microsoft/typespec/issues/4042 is resolved.
it.skip("unixTimestamp32", async () => {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      prop: unixTimestamp32;
    }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.wireType.kind, "int32");
  strictEqual(sdkType.encode, "unixTimestamp");
  strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.unixTimestamp32");
  strictEqual(sdkType.baseType, undefined);
});

it("unixTimestamp", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(DateTimeKnownEncoding.unixTimestamp, int64)
        value: utcDateTime;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.wireType.kind, "int64");
  strictEqual(sdkType.encode, "unixTimestamp");
});

it("encode propagation", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @doc("doc")
      @summary("title")
      @encode(DateTimeKnownEncoding.unixTimestamp, int64)
      scalar unixTimestampDatetime extends utcDateTime;

      scalar extraLayerDateTime extends unixTimestampDatetime;

      @usage(Usage.input | Usage.output)
      model Test {
        value: extraLayerDateTime;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.name, "extraLayerDateTime");
  strictEqual(sdkType.wireType.kind, "int64");
  strictEqual(sdkType.encode, "unixTimestamp");
  strictEqual(sdkType.crossLanguageDefinitionId, "TestService.extraLayerDateTime");
  strictEqual(sdkType.baseType?.kind, "utcDateTime");
  strictEqual(sdkType.baseType.name, "unixTimestampDatetime");
  strictEqual(sdkType.baseType.wireType.kind, "int64");
  strictEqual(sdkType.baseType.encode, "unixTimestamp");
  strictEqual(sdkType.baseType.crossLanguageDefinitionId, "TestService.unixTimestampDatetime");
  strictEqual(sdkType.baseType.baseType?.kind, "utcDateTime");
  strictEqual(sdkType.baseType.baseType.wireType.kind, "string");
  strictEqual(sdkType.baseType.baseType.encode, "rfc3339");
  strictEqual(sdkType.baseType.baseType.name, "utcDateTime");
  strictEqual(sdkType.baseType.baseType.crossLanguageDefinitionId, "TypeSpec.utcDateTime");
});

it("nullable unixTimestamp", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(DateTimeKnownEncoding.unixTimestamp, int64)
        value: utcDateTime | null;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const nullableType = getSdkTypeHelper(context);
  strictEqual(nullableType.kind, "nullable");

  const sdkType = nullableType.type;
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.wireType.kind, "int64");
  strictEqual(sdkType.encode, "unixTimestamp");
});

it("unixTimestamp array", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @doc("doc")
      @summary("title")
      @encode(DateTimeKnownEncoding.unixTimestamp, int64)
      scalar unixTimestampDateTime extends utcDateTime;

      @usage(Usage.input | Usage.output)
      model Test {
        value: unixTimestampDateTime[];
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "array");
  strictEqual(sdkType.valueType.kind, "utcDateTime");
  strictEqual(sdkType.valueType.name, "unixTimestampDateTime");
  strictEqual(sdkType.valueType.encode, "unixTimestamp");
  strictEqual(sdkType.valueType.wireType?.kind, "int64");
  strictEqual(sdkType.valueType.doc, "doc");
  strictEqual(sdkType.valueType.summary, "title");
  strictEqual(sdkType.valueType.crossLanguageDefinitionId, "TestService.unixTimestampDateTime");
  strictEqual(sdkType.valueType.baseType?.kind, "utcDateTime");
  strictEqual(sdkType.valueType.baseType.wireType.kind, "string");
});

it("custom encoding string", async function () {
  await runner.compileWithBuiltInService(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode("customFormat")
        prop: utcDateTime;
      }
    `,
  );
  const sdkType = getSdkTypeHelper(runner);
  strictEqual(sdkType.kind, "utcDateTime");
  strictEqual(sdkType.encode, "customFormat");
  strictEqual(sdkType.wireType.kind, "string");
});
