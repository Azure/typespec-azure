import "@typespec/http";
import "@typespec/events";
import "@typespec/streams";
import "@typespec/sse";

using TypeSpec.Http;
using TypeSpec.SSE;

@service
@server(
  "{endpoint}",
  "SSE regression endpoint",
  {
    endpoint: url,
  }
)
namespace Emitter.SseRegression;

model Info {
  message: string;
}

@TypeSpec.Events.events
union Events {
  @TypeSpec.Events.contentType("application/json")
  Info,

  @TypeSpec.Events.contentType("text/plain")
  @terminalEvent
  "[DONE]",
}

model EventResponse extends SSEStream<Events> {
  @header("x-stream-session") sessionToken: string;
  @header("x-stream-count") count: int32;
  @header("x-stream-time") timestamp: utcDateTime;
}

@get
@route("/events")
op receive(): EventResponse;

@TypeSpec.Events.events
union JsonEvents {
  Info,
  @TypeSpec.Events.contentType("application/json") @terminalEvent "[DONE]",
}

model JsonEventResponse extends SSEStream<JsonEvents> {
  @statusCode statusCode: 201;
  @header("x-stream") stream: string;
}

@get
@route("/json-events")
op jsonEvents(): JsonEventResponse;

@TypeSpec.Events.events
union TextEvents {
  text: string,
  @terminalEvent "[DONE]",
}

@get
@route("/text-events")
op textEvents(): SSEStream<TextEvents>;

model TextEnvelope {
  @TypeSpec.Events.data @TypeSpec.Events.contentType("text/plain") e: string;
}

@TypeSpec.Events.events
union TextEnvelopeEvents {
  text: TextEnvelope,
}

@get
@route("/text-envelopes")
op textEnvelopes(): SSEStream<TextEnvelopeEvents>;

model Completion {
  total: int32;
}

@TypeSpec.Events.events
union CompletionEvents {
  @TypeSpec.Events.contentType("application/json")
  @terminalEvent
  Completion,
}

@get
@route("/complete")
op complete(): SSEStream<CompletionEvents>;

model General {
  kind: string;
  message: string;
  details: string;
}

model Connected {
  kind: "connected";
  message: string;
}

model Disconnected {
  kind: "disconnected";
  message: string;
}

model LateA {
  a: string;
  b: string;
  c: string;
  d: string;
  kind: "late-a";
}

model LateB {
  a: string;
  b: string;
  c: string;
  d: string;
  kind: "late-b";
  zHint?: "hint";
}

model Metrics {
  value: int32;
  unit: string;
}

model Status {
  state: string;
}

@TypeSpec.Events.events
union BestFitEvents {
  General,
  Connected,
  @terminalEvent Disconnected,
  LateA,
  LateB,
  Metrics,
  Status,
  named: Info,
  @TypeSpec.Events.contentType("text/plain") @terminalEvent "[DONE]",
}

@get
@route("/best-fit")
op bestFit(): SSEStream<BestFitEvents>;

model Enabled {
  @encodedName("application/json", "enabled") flag: true;
  code: 1;
  label: string;
}

model Disabled {
  @encodedName("application/json", "enabled") flag: false;
  code: 0;
  label: string;
}

union LiteralValues {
  Enabled,
  Disabled,
}

@post
@route("/literal-values")
op literalValues(@body body: LiteralValues): LiteralValues;

model ConnectedEnvelope {
  @TypeSpec.Events.data payload: Connected;
}

model DisconnectedEnvelope {
  @TypeSpec.Events.data payload: Disconnected;
}

@TypeSpec.Events.events
union EnvelopeEvents {
  ConnectedEnvelope,
  @terminalEvent DisconnectedEnvelope,
}

@get
@route("/envelopes")
op envelopes(): SSEStream<EnvelopeEvents>;

@TypeSpec.Events.events
union RecordEvents {
  Connected,
  Record<string>,
}

@get
@route("/records")
op records(): SSEStream<RecordEvents>;

model TimestampEnvelope {
  @TypeSpec.Events.data
  @TypeSpec.Events.contentType("application/json")
  timestamp: utcDateTime;
}

@TypeSpec.Events.events
union NamedEvents {
  first: Info,
  second: Info,
  timestamp: TimestampEnvelope,
}

@get
@route("/named")
op named(): SSEStream<NamedEvents>;

@TypeSpec.Events.events
union LiteralEvents {
  first: "one",
  second: "two",
}

@get
@route("/literals")
op literals(): SSEStream<LiteralEvents>;

model OptionalConnected {
  kind: "connected";
  detail?: string;
}

model OptionalDisconnected {
  kind: "disconnected";
}

model OptionalPayload {
  detail?: string;
  note?: string;
  extra?: string;
}

model RequiredPayload {
  id: string;
}

@TypeSpec.Events.events
union OptionalEvents {
  OptionalConnected,
  OptionalDisconnected,
  OptionalPayload,
  RequiredPayload,
}

@get
@route("/optional")
op optional(): SSEStream<OptionalEvents>;

union Batch {
  Events[],
  string,
}

model BatchRequest {
  batch: Batch;
}

@post
@route("/batch")
op batch(@body body: BatchRequest): void;
