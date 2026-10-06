import type { EventMessage } from "@azure/core-sse";

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
   * Whether receiving this event terminates the stream. Typed terminal payloads are yielded before
   * termination; constant terminal sentinels are consumed internally.
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
   * value for JSON payloads, or the raw `data` string otherwise. Omitted for constant terminal
   * sentinels, whose payloads are never yielded.
   */
  deserialize?: (data: any) => T;
}

function isJsonContentType(contentType: string | undefined): boolean {
  return contentType === undefined || /\bjson\b/i.test(contentType);
}

function resolveDescriptor<T>(
  event: EventMessage,
  descriptors: SseEventDescriptor<T>[],
): SseEventDescriptor<T> | undefined {
  if (event.event) {
    return (
      descriptors.find(
        (descriptor) =>
          descriptor.eventName === event.event &&
          descriptor.terminalValue !== undefined &&
          descriptor.terminalValue === event.data,
      ) ??
      descriptors.find(
        (descriptor) =>
          descriptor.eventName === event.event && descriptor.terminalValue === undefined,
      )
    );
  }
  return (
    descriptors.find(
      (descriptor) =>
        descriptor.eventName === undefined &&
        descriptor.terminalValue !== undefined &&
        descriptor.terminalValue === event.data,
    ) ??
    descriptors.find(
      (descriptor) => descriptor.eventName === undefined && descriptor.terminalValue === undefined,
    )
  );
}

/**
 * Decodes a Server-Sent Events (SSE, `text/event-stream`) response body, dispatching each
 * event to the matching {@link SseEventDescriptor} by its `event:` name and yielding the
 * deserialized payload.
 *
 * Terminal events end the stream. Typed terminal payloads are yielded before disconnecting;
 * constant `terminalValue` sentinels are consumed internally. A sentinel is only compared against
 * events with the same `event:` name, so an unrelated event carrying the same `data` cannot end
 * the stream.
 *
 * Events whose `event:` name matches no descriptor are ignored rather than being decoded by the
 * unnamed descriptor, so an unrecognized event can never be deserialized as the wrong type.
 * Payload mapping starts when the returned iterable is consumed. The one-connection source
 * parses raw SSE events but does not reconnect, resume event IDs, or apply retry delays.
 */
export async function* readSseStream<T>(
  events: AsyncIterable<EventMessage>,
  descriptors: SseEventDescriptor<T>[],
): AsyncIterable<T> {
  for await (const event of events) {
    const descriptor = resolveDescriptor(event, descriptors);
    if (!descriptor) {
      continue;
    }

    if (descriptor.terminalValue !== undefined) {
      if (descriptor.isTerminal) {
        return;
      }
      continue;
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
    if (descriptor.isTerminal) {
      return;
    }
  }
}
