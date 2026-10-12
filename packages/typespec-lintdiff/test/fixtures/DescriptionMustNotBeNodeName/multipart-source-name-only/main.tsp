import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service(#{ title: "Test Service" })
namespace TestService;

@route("/uploads")
@doc("Submit text for processing.")
op upload(
  @header contentType: "multipart/form-data",
  @multipartBody body: {
    @doc("propName")
    propName: HttpPart<string, #{ name: "part_name" }>;

    @doc("The text submitted for processing.")
    meaningfulPart: HttpPart<string, #{ name: "meaningful_part" }>;
  },
): void;
