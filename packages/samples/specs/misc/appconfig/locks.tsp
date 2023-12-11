using TypeSpec.Http;
using TypeSpec.OpenAPI;

namespace AppConfig;

@route("/locks")
namespace LocksResource {
  @operationId("GetLock")
  @get
  op read(
    ...ApiVersion,
    ...SyncTokenHeader,
    @path key: string,
    @query label: string,
    ...ETagHeaders,
  ): {
    ...Response<200>;
    ...SyncTokenHeader;
    @body body: KeyValue;
  } | Error;

  @operationId("DeleteLock")
  @delete
  op delete(
    ...ApiVersion,
    ...SyncTokenHeader,
    @path key: string,
    @query label: string,
    ...ETagHeaders,
  ): {
    ...Response<200>;
    ...SyncTokenHeader;
    @body body: KeyValue;
  } | Error;
}
