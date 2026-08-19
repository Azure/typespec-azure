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
  /**
   * Whether receiving this event terminates the stream. Terminal events are consumed by the
   * reader and never yielded.
   */
  isTerminal: boolean;
  /**
   * For terminal events carrying a constant sentinel value, the raw `data` string that marks
   * termination. When set, only events matching this descriptor whose `data` equals this value
   * end the stream.
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
   * value for JSON payloads, or the raw `data` string otherwise. Omitted for terminal events,
   * whose payloads are never yielded.
   */
  deserialize?: (data: any) => T;
}

function isJsonContentType(contentType: string | undefined): boolean {
  return contentType === undefined || /\bjson\b/i.test(contentType);
}

/**
 * Decodes a Server-Sent Events (SSE, `text/event-stream`) response body, dispatching each
 * event to the matching {@link SseEventDescriptor} by its `event:` name and yielding the
 * deserialized payload.
 *
 * Terminal events end the stream and are never yielded: `@terminalEvent` marks the signal to
 * disconnect, so its payload is not part of the streamed data. A descriptor's `terminalValue`
 * (constant sentinel) is only compared against events with the same `event:` name, so an
 * unrelated event carrying the same `data` cannot end the stream.
 *
 * Events whose `event:` name matches no descriptor are ignored rather than being decoded by the
 * unnamed descriptor, so an unrecognized event can never be deserialized as the wrong type.
 */
export async function* readSseStream<T>(
  body: AsyncIterable<Uint8Array | string> | undefined,
  descriptors: SseEventDescriptor<T>[],
): AsyncIterable<T> {
  if (!body) {
    return;
  }
  const named = new Map<string, SseEventDescriptor<T>>();
  const unnamedTerminals: SseEventDescriptor<T>[] = [];
  let unnamed: SseEventDescriptor<T> | undefined;
  for (const descriptor of descriptors) {
    if (descriptor.eventName !== undefined) {
      named.set(descriptor.eventName, descriptor);
    } else if (descriptor.terminalValue !== undefined) {
      // A sentinel terminal shares the unnamed `message` event with the payload descriptor, so it
      // is matched on its `data` value before falling back to the unnamed payload handler.
      unnamedTerminals.push(descriptor);
    } else {
      unnamed = descriptor;
    }
  }

  const stream = createSseStream(body as any);
  for await (const event of stream) {
    // `@azure/core-sse` reports unnamed (`message`) events with an empty `event` field.
    const descriptor = event.event
      ? named.get(event.event)
      : (unnamedTerminals.find((candidate) => candidate.terminalValue === event.data) ?? unnamed);
    if (!descriptor) {
      continue;
    }

    // Terminal events are a disconnect signal, not stream data, so stop before deserializing.
    // A sentinel value narrows termination to events whose `data` matches it exactly.
    if (
      descriptor.isTerminal &&
      (descriptor.terminalValue === undefined || descriptor.terminalValue === event.data)
    ) {
      return;
    }

    if (descriptor.deserialize) {
      let payload: unknown;
      if (isJsonContentType(descriptor.contentType)) {
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
  }
}
