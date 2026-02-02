import { strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";
import { getSdkTypeHelper } from "./utils.js";

it("default", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
    @usage(Usage.input | Usage.output)
    model Test {
      prop: duration;
    }
  `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "duration");
  strictEqual(sdkType.wireType.kind, "string");
  strictEqual(sdkType.encode, "ISO8601");
});
it("iso8601", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(DurationKnownEncoding.ISO8601)
        prop: duration;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "duration");
  strictEqual(sdkType.wireType.kind, "string");
  strictEqual(sdkType.encode, "ISO8601");
});

it("int32 seconds", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(DurationKnownEncoding.seconds, int32)
        prop: duration;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "duration");
  strictEqual(sdkType.wireType.kind, "int32");
  strictEqual(sdkType.encode, "seconds");
});

it("float seconds", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(DurationKnownEncoding.seconds, float)
        prop: duration;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "duration");
  strictEqual(sdkType.wireType.kind, "float");
  strictEqual(sdkType.encode, "seconds");
});

it("nullable float seconds", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode(DurationKnownEncoding.seconds, float)
        prop: duration | null;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const nullableType = getSdkTypeHelper(context);
  strictEqual(nullableType.kind, "nullable");

  const sdkType = nullableType.type;
  strictEqual(sdkType.kind, "duration");
  strictEqual(sdkType.wireType.kind, "float");
  strictEqual(sdkType.encode, "seconds");
});

it("float seconds decorated scalar", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @doc("doc")
      @summary("title")
      @encode(DurationKnownEncoding.seconds, float32)
      scalar Float32Duration extends duration;
      
      @usage(Usage.input | Usage.output)
      model Test {
        value: Float32Duration[];
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "array");
  strictEqual(sdkType.valueType.kind, "duration");
  strictEqual(sdkType.valueType.name, "Float32Duration");
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

it("custom encoding string", async function () {
  const { program } = await SimpleTesterWithService.compile(
    `
      @usage(Usage.input | Usage.output)
      model Test {
        @encode("customDurationFormat")
        prop: duration;
      }
    `,
  );
  const context = await createSdkContextForTester(program);
  const sdkType = getSdkTypeHelper(context);
  strictEqual(sdkType.kind, "duration");
  strictEqual(sdkType.encode, "customDurationFormat");
  strictEqual(sdkType.wireType.kind, "string");
});
