// Test: compliant
// Compliance: TypeSpec CANNOT violate MissingTypeObject. The autorest
// emitter always generates type: "object" for model definitions that
// have properties. Even models using allOf or additionalProperties
// get the type field set correctly.

import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi";
import "@typespec/versioning";
import "@azure-tools/typespec-autorest";
import "@azure-tools/typespec-azure-core";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core;

@service(#{ title: "Test Service" })
@versioned(Versions)
namespace TestService;

enum Versions {
  v2024_01_01: "2024-01-01",
}

@doc("A widget")
model Widget {
  @doc("ID")
  id: string;

  @doc("Name")
  name: string;
}

@route("/widgets")
interface Widgets {
  @doc("List widgets")
  @get list(): Widget[];

  @doc("Get a widget")
  @get read(@path @doc("Widget ID") id: string): Widget;

  @doc("Create a widget")
  @post create(@body @doc("Widget body") widget: Widget): Widget;

  @doc("Delete a widget")
  @delete remove(@path @doc("Widget ID") id: string): void;
}
