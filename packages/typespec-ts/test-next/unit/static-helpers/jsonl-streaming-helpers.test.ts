import type { StreamableMethod } from "@azure-rest/core-client";
import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import {
  getStreamResponse as getBrowserStreamResponse,
  readJsonlStream as readBrowserJsonlStream,
} from "../../../static/static-helpers/streamingHelpers-browser.mjs";
import {
  getStreamResponse,
  readJsonlStream,
} from "../../../static/static-helpers/streamingHelpers.js";

const encoder = new TextEncoder();

async function* chunks(...values: (Uint8Array | string)[]) {
  yield* values;
}

async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of source) {
    values.push(value);
  }
  return values;
}

function nativeBody(values: Uint8Array[], cancel?: () => void | Promise<void>) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const value of values) {
        controller.enqueue(value);
      }
      if (!cancel) {
        controller.close();
      }
    },
    cancel,
  });
}

describe.each([
  ["Node", readJsonlStream],
  ["browser", readBrowserJsonlStream],
] as const)("%s JSONL decoding", (_, decode) => {
  it("decodes lazily and maps each model exactly once", async () => {
    const read = vi.fn();
    const deserialize = vi.fn((value: { wire_name: string }) => ({ name: value.wire_name }));
    const body = (async function* () {
      read();
      yield '{"wire_name":"first"}\n{"wire_name":"second"}\n';
    })();
    const result = decode(body, deserialize);
    expect(read).not.toHaveBeenCalled();
    expect(deserialize).not.toHaveBeenCalled();
    expect(await collect(result)).toEqual([{ name: "first" }, { name: "second" }]);
    expect(read).toHaveBeenCalledOnce();
    expect(deserialize).toHaveBeenCalledTimes(2);
  });

  it("handles split UTF-8, blank lines, CRLF and a final line without a newline", async () => {
    const bytes = encoder.encode('\r\n \n{"value":"café 🌍"}\r\n\n{"value":"final"}');
    expect(
      await collect(decode(chunks(...Array.from(bytes, (byte) => Uint8Array.of(byte))), (v) => v)),
    ).toEqual([{ value: "café 🌍" }, { value: "final" }]);
  });

  it("flushes pending UTF-8 before a string chunk instead of reordering it", async () => {
    expect(
      await collect(
        decode(
          chunks(
            encoder.encode('{"value":"'),
            Uint8Array.of(0xc3),
            'string"}\n',
            encoder.encode('"next"'),
          ),
          (v) => v,
        ),
      ),
    ).toEqual([{ value: "�string" }, "next"]);
  });

  it("flushes an incomplete trailing UTF-8 sequence at EOF", async () => {
    await expect(
      collect(decode(chunks(encoder.encode('{"value":1}\n'), Uint8Array.of(0xc3)), (v) => v)),
    ).rejects.toBeInstanceOf(SyntaxError);
  });

  it.each(["{invalid}\n", '{"valid":true}\n{invalid}'])(
    "rejects malformed JSON: %s",
    async (body) => {
      await expect(collect(decode(chunks(body), (v) => v))).rejects.toBeInstanceOf(SyntaxError);
    },
  );

  it("handles an absent or empty body", async () => {
    expect(await collect(decode(undefined, (v) => v))).toEqual([]);
    expect(await collect(decode(chunks("\n\r\n  "), (v) => v))).toEqual([]);
  });

  it("preserves model mapper failures and closes the source", async () => {
    const error = new Error("mapper failed");
    const close = vi.fn();
    const body = (async function* () {
      try {
        yield "{}\n";
      } finally {
        close();
      }
    })();
    await expect(
      collect(
        decode(body, () => {
          throw error;
        }),
      ),
    ).rejects.toBe(error);
    expect(close).toHaveBeenCalledOnce();
  });

  it("reports cleanup failure together with the original decoding error", async () => {
    const mappingError = new Error("mapper failed");
    const cleanupError = new Error("cleanup failed");
    const body: AsyncIterable<string> = {
      [Symbol.asyncIterator]() {
        return {
          next: async () => ({ done: false, value: "{}\n" }),
          return: async () => {
            throw cleanupError;
          },
        };
      },
    };
    const result = collect(
      decode(body, () => {
        throw mappingError;
      }),
    );
    await expect(result).rejects.toMatchObject({
      cause: mappingError,
      errors: [mappingError, cleanupError],
    });
  });
});

describe.each([
  ["Node", getStreamResponse],
  ["browser", getBrowserStreamResponse],
] as const)("%s JSONL HTTP response", (platform, getResponse) => {
  function method(
    status: string,
    headers: Record<string, string>,
    values?: (Uint8Array | string)[],
  ) {
    const read = vi.fn();
    const body =
      values === undefined
        ? undefined
        : platform === "Node"
          ? (async function* () {
              for (const value of values) {
                read();
                yield value;
              }
            })()
          : nativeBody(
              values.map((value) => (typeof value === "string" ? encoder.encode(value) : value)),
            );
    const response = { status, headers, body };
    return {
      response,
      read,
      streamable: {
        asNodeStream: async () => response,
        asBrowserStream: async () => response,
      } as unknown as StreamableMethod,
    };
  }

  it.each(["200", "201", "206"])("does not consume successful status %s", async (status) => {
    const fixture = method(status, {}, ["malformed\n"]);
    const result = await getResponse(fixture.streamable);
    expect(fixture.read).not.toHaveBeenCalled();
    if (platform === "browser") {
      expect((fixture.response.body as ReadableStream<Uint8Array>).locked).toBe(false);
    } else {
      expect(result.body).toBe(fixture.response.body);
    }
  });

  it("keeps an explicitly expected non-2xx status lazy", async () => {
    const fixture = method("304", {}, ["malformed\n"]);
    const result = await getResponse(fixture.streamable, ["304"]);
    expect(fixture.read).not.toHaveBeenCalled();
    if (platform === "browser") {
      expect((fixture.response.body as ReadableStream<Uint8Array>).locked).toBe(false);
    } else {
      expect(result.body).toBe(fixture.response.body);
    }
  });

  it("buffers an unexpected 2xx status for generated error handling", async () => {
    const fixture = method("202", { "content-type": "application/json" }, [
      '{"code":"Unexpected"}',
    ]);
    const result = await getResponse(fixture.streamable, ["200"]);
    expect(result.body).toEqual({ code: "Unexpected" });
    if (platform === "Node") {
      expect(fixture.read).toHaveBeenCalledOnce();
    } else {
      expect((fixture.response.body as ReadableStream<Uint8Array>).locked).toBe(false);
    }
  });

  it.each(["application/json", "Application/Problem+JSON; charset=utf-8"])(
    "buffers non-success %s bodies eagerly while preserving headers",
    async (contentType) => {
      const headers = { "Content-Type": contentType, "x-ms-error-code": "HeaderError" };
      const bytes = encoder.encode('{"code":"BodyError","message":"café 🌍"}');
      const fixture = method(
        "400",
        headers,
        Array.from(bytes, (byte) => Uint8Array.of(byte)),
      );
      const result = await getResponse(fixture.streamable);
      expect(result).toMatchObject({
        status: "400",
        body: { code: "BodyError", message: "café 🌍" },
      });
      expect(result.headers).toBe(headers);
      if (platform === "Node") {
        expect(fixture.read).toHaveBeenCalledTimes(bytes.length);
      } else {
        expect((fixture.response.body as ReadableStream<Uint8Array>).locked).toBe(false);
      }
    },
  );

  it.each(["application/xml", "text/plain", "application/jsonl"])(
    "preserves non-JSON %s error strings",
    async (contentType) => {
      const body = "<Error><Code>BadRequest</Code></Error>";
      const fixture = method("500", { "content-type": contentType }, [body]);
      expect((await getResponse(fixture.streamable)).body).toBe(body);
    },
  );

  it("keeps absent and empty error bodies undefined", async () => {
    for (const values of [undefined, []]) {
      const fixture = method("404", { "content-type": "application/json" }, values);
      expect((await getResponse(fixture.streamable)).body).toBeUndefined();
    }
  });

  it("flushes the error-body decoder at EOF", async () => {
    const fixture = method("500", { "content-type": "text/plain" }, [
      encoder.encode("error: "),
      Uint8Array.of(0xc3),
    ]);
    expect((await getResponse(fixture.streamable)).body).toBe("error: �");
  });
});

describe("Node JSONL stream cleanup", () => {
  it.each(["break", "parse", "mapper"])("destroys the readable after %s", async (exit) => {
    const body = Readable.from([exit === "parse" ? "invalid\n" : "{}\n", "{}\n"]);
    const stream = readJsonlStream(body, () => {
      if (exit === "mapper") {
        throw new Error("mapper failed");
      }
      return {};
    });
    const consume = async () => {
      for await (const _ of stream) {
        break;
      }
    };
    if (exit === "break") {
      await consume();
    } else {
      await expect(consume()).rejects.toThrow();
    }
    expect(body.destroyed).toBe(true);
  });

  it("preserves mixed bytes and strings in eagerly buffered error bodies", async () => {
    const response = await getStreamResponse({
      asNodeStream: async () => ({
        status: "400",
        headers: { "content-type": "application/json" },
        body: chunks(encoder.encode('{"message":"'), Uint8Array.of(0xc3), 'after"}'),
      }),
    } as unknown as StreamableMethod);
    expect(response.body).toEqual({ message: "�after" });
  });
});

describe("browser JSONL native reader cleanup", () => {
  async function response(body: ReadableStream<Uint8Array>) {
    return getBrowserStreamResponse({
      asBrowserStream: async () => ({ status: "200", headers: {}, body }),
    } as StreamableMethod);
  }

  it("cancels a pending read promptly when the adapter is closed", async () => {
    const cancel = vi.fn();
    const body = nativeBody([], cancel);
    const result = await response(body);
    const iterator = result.body![Symbol.asyncIterator]();
    const pending = iterator.next();
    expect(body.locked).toBe(true);
    await expect(iterator.return!()).resolves.toMatchObject({ done: true });
    await expect(pending).resolves.toMatchObject({ done: true });
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it.each(["break", "parse", "mapper"])("cancels and releases the lock on %s", async (exit) => {
    const cancel = vi.fn();
    const body = nativeBody([encoder.encode(exit === "parse" ? "invalid\n" : "{}\n{}\n")], cancel);
    const result = await response(body);
    const stream = readBrowserJsonlStream(result.body, () => {
      if (exit === "mapper") {
        throw new Error("mapper failed");
      }
      return {};
    });
    const consume = async () => {
      for await (const _ of stream) {
        break;
      }
    };
    if (exit === "break") {
      await consume();
    } else {
      await expect(consume()).rejects.toThrow();
    }
    expect(cancel).toHaveBeenCalledOnce();
    expect(body.locked).toBe(false);
  });

  it("releases the lock without cancellation on natural EOF", async () => {
    const body = nativeBody([encoder.encode("{}\n{}")]);
    const cancel = vi.fn();
    const getReader = body.getReader.bind(body);
    vi.spyOn(body, "getReader").mockImplementation(() => {
      const current = getReader();
      const nativeCancel = current.cancel.bind(current);
      vi.spyOn(current, "cancel").mockImplementation((reason) => {
        cancel(reason);
        return nativeCancel(reason);
      });
      return current;
    });
    const result = await response(body);
    expect(await collect(readBrowserJsonlStream(result.body, (v) => v))).toEqual([{}, {}]);
    expect(cancel).not.toHaveBeenCalled();
    expect(body.locked).toBe(false);
  });

  it("surfaces cancellation failure on consumer break and still releases the lock", async () => {
    const error = new Error("cancel failed");
    const body = nativeBody([encoder.encode("{}\n")], () => Promise.reject(error));
    const result = await response(body);
    await expect(
      (async () => {
        for await (const _ of readBrowserJsonlStream(result.body, (v) => v)) {
          break;
        }
      })(),
    ).rejects.toBe(error);
    expect(body.locked).toBe(false);
  });

  it("retains parse failure when cancellation also fails", async () => {
    const cancelError = new Error("cancel failed");
    const body = nativeBody([encoder.encode("invalid\n")], () => Promise.reject(cancelError));
    const result = await response(body);
    let failure: unknown;
    try {
      await collect(readBrowserJsonlStream(result.body, (v) => v));
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).cause).toBeInstanceOf(SyntaxError);
    expect((failure as AggregateError).errors[1]).toBe(cancelError);
    expect(body.locked).toBe(false);
  });

  it("preserves a native read failure and releases the reader", async () => {
    const error = new Error("read failed");
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.error(error);
      },
    });
    const result = await response(body);
    await expect(collect(readBrowserJsonlStream(result.body, (v) => v))).rejects.toBe(error);
    expect(body.locked).toBe(false);
  });

  it("reports both cancellation and release failures on early exit", async () => {
    const cancelError = new Error("cancel failed");
    const releaseError = new Error("release failed");
    const body = nativeBody([encoder.encode("{}\n")], () => Promise.reject(cancelError));
    const getReader = body.getReader.bind(body);
    vi.spyOn(body, "getReader").mockImplementation(() => {
      const reader = getReader();
      const release = reader.releaseLock.bind(reader);
      vi.spyOn(reader, "releaseLock").mockImplementation(() => {
        release();
        throw releaseError;
      });
      return reader;
    });
    const result = await response(body);
    await expect(
      (async () => {
        for await (const _ of readBrowserJsonlStream(result.body, (v) => v)) {
          break;
        }
      })(),
    ).rejects.toMatchObject({
      cause: cancelError,
      errors: [cancelError, releaseError],
    });
    expect(body.locked).toBe(false);
  });

  it("surfaces lock release failure without canceling a completed stream", async () => {
    const error = new Error("release failed");
    const body = nativeBody([]);
    const getReader = body.getReader.bind(body);
    const cancel = vi.fn();
    vi.spyOn(body, "getReader").mockImplementation(() => {
      const reader = getReader();
      vi.spyOn(reader, "cancel").mockImplementation(cancel);
      const release = reader.releaseLock.bind(reader);
      vi.spyOn(reader, "releaseLock").mockImplementation(() => {
        release();
        throw error;
      });
      return reader;
    });
    const result = await response(body);
    await expect(collect(readBrowserJsonlStream(result.body, (v) => v))).rejects.toBe(error);
    expect(cancel).not.toHaveBeenCalled();
    expect(body.locked).toBe(false);
  });
});
