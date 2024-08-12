import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: date-time types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  it("default", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          prop: utcDateTime;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "utcDateTime");
    strictEqual(sdkType.wireType.kind, "string");
    strictEqual(sdkType.encode, "rfc3339");
  });

  it("rfc3339", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.rfc3339)
          prop: utcDateTime;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "utcDateTime");
    strictEqual(sdkType.wireType.kind, "string");
    strictEqual(sdkType.encode, "rfc3339");
  });

  it("rfc7231", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.rfc7231)
          prop: utcDateTime;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "utcDateTime");
    strictEqual(sdkType.wireType.kind, "string");
    strictEqual(sdkType.encode, "rfc7231");
  });

  // TODO -- uncomment or modify when https://github.com/microsoft/typespec/issues/4042 is resolved.
  it.skip("unixTimestamp32", async () => {
    await runner.compileWithBuiltInService(
      `
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model Test {
        prop: unixTimestamp32;
      }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "utcDateTime");
    strictEqual(sdkType.wireType.kind, "int32");
    strictEqual(sdkType.encode, "unixTimestamp");
    strictEqual(sdkType.crossLanguageDefinitionId, "TypeSpec.unixTimestamp32");
    strictEqual(sdkType.baseType, undefined);
  });

  it("unixTimestamp", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.unixTimestamp, int64)
          value: utcDateTime;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "utcDateTime");
    strictEqual(sdkType.wireType.kind, "int64");
    strictEqual(sdkType.encode, "unixTimestamp");
  });

  it("encode propagation", async function () {
    await runner.compileWithBuiltInService(
      `
        @doc("doc")
        @summary("title")
        @encode(DateTimeKnownEncoding.unixTimestamp, int64)
        scalar unixTimestampDatetime extends utcDateTime;

        scalar extraLayerDateTime extends unixTimestampDatetime;

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          value: extraLayerDateTime;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
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
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DateTimeKnownEncoding.unixTimestamp, int64)
          value: utcDateTime | null;
        }
      `
    );
    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "utcDateTime");
    strictEqual(sdkType.wireType.kind, "int64");
    strictEqual(sdkType.encode, "unixTimestamp");
  });

  it("unixTimestamp array", async function () {
    await runner.compileWithBuiltInService(
      `
        @doc("doc")
        @summary("title")
        @encode(DateTimeKnownEncoding.unixTimestamp, int64)
        scalar unixTimestampDateTime extends utcDateTime;

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          value: unixTimestampDateTime[];
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    strictEqual(sdkType.valueType.kind, "utcDateTime");
    strictEqual(sdkType.valueType.name, "unixTimestampDateTime");
    strictEqual(sdkType.valueType.encode, "unixTimestamp");
    strictEqual(sdkType.valueType.wireType?.kind, "int64");
    strictEqual(sdkType.valueType.description, "title");
    strictEqual(sdkType.valueType.details, "doc");
    strictEqual(sdkType.valueType.crossLanguageDefinitionId, "TestService.unixTimestampDateTime");
    strictEqual(sdkType.valueType.baseType?.kind, "utcDateTime");
    strictEqual(sdkType.valueType.baseType.wireType.kind, "string");
  });
});
