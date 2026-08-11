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
  const terminalValues: SseEventDescriptor<T>[] = [];
  for (const descriptor of descriptors) {
    if (descriptor.terminalValue !== undefined) {
      terminalValues.push(descriptor);
    }
    if (descriptor.eventName !== undefined) {
      named.set(descriptor.eventName, descriptor);
    } else if (descriptor.terminalValue === undefined) {
      unnamed = descriptor;
    }
  }

  const stream = createSseStream(body as any);
  for await (const event of stream) {
    // Terminal sentinel carried in the event data (e.g. a constant literal variant).
    if (terminalValues.some((descriptor) => descriptor.terminalValue === event.data)) {
      return;
    }
    const descriptor = named.get(event.event) ?? unnamed;
    if (!descriptor) {
      continue;
    }
    if (descriptor.deserialize) {
      const payload = event.data
        ? isJsonContentType(descriptor.contentType)
          ? JSON.parse(event.data)
          : event.data
        : undefined;
      yield descriptor.deserialize(payload);
    }
    if (descriptor.isTerminal) {
      return;
    }
  }
}
