import "@typespec/http";
import "@azure-tools/typespec-autorest";

using TypeSpec.Http;

@service
namespace Test;

@delete
@route("/widgets")
op remove(): void;
