import { createSseStream } from "@azure/core-sse";

/**
 * Describes how to handle a single Server-Sent Event variant when decoding an
 * SSE (`text/event-stream`) response.
 */
export interface SseEventDescriptor<T> {
  /**
   * The SSE `event:` field name this descriptor handles. `undefined` matches the unnamed
   * `message` event (variants with no event name).
   */
  eventName?: string;
  /** Whether receiving this event terminates the stream. */
  isTerminal: boolean;
  /**
   * For terminal events carrying a constant sentinel value, the raw `data` string that
   * marks termination. When set, the stream stops as soon as an event with this data is seen.
   */
  terminalValue?: string;
  /**
   * The content type of the event's `data` payload (e.g. `application/json`, `text/plain`).
   * JSON payloads are parsed before deserialization; non-JSON payloads are passed through as
   * the raw `data` string. Defaults to JSON when omitted.
   */
  contentType?: string;
  /**
   * Deserializes the event's `data` payload into the target type. The input is the JSON-parsed
   * value for JSON payloads, or the raw `data` string otherwise. Omitted for payload-less
   * terminal events.
   */
  deserialize?: (data: any) => T;
}

function isJsonContentType(contentType: string | undefined): boolean {
  return contentType === undefined || /\bjson\b/i.test(contentType);
}

/**
 * Decodes a Server-Sent Events (SSE, `text/event-stream`) response body, dispatching each
 * event to the matching {@link SseEventDescriptor} by its `event:` name and yielding the
 * deserialized payload. Iteration stops when a terminal event is received; terminal events
 * are not yielded unless they declare a payload deserializer.
 *
 * Terminal events are identified by their event descriptor's `isTerminal` flag. Additionally,
 * if a terminal descriptor specifies a `terminalValue` (constant sentinel), the stream only
 * terminates when an event with that specific event name carries that sentinel data.
 */
export async function* readSseStream<T>(
  body: AsyncIterable<Uint8Array | string> | undefined,
  descriptors: SseEventDescriptor<T>[],
): AsyncIterable<T> {
  if (!body) {
    return;
  }
  const named = new Map<string, SseEventDescriptor<T>>();
  let unnamed: SseEventDescriptor<T> | undefined;
  for (const descriptor of descriptors) {
    if (descriptor.eventName !== undefined) {
      named.set(descriptor.eventName, descriptor);
    } else if (descriptor.terminalValue === undefined) {
      // Only treat unnamed descriptors without terminalValue as the default unnamed handler.
      unnamed = descriptor;
    }
  }

  const stream = createSseStream(body as any);
  for await (const event of stream) {
    const descriptor = named.get(event.event) ?? unnamed;
    if (!descriptor) {
      continue;
    }

    // Check if this is a terminal event with a sentinel value that should terminate the stream.
    if (descriptor.terminalValue !== undefined && descriptor.terminalValue === event.data) {
      return;
    }

    if (descriptor.deserialize) {
      let payload: unknown;
      if (!event.data) {
        payload = undefined;
      } else if (isJsonContentType(descriptor.contentType)) {
        try {
          payload = JSON.parse(event.data);
        } catch (error) {
          const eventName = event.event || "message";
          throw new Error(`Unable to deserialize event "${eventName}".`, {
            cause: error,
          });
        }
      } else {
        payload = event.data;
      }
      yield descriptor.deserialize(payload);
    }

    // Terminal event: stop iteration after yielding (if any payload).
    if (descriptor.isTerminal) {
      return;
    }
  }
}
