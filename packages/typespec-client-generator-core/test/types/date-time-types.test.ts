import { strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  describe("SdkDatetimeType", () => {
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
      strictEqual(sdkType.valueType.wireType.kind, "int64");
      strictEqual(sdkType.valueType.encode, "unixTimestamp");
      strictEqual(sdkType.valueType.description, "title");
      strictEqual(sdkType.valueType.details, "doc");
    });
  });
});
