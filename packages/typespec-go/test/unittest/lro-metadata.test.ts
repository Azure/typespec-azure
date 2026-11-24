// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

const operation = `
  @service namespace Lro;
  model JobStatus {
    @lroOperationId id: string;
    status: global.Azure.Core.Foundations.OperationState;
    @lroStatusMetadata percentComplete?: int32;
    result?: JobResult;
  }
  model JobResult { name: string; }
  @route("/jobs/operations/{operationId}:status")
  @get op getJobStatus(@lroOperationId @path operationId: string): JobStatus;
  @route("/jobs:start") @post
  @pollingOperation(getJobStatus)
  op startJob(): global.Azure.Core.Foundations.AcceptedResponse &
    global.Azure.Core.Foundations.LongRunningStatusLocation<JobStatus>;
`;

describe("LRO metadata pollers", () => {
  it("preserves the original return type by default and requires explicit opt-in", async () => {
    const standard = await emitGoFor(operation);
    expect(standard.get("zz_lro_client.go")).toContain(
      "(*runtime.Poller[LroClientStartJobResponse], error)",
    );
    expect(standard.get("zz_responses.go")).not.toContain("type LroClientStartJobPoller struct");
    const optedIn = await emitGoFor(operation, { "lro-metadata-pollers": true });
    expect(optedIn.get("zz_lro_client.go")).toContain("(*LroClientStartJobPoller, error)");
    expect(optedIn.get("zz_responses.go")).toContain("type LroClientStartJobPoller struct");
    expect(optedIn.get("zz_responses.go")).toContain('strings.HasSuffix(segments[2], ":status")');
  });

  it("reports collisions between poller names and user models", async () => {
    await expect(
      emitGoFor(
        `${operation}
        model StartJobPoller { value: string; }
        @get @route("/model") op getModel(): StartJobPoller;`,
        { "single-client": true, "lro-metadata-pollers": true },
      ),
    ).rejects.toThrow("generated LRO metadata type StartJobPoller collides");
  });

  it("rejects reserved path expansion rather than generating an incorrect ID matcher", async () => {
    await expect(
      emitGoFor(
        operation.replace(
          '@route("/jobs/operations/{operationId}:status")',
          '@route("/jobs/operations/{+operationId}:status")',
        ),
        { "lro-metadata-pollers": true },
      ),
    ).rejects.toThrow("unsupported LRO operation ID URI template");
  });

  it("emits traced pollers with initial status metadata", async () => {
    const initial = operation.replace(
      "global.Azure.Core.Foundations.AcceptedResponse &",
      "global.Azure.Core.Foundations.AcceptedResponse<JobStatus> &",
    );
    const files = await emitGoFor(initial, { "lro-metadata-pollers": true, "inject-spans": true });
    const client = files.get("zz_lro_client.go")!;
    expect(client).toContain("handler.observe(resp)");
    expect(client).toContain("Tracer: client.internal.Tracer()");
  });

  it("supports metadata on a pageable LRO", async () => {
    const files = await emitGoFor(
      `
      @service namespace Lro;
      model Item { value: string; }
      model Page {
        @pageItems items: Item[];
        @TypeSpec.nextLink next?: string;
      }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled" | "Running";
        @lroStatusMetadata progress?: int32;
        @lroResult result: Page;
      }
      @list @route("/jobs") @post op start(): {
        @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
        @body body: Page;
      };
    `,
      { "lro-metadata-pollers": true, "inject-spans": true },
    );
    const client = files.get("zz_lro_client.go")!;
    expect(client).toContain("runtime.Pager[");
    expect(client).toContain("Response: &pager");
    expect(files.get("zz_responses.go")).toContain("StatusMetadata()");
  });

  it("diagnoses response-body polling URLs unsupported by azcore", async () => {
    await expect(
      emitGoFor(
        `
      @service namespace Lro;
      model Monitor { @lroStatus status: global.Azure.Core.Foundations.OperationState; }
      @route("/jobs/{operationId}") @get
      op getStatus(@lroOperationId @path operationId: string): Monitor;
      @pollingOperation(getStatus) @route("/jobs") @post
      op start(): {
        @statusCode _: 202;
        @pollingLocation @body location: ResourceLocation<Monitor>;
      };
    `,
        { "lro-metadata-pollers": true },
      ),
    ).rejects.toThrow("LRO polling URLs in response bodies are not supported by the azcore poller");
  });
});
