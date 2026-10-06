import "../dist/src/index.js";

using Reflection;

namespace Azurite;

/**
 * Marks a model property as optional for Azurite without editing the shared service TypeSpec.
 *
 * @param target The model property to make optional.
 */
extern dec makeOptional(target: ModelProperty);
