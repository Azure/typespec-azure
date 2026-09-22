import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace TestService;

model HeaderFields {
  @header etag: string;
  value: string;
}

model StatusFields {
  @statusCode status: 200;
  value: string;
}

@get
@route("/header-widgets")
op readHeader(): {
  ...HeaderFields;
  @statusCode status: 200;
};

@get
@route("/status-widgets")
op readStatus(): {
  ...StatusFields;
  @header etag: string;
};
