import "@typespec/http";
import "@azure-tools/typespec-azure-core";

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

@route("/uri/simple/{value}")
op simpleArray(value: string[]): void;
@route("/uri/simple-map/{value}")
op simpleMap(value: Record<int32>): void;
@route("/uri/simple-explode/{value*}")
op simpleExplodedMap(value: Record<int32>): void;
@route("/uri/path{/value}")
op pathArray(value: string[]): void;
@route("/uri/path-explode{/value*}/end")
op pathExplodedArray(value: string[]): void;
@route("/uri/path-map{/value*}")
op pathExplodedMap(value: Record<int32>): void;
@route("/uri/label{.value}")
op labelArray(value: string[]): void;
@route("/uri/label-explode{.value*}")
op labelExplodedArray(value: string[]): void;
@route("/uri/label-map{.value*}")
op labelExplodedMap(value: Record<int32>): void;
@route("/uri/matrix{;value}")
op matrixArray(value: string[]): void;
@route("/uri/matrix-explode{;value*}")
op matrixExplodedArray(value: string[]): void;
@route("/uri/matrix-map{;value}")
op matrixMap(value: Record<int32>): void;
@route("/uri/matrix-map-explode{;value*}")
op matrixExplodedMap(value: Record<int32>): void;
@route("/uri/label-scalar{.value}")
op labelScalar(value: string): void;
@route("/uri/matrix-scalar{;value}")
op matrixScalar(value: int32): void;
@route("/uri/path-scalar{/value}")
op pathScalar(value: string): void;
@route("/uri/typed-array{/value*}")
op typedArray(value: int32[]): void;
@route("/uri/time-array{/value*}")
op timeArray(value: utcDateTime[]): void;
@route("/uri/enum-array{/value*}")
op enumArray(value: IntEnum[]): void;
@route("/uri/bool-map{;value*}")
op boolMap(value: Record<boolean>): void;
@route("/uri/query-map{?value}")
op queryMap(value: Record<int32>): void;
@route("/uri/query-map-explode?fixed=true{&value*}")
op queryExplodedMap(value: Record<int32>): void;
@route("/uri/optional-query-map{?value}")
op optionalQueryMap(value?: Record<int32>): void;

model QueryFields {
  field: string;
  count?: int32;
  enabled?: boolean;
}
@route("/uri/query-object{?value}")
op queryObject(value: QueryFields): void;
@route("/uri/query-object-explode{?value*}")
op queryExplodedObject(value: QueryFields): void;
@route("/uri/optional-query-object{?value}")
op optionalQueryObject(value?: QueryFields): void;

model RequiredQueryFields {
  name: string;
  parts: string;
}
@route("/uri/query-groups/{name}{?rawQP,second}")
op queryGroups(
  @path name: string,
  rawQP: RequiredQueryFields,
  second: RequiredQueryFields,
  @query rawQueryValues: string,
  @query uriQueryKey: string,
): void;

model OptionalQueryFields {
  count?: int32;
}
@route("/uri/query-option-collisions{?first,second}")
op queryOptionCollisions(
  first: OptionalQueryFields,
  second: OptionalQueryFields,
  @query count?: int32,
  @query firstCount?: int32,
): void;

model SpreadMapsBody {
  values: Record<int32 | null>;
  numbers: Record<int32>;
  list: int32[];
  nested: Record<Record<int32 | null>>;
}
@post
@route("/spread-maps")
op spreadMaps(...SpreadMapsBody): void;

@encode(BytesKnownEncoding.base64url)
scalar URLBytes extends bytes;
model BytesQueryFields {
  value: URLBytes;
}
@route("/uri/bytes-object{?value}")
op bytesObject(value: BytesQueryFields): void;
@route("/uri/bytes-map{?value}")
op bytesMap(value: Record<URLBytes>): void;
@route("/uri/bytes-array{/value*}")
op bytesArray(value: URLBytes[]): void;
@route("/uri/bytes-scalar/{value}")
op bytesScalar(value: URLBytes): void;

model QueryPageOptions {
  @query includePending: boolean;
}
model QueryPage {
  @pageItems items: string[];
  @nextLink nextLink?: Azure.Core.Legacy.parameterizedNextLink<[QueryPageOptions.includePending]>;
}
@list
@route("/uri/query-paged-map{?value}")
op queryPagedMap(...QueryPageOptions, value: Record<int32>): QueryPage;
