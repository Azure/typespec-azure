import "../dist/src/index.js";

using Reflection;

namespace Azurite;

/**
 * Marks a model property as optional for Azurite without editing the shared service TypeSpec.
 *
 * @param target The model property to make optional.
 */
extern dec makeOptional(target: ModelProperty);

/**
 * Associates a TypeSpec operation with Azurite's existing Queue Operation enum member.
 *
 * @param target The operation to map.
 * @param name The existing Operation enum member name.
 */
extern dec operationEnumName(target: Operation, name: valueof string);

/**
 * Sets the dispatch pattern Azurite's queue context middleware uses for this operation.
 *
 * @param target The operation to map.
 * @param pattern The existing dispatch pattern, for example "/queue/messages".
 */
extern dec dispatchPattern(target: Operation, pattern: valueof string);
