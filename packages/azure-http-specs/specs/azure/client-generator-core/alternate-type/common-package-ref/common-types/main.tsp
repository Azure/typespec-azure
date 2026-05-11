import "@typespec/http";
import "@typespec/spector";

using Http;
using Spector;

/**
 * A models-only TypeSpec package representing pre-generated common/shared types.
 *
 * Language emitters should generate this package independently, then services
 * that use `@alternateType` with `ExternalType` can reference the generated
 * package instead of re-generating these types inline.
 */
@scenarioService("/azure/client-generator-core/alternate-type/common-package-ref/common-types")
@service
namespace _Specs_.Azure.ClientGenerator.Core.AlternateType.CommonPackageRef.CommonTypes;

/** A postal address. */
model Address {
  city: string;
  state: string;
}
