import { describe, expect, it } from "vitest";
import type { GoEmitterOptions } from "../../src/lib.js";
import { emitGoFor } from "./scenario-runner.js";

describe("operation span errors", () => {
  it.each([undefined, false, true])("inject-spans = %s", async (injectSpans) => {
    const options: GoEmitterOptions = { "head-as-boolean": true };
    if (injectSpans !== undefined) {
      options["inject-spans"] = injectSpans;
    }
    const files = await emitGoFor(
      `
      @service namespace Spans;

      model Widget { name: string; }

      @get @route("/modeled")
      op modeled(): Widget;

      @get @route("/headers")
      op headers(): { @header value: string; };

      @delete @route("/empty")
      op empty(): void;

      @head @route("/exists")
      op exists(): void;

      model WidgetStatus is global.Azure.Core.Foundations.OperationStatus<Widget>;
      @@visibility(global.Azure.Core.Foundations.OperationStatus.id, Lifecycle.Read);

      @route("/widgets:create")
      op createWidget is global.Azure.Core.LongRunningRpcOperation<
        { @bodyRoot body: Widget; }, WidgetStatus, Widget
      >;
      `,
      options,
    );
    const client = files.get("zz_spans_client.go");
    expect(client).toBeDefined();
    for (const operation of ["Modeled", "Headers", "Empty", "Exists", "createWidget"]) {
      const method = client?.match(
        new RegExp(`func \\(client \\*SpansClient\\) ${operation}\\([\\s\\S]*?\\n\\}`),
      )?.[0];
      expect(method).toBeDefined();
      if (injectSpans) {
        expect(method).toContain("defer func() { endSpan(err) }()");
        if (operation === "Modeled" || operation === "Headers") {
          expect(method).toMatch(/resp, err := client\.\w+HandleResponse\(httpResp, /);
          expect(method).toContain("return resp, err");
        } else {
          expect(method).toContain("err = runtime.NewResponseError(httpResp)");
          expect(method).toMatch(/return (?:nil|SpansClient\w+Response\{\}), err/);
        }
      } else {
        expect(method).not.toContain("endSpan");
        expect(method).not.toContain("err = runtime.NewResponseError(httpResp)");
        if (operation === "Modeled" || operation === "Headers") {
          expect(method).toMatch(/return client\.\w+HandleResponse\(httpResp, /);
        } else {
          expect(method).toMatch(
            /return (?:nil|SpansClient\w+Response\{\}), runtime.NewResponseError\(httpResp\)/,
          );
        }
      }
    }
  });
});
