import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearContexts } from "../../src/context-manager.js";
import { emitModularClientFromTypeSpec } from "../util/emit-util.js";
import { clearCompileCache } from "../util/test-util.js";

describe("structured stream public method names", () => {
  let methods: string[];

  beforeAll(async () => {
    const clients = await emitModularClientFromTypeSpec(
      `
      model Info { value: string; }
      @events union Events { Info }

      #suppress "experimental-feature" "exact streaming operation name"
      @clientName(exact("sse_operation"))
      @route("/sse")
      op receiveSse(): SSEStream<Events>;

      #suppress "experimental-feature" "exact streaming operation name"
      @clientName(exact("jsonl_operation"))
      @route("/jsonl")
      op receiveJsonl(): JsonlStream<Info>;
      `,
      { needTCGC: true },
    );
    methods = clients.flatMap((file) =>
      file.getClasses().flatMap((client) => client.getMethods().map((method) => method.getName())),
    );
  });

  afterAll(() => {
    clearCompileCache();
    clearContexts();
  });

  it.each([
    ["sse_operation", "sseOperation"],
    ["jsonl_operation", "jsonlOperation"],
  ])("preserves the exact public name %s", (exact, normalized) => {
    expect(methods).toContain(exact);
    expect(methods).not.toContain(normalized);
  });
});
