// Test: default-not-in-enum
// Compliance: TypeSpec CANNOT violate DefaultInEnum. The compiler
// enforces that default values must be assignable to the declared type,
// so an enum default must be a valid member of the enum. Attempting
// to set an invalid default causes a compile-time error.

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

@doc("Widget color options")
enum WidgetColor {
  @doc("Red")
  Red: "Red",

  @doc("Blue")
  Blue: "Blue",

  @doc("Green")
  Green: "Green",
}

@doc("A widget resource")
model Widget {
  @doc("The widget name")
  name: string;

  @doc("The color")
  color?: WidgetColor = WidgetColor.Red;
}

@route("/widgets")
interface Widgets {
  @doc("Get a widget")
  @get read(@path @doc("The widget name") name: string): Widget;
}
