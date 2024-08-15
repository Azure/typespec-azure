import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: duration types", () => {
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
          prop: duration;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "duration");
    strictEqual(sdkType.wireType.kind, "string");
    strictEqual(sdkType.encode, "ISO8601");
  });
  it("iso8601", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.ISO8601)
          prop: duration;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "duration");
    strictEqual(sdkType.wireType.kind, "string");
    strictEqual(sdkType.encode, "ISO8601");
  });

  it("int32 seconds", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.seconds, int32)
          prop: duration;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "duration");
    strictEqual(sdkType.wireType.kind, "int32");
    strictEqual(sdkType.encode, "seconds");
  });

  it("float seconds", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.seconds, float)
          prop: duration;
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "duration");
    strictEqual(sdkType.wireType.kind, "float");
    strictEqual(sdkType.encode, "seconds");
  });

  it("nullable float seconds", async function () {
    await runner.compileWithBuiltInService(
      `
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @encode(DurationKnownEncoding.seconds, float)
          prop: duration | null;
        }
      `
    );
    const nullableType = getSdkTypeHelper(runner);
    strictEqual(nullableType.kind, "nullable");

    const sdkType = nullableType.type;
    strictEqual(sdkType.kind, "duration");
    strictEqual(sdkType.wireType.kind, "float");
    strictEqual(sdkType.encode, "seconds");
  });

  it("float seconds decorated scalar", async function () {
    await runner.compileWithBuiltInService(
      `
        @doc("doc")
        @summary("title")
        @encode(DurationKnownEncoding.seconds, float32)
        scalar Float32Duration extends duration;
        
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          value: Float32Duration[];
        }
      `
    );
    const sdkType = getSdkTypeHelper(runner);
    strictEqual(sdkType.kind, "array");
    strictEqual(sdkType.valueType.kind, "duration");
    strictEqual(sdkType.valueType.name, "Float32Duration");
    strictEqual(sdkType.valueType.description, "title"); // eslint-disable-line deprecation/deprecation
    strictEqual(sdkType.valueType.details, "doc"); // eslint-disable-line deprecation/deprecation
    strictEqual(sdkType.valueType.doc, "doc");
    strictEqual(sdkType.valueType.summary, "title");
    // the encode and wireType will only be added to the outer type
    strictEqual(sdkType.valueType.encode, "seconds");
    strictEqual(sdkType.valueType.crossLanguageDefinitionId, "TestService.Float32Duration");
    strictEqual(sdkType.valueType.wireType?.kind, "float32");
    strictEqual(sdkType.valueType.baseType?.kind, "duration");
    // the encode and wireType on the baseType will have its default value
    strictEqual(sdkType.valueType.baseType.wireType.kind, "string");
    strictEqual(sdkType.valueType.baseType.encode, "ISO8601");
    strictEqual(sdkType.valueType.baseType.crossLanguageDefinitionId, "TypeSpec.duration");
  });
});
