using Http;
using OpenAPI;

@service(#{ title: "App Config Service" })
namespace AppConfig;

@doc("Used for /kv endpoints (key in query)")
model KeyFilters {
  @doc("A filter for the name of the returned keys.")
  @query
  key?: string;

  @doc("A filter used to match labels")
  @query
  label?: string;
}

@doc("Used for /kv/{id} endpoints (key in path)")
model KeyWithFilters {
  @doc("A filter for the name of the returned keys.")
  @path
  key: string;

  @doc("A filter used to match labels")
  @query
  label?: string;
}

@route("/kv")
namespace KeyValuesResource {
  @doc("Gets a list of key-values.")
  @operationId("GetKeyValues")
  @get
  op list(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...AcceptDatetimeHeader,
    ...KeyFilters,

    @doc("Instructs the server to return elements that appear after the element referred to by the specified token.")
    @query
    After: plainDate,

    @doc("Used to select what fields are present in the returned resource(s).")
    @query(#{ explode: true })
    $Select?: KeyField[],
  ): {
    ...Response<200>;
    ...SyncTokenHeader;

    @header
    contentType: "application/vnd.microsoft.appconfig.keyset+json" | "application/json";

    @body body: Page<KeyValue>;
  } | Error;

  @doc("Gets a list of key-values.")
  @operationId("CheckKeyValues")
  @head
  op listHead(
    ...AcceptDatetimeHeader,
    ...KeyFilters,

    @doc("Instructs the server to return elements that appear after the element referred to by the specified token.")
    @query
    After: plainDate,

    @doc("Used to select what fields are present in the returned resource(s).")
    @query(#{ explode: true })
    $Select?: KeyField[],
  ): {
    ...Response<200>;
    ...SyncTokenHeader;
  } | Error;

  @doc("Gets a single key-value.")
  @operationId("GetKeyValue")
  @get
  op read(
    ...ETagHeaders,
    ...AcceptDatetimeHeader,
    ...KeyWithFilters,

    @doc("Used to select what fields are present in the returned resource(s).")
    @query(#{ explode: true })
    $Select?: KeyField[],
  ): {
    ...Response<200>;
    ...KeyValueHeaders;

    @header
    contentType: "application/vnd.microsoft.appconfig.kv+json" | "application/json";

    @body body: KeyValue;
  } | Error;

  @doc("Requests the headers and status of the given resource.")
  @operationId("CheckKeyValue")
  @head
  op readHead(...ETagHeaders, ...AcceptDatetimeHeader, ...KeyWithFilters): {
    ...Response<200>;
    ...SyncTokenHeader;
    ...LastModifiedHeader;
  } | Error;

  @doc("Creates a key-value.")
  @operationId("PutKeyValue")
  @put
  op createOrUpdate(
    ...ETagHeaders,
    ...KeyWithFilters,
    @header contentType:
      | "application/vnd.microsoft.appconfig.kv+json"
      | "application/vnd.microsoft.appconfig.kvset+json"
      | "application/json"
      | "text/json"
      | "application/*+json"
      | "application/json-patch+json",
    @body entity: KeyValue,
  ): {
    ...Response<200>;
    ...KeyValueHeaders;

    @header
    contentType: "application/vnd.microsoft.appconfig.kv+json" | "application/json";

    @body body: KeyValue;
  } | Error;

  @doc("Updates a key-value pair")
  @operationId("UpdateKeyValue")
  @post
  op createOrUpdate2(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...ETagHeaders,
    ...KeyWithFilters,
    @header contentType: "application/json-patch+json",
    @body jsonPatch: string[],
  ): {
    ...Response<200>;
    ...KeyValueHeaders;

    @header
    contentType: "application/vnd.microsoft.appconfig.kv+json" | "application/json";

    @body body: KeyValue;
  } | Error;

  @doc("Deletes a key-value.")
  @operationId("DeleteKeyValue")
  @delete
  op delete(...ApiVersion, ...SyncTokenHeader, ...KeyWithFilters, @header ifMatch: string): {
    ...Response<200>;
    ...SyncTokenHeader;
    ...ETagHeader;

    @header
    contentType: "application/vnd.microsoft.appconfig.kv+json" | "application/json";

    @body body: KeyValue;
  } | {
    ...Response<204>;
    ...SyncTokenHeader;
  } | Error;
}
