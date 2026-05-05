/**
 * A models-only TypeSpec package representing pre-generated common/shared types.
 *
 * Language emitters should generate this package independently, then services
 * that use `@alternateType` with `ExternalType` can reference the generated
 * package instead of re-generating these types inline.
 */
namespace CommonTypes;

/** A postal address. */
model Address {
  city: string;
  state: string;
}
