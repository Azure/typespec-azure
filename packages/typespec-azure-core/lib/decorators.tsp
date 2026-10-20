using Reflection;

namespace Azure.Core {
  /**
   * Adds audience selection or named challenge semantics to an existing OAuth authentication model.
   *
   * An Entra audience enum lists known resource values. Use the same enum for every language; it does not restrict custom audience input or prescribe a native SDK enum.
   *
   * Language emitters choose native audience APIs and preserve their existing input normalization and override precedence. Optional endpoint defaults use `@azureServiceEnvironments` with the same resource-to-scope binding.
   *
   * Every OAuth flow must already use the scope derived from the named default member. Resource values are preserved exactly; selecting an audience alone never derives or rewrites the service endpoint.
   *
   * Ordinary explicit scopes need no annotation and remain in the OAuth declaration.
   *
   * @param target The OAuth authentication model.
   * @param profile The Entra default-scope or named challenge profile.
   * @param audienceType The enum of known resource values for an Entra profile.
   */
  extern dec azureTokenAuthentication(
    target: Model,
    profile: valueof AzureTokenAuthenticationOptions,
    audienceType?: Enum
  );

  /**
   * Adds optional endpoint defaults to the same Entra audience-selection profile.
   *
   * Environments reference audience member names, not duplicate resource values. They declare shared cloud data, not a required native SDK cloud or options API.
   *
   * An explicit client endpoint overrides an environment endpoint without changing its audience. When no endpoint default is declared, ordinary service endpoint configuration applies; an audience resource does not identify a service instance.
   *
   * The optional default environment must use the default audience. Authority and tenant configuration remain the credential's responsibility.
   *
   * @param target The namespace or interface using the authentication model.
   * @param authentication The annotated Entra authentication model.
   * @param environments The named audience and optional endpoint records.
   * @param defaultEnvironment The name of the default environment, if any.
   */
  extern dec azureServiceEnvironments(
    target: Namespace | Interface,
    authentication: Model,
    environments: valueof Record<AzureServiceEnvironment>,
    defaultEnvironment?: valueof string
  );

  /**
   * Decorator that marks a Version EnumMember as a preview version.
   * This is used to indicate that the version is not yet stable and may change in future releases.

   * @param target The EnumMember that represents the preview version.
   * @example
   * ```typespec
   * @versioned(Versions)
   * @service(#{ title: "Widget Service" })
   * namespace DemoService;
   *
   * enum Versions {
   *   v1,
   *   v2,
   *   @previewVersion
   *   v3Preview
   * }
   * ```
   *
   */
  extern dec previewVersion(target: TypeSpec.Reflection.EnumMember);

  /**
   * Used for custom StatusMonitor implementation.
   * Identifies an Enum or ModelProperty as containing long-running operation
   * status.
   */
  extern dec lroStatus(entity: Enum | Union | ModelProperty);

  /**
   * Used for custom StatusMonitor implementation.
   * Identifies an EnumMember as a long-running "Succeeded" terminal state.
   */
  extern dec lroSucceeded(entity: EnumMember | UnionVariant);

  /**
   * Used for custom StatusMonitor implementation.
   * Identifies an EnumMember as a long-running "Canceled" terminal state.
   */
  extern dec lroCanceled(entity: EnumMember | UnionVariant);

  /**
   * Used for custom StatusMonitor implementation.
   * Identifies an enum member as a long-running "Failed" terminal state.
   */
  extern dec lroFailed(entity: EnumMember | UnionVariant);

  /**
   * Used for custom StatusMonitor implementation.
   * Identifies a model property of a StatusMonitor as containing the result
   * of a long-running operation that terminates successfully (Succeeded).
   */
  extern dec lroResult(entity: ModelProperty);

  /**
   * Used for custom StatusMonitor implementation.
   * Identifies a model property of a StatusMonitor as containing the result
   * of a long-running operation that terminates unsuccessfully (Failed).
   */
  extern dec lroErrorResult(entity: ModelProperty);

  /**
   * Identifies a model property as containing the location to poll for operation state.
   * @param options PollingOptions for the poller pointed to by this link.  Overrides
   * settings derived from property value it is decorating, if the value of the
   * property is ResourceLocation<Resource>
   */
  extern dec pollingLocation(entity: ModelProperty, options?: PollingOptions);

  /**
   * Identifies a ModelProperty as containing the final location for the operation result.
   * @param finalResult Sets the expected return value for the final result.  Overrides
   * any value provided in the decorated property, if the property uses ResourceLocation<Resource>.
   */
  extern dec finalLocation(entity: ModelProperty, finalResult?: Model | unknown | void);

  /**
   * Identifies an operation that is linked to the target operation.
   * @param linkedOperation The linked Operation
   * @param linkType A string indicating the role of the linked operation
   * @param parameters Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will
   * be passed to the linked operation request.
   */
  extern dec operationLink(
    entity: Operation,
    linkedOperation: Operation,
    linkType: valueof string,
    parameters?: {}
  );

  /**
   * Used to define how to call custom polling operations for long-running operations.
   *
   * @param targetParameter A reference to the polling operation parameter this parameter
   * provides a value for, or the name of that parameter. The default value is the name of
   * the decorated parameter or property.
   */
  extern dec pollingOperationParameter(
    entity: ModelProperty,
    targetParameter?: ModelProperty | string
  );

  /**
   * Identifies that an operation is a polling operation for an LRO.
   * @param linkedOperation The linked Operation
   * @param parameters Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will
   * be passed to the linked operation request.
   */
  extern dec pollingOperation(entity: Operation, linkedOperation: Operation, parameters?: {});

  /**
   * Identifies that an operation is the final operation for an LRO.
   * @param linkedOperation The linked Operation
   * @param parameters Map of `RequestParameter<Name>` and/or `ResponseProperty<Name>` that will
   * be passed to the linked operation request.
   */
  extern dec finalOperation(entity: Operation, linkedOperation: Operation, parameters?: {});

  /**
   * Overrides the final state value for an operation
   * @param finalState The desired final state value
   */
  extern dec useFinalStateVia(
    entity: Operation,
    finalState: valueof "original-uri" | "operation-location" | "location" | "azure-async-operation"
  );

  /**
   * Specifies that an array model or array-typed property should contain only unique items.
   */
  extern dec uniqueItems(entity: ModelProperty | Model);
}

namespace Azure.Core.Foundations {
  /**
   * Deletes any key properties from the model.
   */
  extern dec omitKeyProperties(entity: Model);

  /**
   * Identifies a property on a request model that serves as a linked operation parameter.
   * @param name Property name on the target
   */
  extern dec requestParameter(entity: Model, name: valueof string);

  /**
   * Identifies a property on *all* non-error response models that serve as a linked operation parameter.
   * @param name Property name on the target
   */
  extern dec responseProperty(entity: Model, name: valueof string);
}

namespace Azure.Core.Foundations.Private {
  /**
   * Provides a Model describing parameter customizations to spread into the target.
   * @param customizations Model describing the customization to spread
   */
  extern dec spreadCustomParameters(entity: Model, customizations: Model);

  /**
   * Provides a Model describing response property customizations to spread into the target.
   * @param customizations Model describing the customization to spread
   */
  extern dec spreadCustomResponseProperties(entity: Model, customizations: Model);

  /**
   * Checks the Resource parameter of an operation signature to ensure it's a valid resource type.
   * Also marks the operation as a resource operation.
   * @param resourceType The possible resource Type to validate.
   */
  extern dec ensureResourceType(entity: TypeSpec.Reflection.Operation, resourceType: unknown);

  /**
   * Checks the Resource parameter of an operation signature to ensure it's a valid resource type.
   */
  extern dec needsRoute(entity: TypeSpec.Reflection.Operation);

  /**
   * Issues a warning if an operation which derives from an operation templated marked with `@ensureVerb`
   * differs from the verb specified.
   * @param templateName: Name of the template operation.
   * @param verb The intended HTTP verb.
   */
  extern dec ensureVerb(
    entity: TypeSpec.Reflection.Operation,
    templateName: valueof string,
    verb: valueof string
  );

  /**
   * Identifies that a model should be treated as an embedding vector.
   */
  extern dec embeddingVector(entity: TypeSpec.Reflection.Model, type: TypeSpec.Reflection.Scalar);

  model ArmResourceIdentifierConfigOptions {
    allowedResources: ArmResourceIdentifierAllowedResource[];
  }

  /** Configuration for the armResourceIdentifier scalar */
  extern dec armResourceIdentifierConfig(
    target: Scalar,
    options: ArmResourceIdentifierConfigOptions
  );

  /**
   * Sets the priority order of default final-state-via options for an operation
   * @param states: list of final-state-via options in priority order
   */
  extern dec defaultFinalStateVia(
    target: TypeSpec.Reflection.Operation,
    states: valueof ("operation-location" | "location" | "azure-async-operation")[]
  );

  /**
   * Internal decorator marking a scalar as a next link that requires parameterization before use.
   *
   * You most likely don't need to use this decorator since next links that require parameterization are against
   * guidelines.
   */
  extern dec parameterizedNextLinkConfig(target: Scalar, parameters: ModelProperty[]);
}
