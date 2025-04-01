using Http;
using OpenAPI;

namespace AppConfig;

@route("/keys")
namespace KeysResource {
  @doc("Gets a list of keys.")
  @operationId("GetKeys")
  @get
  op list(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...AcceptDatetimeHeader,
    @query name: string,
    @header after: string,
  ): {
    ...Response<200>;
    ...SyncTokenHeader;
    @header contentType: "application/vnd.microsoft.appconfig.keyset+json" | "application/json";
    @body body: Page<Key>;
  } | Error;

  @doc("Requests the headers and status of the given resource.")
  @operationId("CheckKeys")
  @head
  op listHead(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...AcceptDatetimeHeader,
    @query name: string,
    @header after: string,
  ): {
    ...Response<200>;
    ...SyncTokenHeader;
  } | Error;
}
