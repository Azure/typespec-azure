import { strictEqual } from "assert";
import { describe, it } from "vitest";
import { createSdkContextForTester, SimpleTesterWithService } from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

/**
 * Generate a TypeSpec definition with a deeply nested model chain.
 * Creates models Level0, Level1, ..., LevelN where each LevelI has
 * a property `levelI_1` of type Level(I+1), and the deepest level
 * has a @query parameter to search for.
 *
 * @param depth Number of nesting levels
 * @param width Number of additional (non-nested) properties per model
 */
function generateDeeplyNestedTypeSpec(depth: number, width: number = 3): string {
  const models: string[] = [];

  // Create the deepest model with a @query parameter
  let deepestModel = `model Level${depth} {\n  @query q: string;\n`;
  for (let w = 0; w < width; w++) {
    deepestModel += `  extra${w}: string;\n`;
  }
  deepestModel += `}`;
  models.push(deepestModel);

  // Create intermediate models in reverse order
  for (let i = depth - 1; i >= 0; i--) {
    let model = `model Level${i} {\n  level${i + 1}: Level${i + 1};\n`;
    for (let w = 0; w < width; w++) {
      model += `  prop${i}_${w}: string;\n`;
    }
    model += `}`;
    models.push(model);
  }

  models.push(`op myOp(input: Level0): void;`);
  return models.join("\n");
}

describe("findMappingWithPath performance", () => {
  it("deeply nested model - 5 levels", async () => {
    const spec = generateDeeplyNestedTypeSpec(5);
    const { program } = await SimpleTesterWithService.compile(spec);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const serviceOperation = method.operation;

    // Find the query parameter and verify the path depth
    const queryParam = serviceOperation.parameters.find((p) => p.kind === "query");
    strictEqual(queryParam !== undefined, true);
    strictEqual(queryParam!.methodParameterSegments.length, 1);
    // Path should be: input -> level1 -> level2 -> level3 -> level4 -> level5 -> q = 7 segments
    strictEqual(queryParam!.methodParameterSegments[0].length, 7);
    strictEqual(queryParam!.methodParameterSegments[0][0].name, "input");
    strictEqual(queryParam!.methodParameterSegments[0][0].kind, "method");
    strictEqual(queryParam!.methodParameterSegments[0][6].name, "q");
  });

  it("deeply nested model - 10 levels", async () => {
    const spec = generateDeeplyNestedTypeSpec(10);
    const { program } = await SimpleTesterWithService.compile(spec);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const serviceOperation = method.operation;

    const queryParam = serviceOperation.parameters.find((p) => p.kind === "query");
    strictEqual(queryParam !== undefined, true);
    strictEqual(queryParam!.methodParameterSegments.length, 1);
    // Path should be: input -> level1 -> ... -> level10 -> q = 12 segments
    strictEqual(queryParam!.methodParameterSegments[0].length, 12);
    strictEqual(queryParam!.methodParameterSegments[0][0].name, "input");
    strictEqual(queryParam!.methodParameterSegments[0][0].kind, "method");
    strictEqual(queryParam!.methodParameterSegments[0][11].name, "q");
  });

  it("wide model with many properties at each level", async () => {
    const spec = generateDeeplyNestedTypeSpec(5, 10);
    const { program } = await SimpleTesterWithService.compile(spec);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const serviceOperation = method.operation;

    const queryParam = serviceOperation.parameters.find((p) => p.kind === "query");
    strictEqual(queryParam !== undefined, true);
    strictEqual(queryParam!.methodParameterSegments.length, 1);
    strictEqual(queryParam!.methodParameterSegments[0].length, 7);
    strictEqual(queryParam!.methodParameterSegments[0][0].name, "input");
    strictEqual(queryParam!.methodParameterSegments[0][0].kind, "method");
    strictEqual(queryParam!.methodParameterSegments[0][6].name, "q");
  });

  it("shallow match is found quickly (BFS advantage)", async () => {
    // In this test, the match is at level 1 (shallow), but there are deep branches.
    // BFS should find it faster than DFS.
    const spec = `
      model DeepBranch5 {
        dummy5: string;
      }
      model DeepBranch4 {
        branch5: DeepBranch5;
        dummy4: string;
      }
      model DeepBranch3 {
        branch4: DeepBranch4;
        dummy3: string;
      }
      model DeepBranch2 {
        branch3: DeepBranch3;
        dummy2: string;
      }
      model DeepBranch1 {
        branch2: DeepBranch2;
        dummy1: string;
      }
      model Input {
        deepBranch: DeepBranch1;
        @query q: string;
      }
      op myOp(input: Input): void;
    `;
    const { program } = await SimpleTesterWithService.compile(spec);
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    const serviceOperation = method.operation;

    const queryParam = serviceOperation.parameters.find((p) => p.kind === "query");
    strictEqual(queryParam !== undefined, true);
    strictEqual(queryParam!.methodParameterSegments.length, 1);
    // BFS should find q at depth 2: input -> q (not going deep into branches first)
    strictEqual(queryParam!.methodParameterSegments[0].length, 2);
    strictEqual(queryParam!.methodParameterSegments[0][0].name, "input");
    strictEqual(queryParam!.methodParameterSegments[0][0].kind, "method");
    strictEqual(queryParam!.methodParameterSegments[0][1].name, "q");
    strictEqual(queryParam!.methodParameterSegments[0][1].kind, "property");
  });
});
