import "@typespec/http";

using TypeSpec.Http;

@service(#{ title: "Fake server runtime tests" })
@server("{endpoint}", "Fake server endpoint", {
  endpoint: url,
})
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
