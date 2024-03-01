using TypeSpec.Reflection;

namespace Autorestcanonical;

/**
 * `@useRef` - is used to replace the TypeSpec model type in emitter output with a pre-existing named OpenAPI schema such as ARM common types.
 *
 * `@useRef` can be specified on Models and ModelProperty.
 *
 * @param jsonRef - path or Uri to an OpenAPI schema.
 */
extern dec useRef(entity: Model | ModelProperty, jsonRef: valueof string);
