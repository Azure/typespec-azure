namespace Azure.ResourceManager.Private;

/**
 * Describes the shape of strict constraint model to type check against `Resource` template
 *  parameter of ARM operation templates & base models.
 */
model ArmResourceTypeConstraint {
  id: string;
  name: string;
}
