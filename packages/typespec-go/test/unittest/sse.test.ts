// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("SSE connectors and resumption options", () => {
  const spec = `
    using TypeSpec.SSE;
    @service namespace Test;
    model Info { message: string; }
    @TypeSpec.Events.events union Events { message: Info }
    @route("/events") @get op receive(): SSEStream<Events>;
  `;

  it.each([false, true])("matches all unnamed object variants (dual use: %s)", async (dualUse) => {
    const files = await emitGoFor(`
      using TypeSpec.SSE;
      @service namespace Test;
      model General { kind: string; message: string; details: string; }
      model Connected { kind: "connected"; message: string; }
      model Disconnected { kind: "disconnected"; message: string; }
      model Named { note: string; }
      @TypeSpec.Events.events union Events {
        General,
        Connected,
        @terminalEvent Disconnected,
        named: Named,
        @TypeSpec.Events.contentType("text/plain") @terminalEvent "[DONE]",
      }
      @route("/events") @get op receive(): SSEStream<Events>;
      ${dualUse ? '@route("/json") @post op roundTrip(@body body: Events): Events;' : ""}
    `);
    const serde = files.get("zz_unions_serde.go")!;
    expect(serde).toContain('hasLiteralValue[string](rawMsg, "kind", "connected")');
    expect(serde).toContain('hasLiteralValue[string](rawMsg, "kind", "disconnected")');
    expect(serde.indexOf("return Events{Connected: &v}")).toBeLessThan(
      serde.indexOf("return Events{General: &v}"),
    );
    expect(serde).toContain("return Events{Connected: &v}, false, nil");
    expect(serde).toContain("return Events{Disconnected: &v}, true, nil");
    expect(serde).toContain("return Events{General: &v}, false, nil");
    expect(serde).toMatch(/case "named":[\s\S]*return Events\{Named: &v\}, false, nil/);
    expect(serde).toContain("could not determine variant for Events");
    expect(serde.match(/func hasRequiredFields\(/g)).toHaveLength(1);
    expect(serde.match(/func hasLiteralValue\[/g)).toHaveLength(1);
    if (dualUse) {
      expect(serde).toContain("UnmarshalJSON(data []byte)");
      expect(serde).toContain("err = json.Unmarshal(data, &e.Connected)");
    }
  });

  it("probes envelope payloads and preserves explicit message event dispatch", async () => {
    const files = await emitGoFor(`
      using TypeSpec.SSE;
      @service namespace Test;
      model Connected { kind: "connected"; message: string; }
      model Disconnected { kind: "disconnected"; message: string; }
      model ConnectedEnvelope { @TypeSpec.Events.data payload: Connected; }
      model DisconnectedEnvelope { @TypeSpec.Events.data payload: Disconnected; }
      model Named { note: string; }
      @TypeSpec.Events.events union Events {
        ConnectedEnvelope,
        @terminalEvent DisconnectedEnvelope,
        message: Named,
      }
      @route("/events") @get op receive(): SSEStream<Events>;
    `);
    const serde = files.get("zz_unions_serde.go")!;
    expect(serde).toContain('case "":');
    expect(serde).toContain('hasLiteralValue[string](rawMsg, "kind", "connected")');
    expect(serde).not.toContain('hasRequiredFields(rawMsg, "payload")');
    expect(serde).toContain(
      "return Events{ConnectedEnvelope: &ConnectedEnvelope{Payload: &v}}, false, nil",
    );
    expect(serde).toContain(
      "return Events{DisconnectedEnvelope: &DisconnectedEnvelope{Payload: &v}}, true, nil",
    );
    expect(serde).toMatch(/case "message":[\s\S]*return Events\{Named: &v\}, false, nil/);
  });

  it("rejects ambiguous unnamed non-object payloads rather than choosing one", async () => {
    await expect(
      emitGoFor(`
      using TypeSpec.SSE;
      @service namespace Test;
      model Info { message: string; }
      @TypeSpec.Events.events union Events {
        Info,
        @TypeSpec.Events.contentType("text/plain") string,
      }
      @route("/events") @get op receive(): SSEStream<Events>;
    `),
    ).rejects.toThrow("multiple unnamed events in union Events require JSON object payloads");
  });

  it("checks unnamed literal sentinels before decoding unnamed JSON events", async () => {
    const files = await emitGoFor(`
      using TypeSpec.SSE;
      @service namespace Test;
      model Info { message: string; }
      @TypeSpec.Events.events union Events {
        @TypeSpec.Events.contentType("application/json") Info,
        @TypeSpec.Events.contentType("text/plain") @terminalEvent "[DONE]",
      }
      @route("/events") @get op receive(): SSEStream<Events>;
    `);
    const serde = files.get("zz_unions_serde.go")!;
    expect(serde).toContain("return Events{}, false, io.EOF");
    expect(serde.indexOf('s == "[DONE]"')).toBeLessThan(serde.indexOf("json.Unmarshal("));
  });

  it.each([false, true])("retains unnamed terminal models (dual use: %s)", async (dualUse) => {
    const files = await emitGoFor(
      `
      using TypeSpec.SSE;
      @service namespace Test;
      model Completion { total: int32; }
      @TypeSpec.Events.events union Events {
        @TypeSpec.Events.contentType("application/json") @terminalEvent Completion,
      }
      @route("/events") @get op receive(): SSEStream<Events>;
      ${dualUse ? '@route("/json") @post op roundTrip(@body body: Events): Events;' : ""}
    `,
      { "generate-fakes": true },
    );
    expect(files.get("zz_unions.go")).toContain("Completion *Completion");
    const serde = files.get("zz_unions_serde.go");
    expect(serde).toContain("json.Unmarshal(frame.Data, &v)");
    expect(serde).toContain("return Events{Completion: &v}, true, nil");
    expect(files.get("fake/zz_sse_encoders.go")).toContain("e.Completion");
    if (dualUse) {
      expect(serde).toContain("UnmarshalJSON(data []byte)");
    }
  });

  it("populates modeled initial SSE response headers", async () => {
    const files = await emitGoFor(
      spec
        .replace(
          '@route("/events")',
          'model EventResponse extends SSEStream<Events> { @header("x-stream-session") sessionToken: string; } @route("/events")',
        )
        .replace("receive(): SSEStream<Events>", "receive(): EventResponse"),
    );
    const client = files.get("zz_test_client.go");
    expect(files.get("zz_responses.go")).toContain("SessionToken *string");
    expect(client).toContain('Header.Get("X-Stream-Session")');
    expect(client).toMatch(/\.SessionToken\s*=/);
    expect(client).toContain("initialResponse = httpResp");
    expect(client).toContain("client.receiveHandleResponse(initialResponse)");
    expect(client).toContain("_ = reader.Close()");
    expect(client).toContain("result.Stream = reader");
    expect(client).not.toContain("WithCaptureResponse");
    expect(client).not.toContain("UnmarshalAsJSON");
  });

  it("uses normal header parsing and collision-safe response locals", async () => {
    const files = await emitGoFor(
      spec
        .replace(
          '@route("/events")',
          'model EventResponse extends SSEStream<Events> { @header("x-stream-count") count: int32; @header("x-stream-time") timestamp: utcDateTime; } @route("/events")',
        )
        .replace("receive()", "receive(@query initialResponse: string, @query result: string)")
        .replace("): SSEStream<Events>", "): EventResponse"),
    );
    const client = files.get("zz_test_client.go");
    expect(client).toContain("var initialResponse1 *http.Response");
    expect(client).toContain("result1, err := client.receiveHandleResponse(initialResponse1)");
    expect(client).toContain("strconv.ParseInt(val, 10, 32)");
    expect(client).toContain("time.Parse(time.RFC1123, val)");
    expect(client).toContain("result.Count = &count");
    expect(client).toContain("result.Timestamp = &timestamp");
  });

  it("emits a last event ID header option without automatic reconnection", async () => {
    const files = await emitGoFor(spec, { "generate-fakes": true });
    const options = files.get("zz_options.go");
    expect(options).toContain("LastEventID string");
    expect(options).toContain("The default is empty");
    const client = files.get("zz_test_client.go");
    expect(client).toContain('options != nil && options.LastEventID != ""');
    expect(client).toContain('Header.Set("Last-Event-ID", options.LastEventID)');
    expect(client).toContain("connectionOptions := TestClientOpenReceiveOptions{}");
    expect(client).toContain("connectionOptions = *options");
    expect(client).toContain(
      "connect := func(ctx context.Context, lastEventID string) (io.ReadCloser, error)",
    );
    expect(client).toContain("connectionOptions.LastEventID = lastEventID");
    expect(client).toContain("httpResp, respErr := client.receive(ctx, &connectionOptions)");
    expect(client).toContain("streaming.NewSSEReader(ctx, connect,");
    expect(files.get("zz_responses.go")).toContain("*streaming.SSEReader[Events]");
    expect(files.get("zz_responses.go")).not.toContain("EventReader");
    expect(client).toContain("streaming.SSEHandler[Events]");
    expect(files.get("zz_unions_serde.go")).toContain("frame streaming.SSEFrame");
    expect(client).toContain(
      "&streaming.SSEReaderOptions{LastEventID: connectionOptions.LastEventID}",
    );
    expect(client).toContain(
      "receive(ctx context.Context, options *TestClientOpenReceiveOptions) (*http.Response, error)",
    );
    expect(client).toContain("return runtime.SSEResponse(httpResp, respErr, http.StatusOK)");
    expect(client).toContain("runtime.SkipBodyDownload(req)");
    expect(client).not.toContain("Reconnect:");
    expect(client).not.toContain("Connect:");
    expect(client).not.toContain("streaming.NewSSEReader(resp,");
    expect(client).not.toContain("options.LastEventID =");
    const server = files.get("fake/zz_test_server.go");
    expect(server).toContain('LastEventID: req.Header.Get("Last-Event-ID"),');
  });

  it("uses the actual options parameter name and avoids modeled field collisions", async () => {
    const files = await emitGoFor(
      spec.replace("receive()", "receive(@query options: string, @query lastEventID?: string)"),
      { "generate-fakes": true },
    );
    const options = files.get("zz_options.go");
    expect(options).toContain("LastEventID *string");
    expect(options).toContain("LastEventID1 string");
    const client = files.get("zz_test_client.go");
    expect(client).toContain('opts != nil && opts.LastEventID1 != ""');
    expect(client).toContain('Header.Set("Last-Event-ID", opts.LastEventID1)');
    expect(client).toContain('reqQP.Set("lastEventID"');
    expect(client).toContain("connectionOptions = *opts");
    expect(client).toContain("connectionOptions.LastEventID1 = lastEventID");
    expect(client).toContain(
      "httpResp, respErr := client.receive(ctx, options, &connectionOptions)",
    );
    expect(client).toContain(
      "&streaming.SSEReaderOptions{LastEventID: connectionOptions.LastEventID1}",
    );
    const server = files.get("fake/zz_test_server.go");
    expect(server).toContain('LastEventID1: req.Header.Get("Last-Event-ID"),');
  });

  it("avoids shadowing required request parameters in the connector", async () => {
    const files = await emitGoFor(
      spec.replace(
        "receive()",
        "receive(@query connectionOptions: string, @query connectionOptions1: string, @query connect: string, @query lastEventID: string, @query reader: string)",
      ),
    );
    const client = files.get("zz_test_client.go");
    expect(client).toContain("connectionOptions2 := TestClientOpenReceiveOptions{}");
    expect(client).toContain(
      "connect1 := func(ctx context.Context, lastEventID1 string) (io.ReadCloser, error)",
    );
    expect(client).toContain("connectionOptions2.LastEventID = lastEventID1");
    expect(client).toContain(
      "httpResp, respErr := client.receive(ctx, connectionOptions, connectionOptions1, connect, lastEventID, reader, &connectionOptions2)",
    );
    expect(client).toContain("reader1, err := streaming.NewSSEReader(ctx, connect1,");
    expect(client).toContain("return TestClientOpenReceiveResponse{Stream: reader1}, nil");
  });

  it("preserves required request bodies and optional request parameters", async () => {
    const files = await emitGoFor(
      spec
        .replace("model Info", "model Request { query: string; } model Info")
        .replace(
          "@get op receive()",
          "@post op receive(@body request: Request, @query filter?: string)",
        ),
    );
    const client = files.get("zz_test_client.go");
    expect(client).toContain(
      "httpResp, respErr := client.receive(ctx, request, &connectionOptions)",
    );
    expect(client).toContain("connectionOptions = *options");
    expect(client).toContain("runtime.MarshalAsJSON(req, request)");
    expect(client).toContain('reqQP.Set("filter"');
  });

  it("passes authored success status codes to the runtime helper", async () => {
    const files = await emitGoFor(
      spec
        .replace(
          '@route("/events")',
          'model AcceptedStream extends SSEStream<Events> { @statusCode statusCode: 201 | 202; } @route("/events")',
        )
        .replace("receive(): SSEStream<Events>", "receive(): AcceptedStream"),
    );
    const client = files.get("zz_test_client.go");
    expect(client).toContain(
      "return runtime.SSEResponse(httpResp, respErr, http.StatusCreated, http.StatusAccepted)",
    );
    expect(client).not.toContain("runtime.SSEResponse(httpResp, respErr, http.StatusOK)");
  });

  it("passes the operation context to the reader when tracing and fakes are enabled", async () => {
    const files = await emitGoFor(spec, { "generate-fakes": true, "inject-spans": true });
    const client = files.get("zz_test_client.go");
    expect(client).toContain(
      "ctx = context.WithValue(ctx, runtime.CtxAPINameKey{}, operationName)",
    );
    expect(client).toContain("ctx, endSpan := runtime.StartSpan(ctx, operationName,");
    expect(client).toContain("streaming.NewSSEReader(ctx, connect,");
    expect(client).toContain("httpResp, respErr := client.receive(ctx, &connectionOptions)");
    expect(client).not.toContain("resp.Request.Context()");
  });

  it("distinguishes hidden literal sentinels from terminal model payloads", async () => {
    const files = await emitGoFor(`
      using TypeSpec.SSE;
      @service namespace Test;
      model Progress { message: string; }
      model Completion { total: int32; }
      @TypeSpec.Events.events union Events {
        progress: Progress,
        @terminalEvent complete: Completion,
        @TypeSpec.Events.contentType("text/plain") @terminalEvent "[DONE]",
      }
      @route("/events") @get op receive(): SSEStream<Events>;
    `);
    const serde = files.get("zz_unions_serde.go");
    expect(serde).toContain('"io"');
    expect(serde).toContain("return Events{}, false, io.EOF");
    expect(serde).toMatch(/case "complete":[\s\S]*?return Events\{Completion: &v\}, true, nil/);
    expect(serde).toContain("return Events{Progress: &v}, false, nil");
    expect(serde).not.toMatch(/return Events\{[^\n]*&s[^\n]*\}, true, nil/);
  });

  it.each([false, true])(
    "omits sentinel fields only for SSE-only unions (dual use: %s)",
    async (dualUse) => {
      const files = await emitGoFor(
        `
          using TypeSpec.SSE;
          @service namespace Test;
          model Info { message: string; }
          @TypeSpec.Events.events union Events {
            message: Info,
            @TypeSpec.Events.contentType("text/plain") @terminalEvent "[DONE]",
          }
          @route("/events") @get op receive(): SSEStream<Events>;
          ${dualUse ? '@route("/json") @post op roundTrip(@body body: Events): Events;' : ""}
        `,
        { "generate-fakes": true },
      );
      const unions = files.get("zz_unions.go");
      const encoder = files.get("fake/zz_sse_encoders.go");
      expect(encoder).not.toContain("Retry:");
      expect(unions).toContain("Info *Info");
      expect(files.get("zz_unions_serde.go")).toContain("return Events{}, false, io.EOF");
      if (dualUse) {
        expect(unions).toContain("LiteralString *string");
        expect(encoder).toContain("e.LiteralString");
        expect(files.get("zz_unions_serde.go")).toContain("MarshalJSON()");
        expect(files.get("zz_unions_serde.go")).toContain("UnmarshalJSON(data []byte)");
        expect(files.get("zz_unions_serde.go")).toContain(".LiteralString");
      } else {
        expect(unions).not.toContain("LiteralString");
        expect(encoder).not.toContain("LiteralString");
        expect(encoder).toContain("e.Info");
      }
    },
  );
});
