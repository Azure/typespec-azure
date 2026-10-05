import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { clearContexts, useContext } from "../../src/context-manager.js";
import { emitModularOperationsFromTypeSpec } from "../util/emit-util.js";
import { createGeneratedRuntime } from "../util/generated-runtime.js";
import { clearCompileCache } from "../util/test-util.js";

const encoder = new TextEncoder();

interface RuntimeOperations {
  receive(context: unknown): Promise<AsyncIterable<{ value: string; timestamp: Date }>>;
  receiveXml(context: unknown): Promise<AsyncIterable<{ value: string; timestamp: Date }>>;
}

let sources: Map<string, string>;
let operationPath: string;

function loadGeneratedOperations(platform: "Node" | "browser"): RuntimeOperations {
  return createGeneratedRuntime(sources, {
    platform: platform === "Node" ? "node" : "browser",
  }).loadModule<RuntimeOperations>(operationPath);
}

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of source) {
    result.push(value);
  }
  return result;
}

beforeAll(async () => {
  const files = await emitModularOperationsFromTypeSpec(
    `
    model Info {
      @encodedName("application/json", "wire_value") value: string;
      timestamp: utcDateTime;
    }

    @error
    model ApiError {
      code: string;
      @encodedName("application/json", "wire_message") message: string;
      @header("x-ms-error-code") errorCode: string;
    }

    @error
    @mediaTypeHint("application/xml")
    model StorageError {
      @Xml.name("Code") code?: string;
      @Xml.name("Message") message?: string;
      @header("x-ms-error-code") errorCode: string;
    }

    @get @route("/receive")
    op receive(): JsonlStream<Info> | ApiError;

    @get @route("/receiveXml")
    op receiveXml(): JsonlStream<Info> | StorageError;
  `,
    { "include-headers-in-response": true, needTCGC: true },
  );
  expect(files).toBeDefined();
  operationPath = files![0]!.getFilePath();
  sources = new Map(
    useContext("outputProject")
      .getSourceFiles()
      .map((file) => [file.getFilePath(), file.getFullText()]),
  );
});

afterAll(() => {
  clearCompileCache();
  clearContexts();
});

describe.each(["Node", "browser"] as const)("generated %s JSONL operation runtime", (platform) => {
  function transport(
    status: string,
    headers: Record<string, string>,
    values: (Uint8Array | string)[],
    cancel?: () => void | Promise<void>,
  ) {
    const read = vi.fn();
    const close = vi.fn();
    const body =
      platform === "Node"
        ? (async function* () {
            try {
              for (const value of values) {
                read();
                yield value;
              }
            } finally {
              close();
            }
          })()
        : new ReadableStream<Uint8Array>({
            start(controller) {
              for (const value of values) {
                controller.enqueue(typeof value === "string" ? encoder.encode(value) : value);
              }
              if (!cancel) {
                controller.close();
              }
            },
            cancel,
          });
    const response = { status, headers, body };
    const method = {
      asNodeStream: vi.fn(async () => response),
      asBrowserStream: vi.fn(async () => response),
    };
    const get = vi.fn((_options: { headers: Record<string, string> }) => method);
    const context = { path: vi.fn(() => ({ get })) };
    return { context, method, get, body, read, close };
  }

  it("uses the real generated operation and model mapper with lazy split UTF-8 decoding", async () => {
    const bytes = encoder.encode(
      '\r\n\n{"wire_value":"café 🌍","timestamp":"2026-10-05T00:00:00Z"}\r\n \r\n' +
        '{"wire_value":"last","timestamp":"2026-10-06T00:00:00Z"}',
    );
    const fixture = transport(
      "200",
      { "content-type": "application/jsonl" },
      Array.from(bytes, (byte) => Uint8Array.of(byte)),
    );
    const operations = loadGeneratedOperations(platform);
    const result = await operations.receive(fixture.context);
    expect(fixture.context.path).toHaveBeenCalledWith("/receive");
    expect(fixture.get.mock.calls[0][0].headers.accept).toBe("application/jsonl");
    expect(fixture.read).not.toHaveBeenCalled();
    if (platform === "browser") {
      expect((fixture.body as ReadableStream<Uint8Array>).locked).toBe(false);
    }
    expect(await collect(result)).toEqual([
      { value: "café 🌍", timestamp: new Date("2026-10-05T00:00:00Z") },
      { value: "last", timestamp: new Date("2026-10-06T00:00:00Z") },
    ]);
    expect(
      fixture.method[platform === "Node" ? "asNodeStream" : "asBrowserStream"],
    ).toHaveBeenCalledOnce();
  });

  it.each(["application/json", "application/problem+json; charset=utf-8"])(
    "rejects eagerly with modeled %s error details and headers",
    async (contentType) => {
      const bytes = encoder.encode('{"code":"BodyCode","wire_message":"café failure"}');
      const fixture = transport(
        "400",
        { "content-type": contentType, "x-ms-error-code": "HeaderCode" },
        Array.from(bytes, (byte) => Uint8Array.of(byte)),
      );
      await expect(
        loadGeneratedOperations(platform).receive(fixture.context),
      ).rejects.toMatchObject({
        statusCode: 400,
        details: { code: "BodyCode", message: "café failure", errorCode: "HeaderCode" },
      });
      if (platform === "Node") {
        expect(fixture.read).toHaveBeenCalledTimes(bytes.length);
        expect(fixture.close).toHaveBeenCalledOnce();
      } else {
        expect((fixture.body as ReadableStream<Uint8Array>).locked).toBe(false);
      }
    },
  );

  it("preserves XML text for eager generated XML error enrichment", async () => {
    const fixture = transport(
      "500",
      { "content-type": "application/xml; charset=utf-8", "x-ms-error-code": "XmlHeaderCode" },
      [
        encoder.encode(
          "<StorageError><Code>XmlCode</Code><Message>XML failure</Message></StorageError>",
        ),
      ],
    );
    await expect(
      loadGeneratedOperations(platform).receiveXml(fixture.context),
    ).rejects.toMatchObject({
      statusCode: 500,
      details: { code: "XmlCode", message: "XML failure", errorCode: "XmlHeaderCode" },
    });
  });

  it("eagerly enriches an unexpected 2xx status using the operation's expected statuses", async () => {
    const fixture = transport(
      "202",
      { "content-type": "application/json", "x-ms-error-code": "UnexpectedStatus" },
      ['{"code":"BodyCode","wire_message":"unexpected success status"}'],
    );
    await expect(loadGeneratedOperations(platform).receive(fixture.context)).rejects.toMatchObject({
      statusCode: 202,
      details: {
        code: "BodyCode",
        message: "unexpected success status",
        errorCode: "UnexpectedStatus",
      },
    });
  });

  it("defers malformed JSON failure until iteration and closes the underlying stream", async () => {
    const cancel = vi.fn();
    const fixture = transport(
      "200",
      { "content-type": "application/jsonl" },
      ["invalid\n"],
      cancel,
    );
    const result = await loadGeneratedOperations(platform).receive(fixture.context);
    expect(fixture.read).not.toHaveBeenCalled();
    await expect(collect(result)).rejects.toBeInstanceOf(SyntaxError);
    if (platform === "Node") {
      expect(fixture.close).toHaveBeenCalledOnce();
    } else {
      expect(cancel).toHaveBeenCalledOnce();
      expect((fixture.body as ReadableStream<Uint8Array>).locked).toBe(false);
    }
  });

  it("closes the generated stream when the consumer stops after one model", async () => {
    const cancel = vi.fn();
    const fixture = transport(
      "200",
      { "content-type": "application/jsonl" },
      ['{"wire_value":"one","timestamp":"2026-10-05T00:00:00Z"}\n', "invalid\n"],
      cancel,
    );
    for await (const value of await loadGeneratedOperations(platform).receive(fixture.context)) {
      expect(value.value).toBe("one");
      break;
    }
    if (platform === "Node") {
      expect(fixture.read).toHaveBeenCalledOnce();
      expect(fixture.close).toHaveBeenCalledOnce();
    } else {
      expect(cancel).toHaveBeenCalledOnce();
      expect((fixture.body as ReadableStream<Uint8Array>).locked).toBe(false);
    }
  });

  it("propagates a real generated model mapper failure and closes the native source", async () => {
    const cancel = vi.fn();
    const fixture = transport("200", { "content-type": "application/jsonl" }, ["null\n"], cancel);
    const result = await loadGeneratedOperations(platform).receive(fixture.context);
    await expect(collect(result)).rejects.toBeInstanceOf(TypeError);
    if (platform === "Node") {
      expect(fixture.close).toHaveBeenCalledOnce();
    } else {
      expect(cancel).toHaveBeenCalledOnce();
      expect((fixture.body as ReadableStream<Uint8Array>).locked).toBe(false);
    }
  });
});
