import { describe, expect, it } from "vitest";
import { EmitterTester, loadQueuePilotFixture } from "./tester.js";

describe("end-to-end emit", () => {
  it("compiles the queue-pilot fixture (base + azurite overlay) without diagnostics and emits all three artifacts", async () => {
    const [{ outputs }, diagnostics] =
      await EmitterTester.compileAndDiagnose(loadQueuePilotFixture());

    expect(diagnostics).toEqual([]);

    const fileNames = Object.keys(outputs)
      .map((path) => path.split("/").pop())
      .sort();
    expect(fileNames).toEqual(["handlers.ts", "models.ts", "operations.ts"]);
  });

  it("generates models.ts with all referenced data models", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const modelsFile = findOutput(outputs, "models.ts");

    expect(modelsFile).toContain("export interface AccessPolicy {");
    expect(modelsFile).toContain("export interface QueueMetadata {");
    expect(modelsFile).toContain("export interface QueueProperties {");
    expect(modelsFile).toContain("export interface QueueMessage {");
    expect(modelsFile).toContain("export interface QueueMessageList {");
    expect(modelsFile).toContain("messages: QueueMessage[];");
    expect(modelsFile).toContain("start?: string;");
    expect(modelsFile).toContain("permission?: string;");
  });

  it("generates operations.ts with route metadata for all fixture operations", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toContain(`name: "Queue_Create"`);
    expect(operationsFile).toContain(`verb: "put"`);
    expect(operationsFile).toContain(`name: "ListMessages"`);
    expect(operationsFile).toContain(`verb: "get"`);
    expect(operationsFile).toContain(`name: "SetAccessPolicy"`);
    expect(operationsFile).toContain(`location: "query"`);
    expect(operationsFile).toContain(`location: "path"`);
  });

  it("imports referenced model types into operations.ts so the file compiles standalone", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const operationsFile = findOutput(outputs, "operations.ts");

    expect(operationsFile).toMatch(
      /import type \{[^}]*QueueMetadata[^}]*\} from "\.\/models\.js";/,
    );
  });

  it("generates handlers.ts with a method per operation", async () => {
    const { outputs } = await EmitterTester.compile(loadQueuePilotFixture());
    const handlersFile = findOutput(outputs, "handlers.ts");

    expect(handlersFile).toContain("export interface IServiceHandler {");
    expect(handlersFile).toContain(
      "queue_Create(params: Queue_CreateParameters, context: Context): Promise<Queue_CreateResponse>;",
    );
    expect(handlersFile).toContain(
      "getQueueProperties(params: GetQueuePropertiesParameters, context: Context): Promise<GetQueuePropertiesResponse>;",
    );
    expect(handlersFile).toContain(
      "listMessages(params: ListMessagesParameters, context: Context): Promise<ListMessagesResponse>;",
    );
    expect(handlersFile).toContain(
      "setAccessPolicy(params: SetAccessPolicyParameters, context: Context): Promise<SetAccessPolicyResponse>;",
    );
  });
});

function findOutput(outputs: Record<string, string>, suffix: string): string {
  const key = Object.keys(outputs).find((k) => k.endsWith(suffix));
  if (!key) {
    throw new Error(
      `No output file ending with ${suffix} found in ${Object.keys(outputs).join(", ")}`,
    );
  }
  return outputs[key];
}
