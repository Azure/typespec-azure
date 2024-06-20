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
    strictEqual(sdkType.tspNamespace, "TestService");
    strictEqual(sdkType.wireType.kind, "int64");
    strictEqual(sdkType.encode, "unixTimestamp");
    strictEqual(sdkType.baseType?.kind, "utcDateTime");
    strictEqual(sdkType.baseType.name, "unixTimestampDatetime");
    strictEqual(sdkType.baseType.tspNamespace, "TestService");
    strictEqual(sdkType.baseType.wireType.kind, "int64");
    strictEqual(sdkType.baseType.encode, "unixTimestamp");
    strictEqual(sdkType.baseType.baseType?.kind, "utcDateTime");
    strictEqual(sdkType.baseType.baseType.wireType.kind, "string");
    strictEqual(sdkType.baseType.baseType.encode, "rfc3339");
    strictEqual(sdkType.baseType.baseType.name, "utcDateTime");
    strictEqual(sdkType.baseType.baseType.tspNamespace, "TypeSpec");
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
        scalar unixTimestampDatetime extends utcDateTime;

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          value: unixTimestampDatetime[];
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    strictEqual(sdkType.valueType.kind, "utcDateTime");
    strictEqual(sdkType.valueType.name, "unixTimestampDatetime");
    strictEqual(sdkType.valueType.tspNamespace, "TestService");
    strictEqual(sdkType.valueType.encode, "unixTimestamp");
    strictEqual(sdkType.valueType.wireType?.kind, "int64");
    strictEqual(sdkType.valueType.description, "title");
    strictEqual(sdkType.valueType.details, "doc");
    strictEqual(sdkType.valueType.baseType?.kind, "utcDateTime");
    strictEqual(sdkType.valueType.baseType.wireType.kind, "string");
  });
});
