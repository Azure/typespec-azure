import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Fake server runtime tests" })
@server(
  "{endpoint}",
  "Fake server endpoint",
  {
    endpoint: url,
  }
)
namespace Emitter.FakeServer;

/**
 * A typed scalar (text/plain) response. Exercised by the fake server's
 * text-body round-trip test and reused by the context-cancellation and
 * dispatch-race tests, which just need any operation to drive dispatch.
 */
@get
@route("/text-body-as-int")
op getInteger(): {
  @header contentType: "text/plain; charset=utf-8";
  @body body: int64;
};

/**
 * A path and query parameter, used to verify the fake server doesn't
 * double-decode percent-encoded values.
 */
@post
@route("/double-decode/{path}")
op doubleDecode(@path path: string, @query query: string): void;

/**
 * A path parameter that allows reserved characters (RFC 6570 reserved
 * expansion). The client skips url.PathEscape for these values, so the
 * fake must pass them through verbatim without url.PathUnescape.
 */
@get
@route("/reserved-chars/{+path}")
op reservedCharacters(@path path: string): void;

/**
 * A non-string (int32) path parameter, used to verify the fake parses
 * the numeric path value rather than treating it as a string.
 */
@get
@route("/int-path/{value}")
op intPath(@path value: int32): void;

/**
 * An enum backed by integer values.
 */
enum IntEnum {
  One: 1,
  Two: 2,
  Three: 3,
}

/**
 * A path parameter whose type is an int-based enum, used to verify the
 * fake parses the numeric path value and casts it to the enum type.
 */
@get
@route("/int-enum-path/{value}")
op intEnumPath(@path value: IntEnum): void;
