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
    @doc(" Part_Name. ")
    propName: HttpPart<string, #{ name: "part_name" }>;

    @doc("defaultPart")
    defaultPart: HttpPart<string>;
  },
): void;
