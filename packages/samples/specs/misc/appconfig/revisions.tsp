using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace AppConfig;

@route("/revisions")
namespace RevisionsResource {
  @doc("Gets a list of revisions.")
  @operationId("GetRevisions")
  @get
  op list(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...AcceptDatetimeHeader,

    @doc("Used to select what fields are present in the returned resource(s).")
    @query({
      format: "multi",
    })
    $Select?: KeyField[],

    @doc("A filter used to match labels")
    @query
    label: string,

    @doc("A filter used to match keys.")
    @query
    key: string,
  ): {
    ...Response<200>;
    ...SyncTokenHeader;

    @header
    contentType: "application/vnd.microsoft.appconfig.kvset+json" | "application/json";

    @body body: Page<KeyValue>;
  } | Error;

  @doc("Requests the headers and status of the given resource.")
  @operationId("CheckRevisions")
  @head
  op listHead(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...AcceptDatetimeHeader,
    @query name: string,
    @query after: string,
  ): {
    ...Response<200>;
    ...SyncTokenHeader;
  } | Error;
}
