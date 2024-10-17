using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace AppConfig;

@route("/labels")
namespace LabelsResource {
  @doc("Gets a list of labels.")
  @operationId("GetLabels")
  @get
  op list(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...AcceptDatetimeHeader,
    @query name?: string,
    @query after?: string,
  ): {
    ...Response<200>;
    ...SyncTokenHeader;

    @header
    contentType: "application/vnd.microsoft.appconfig.labelset+json" | "application/json";

    @body body: Page<Label>;
  } | Error;

  @doc("Requests the headers and status of the given resource.")
  @operationId("CheckLabels")
  @head
  op listHead(
    ...ApiVersion,
    ...SyncTokenHeader,
    ...AcceptDatetimeHeader,
    @query name?: string,
    @query after?: string,

    @query(#{ explode: true })
    $Select?: LabelField[],
  ): {
    ...Response<200>;
    ...SyncTokenHeader;
  } | Error;
}
