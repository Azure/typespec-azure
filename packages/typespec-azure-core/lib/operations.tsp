import "@typespec/http";
import "@typespec/rest";
import "@typespec/versioning";
import "./models.tsp";
import "./traits.tsp";

namespace Azure.Core;

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.Versioning;
using Azure.Core.Traits;
using Azure.Core.Traits.Private;

// RPC Operations

/**
 * A remote procedure call (RPC) operation.
 * @template TParams Object describing the parameters of the operation.
 * @template TResponse Object describing the response of the operation.
 * @template Traits Object describing the traits of the operation.
 * @template TErrorResponse Error response of the operation. If not specified, the default error response is used.
 * @template TraitContexts Trait contexts applicable to the operation. Defaults to `TraitContext.Undefined` which means that only traits that always apply will appear. Can specify multiple using the | operator.
 */
@Foundations.Private.needsRoute
op RpcOperation<
  TParams extends TypeSpec.Reflection.Model,
  TResponse extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse,
  TraitContexts extends TraitContext = TraitContext.Undefined
> is Foundations.Operation<
  TParams & TraitProperties<Traits, TraitLocation.Parameters>,
  TResponse & TraitProperties<Traits, TraitLocation.Response, TraitContexts>,
  Traits,
  TErrorResponse
>;

/**
 * A long-running remote procedure call (RPC) operation.
 * @template TParams Object describing the parameters of the operation.
 * @template TResponse Object describing the response of the operation.
 * @template TStatusResult Object describing the status result of the operation.
 * @template TStatusError Error response of the status operation. If not specified, the default error response is used.
 * @template Traits Object describing the traits of the operation.
 * @template TErrorResponse Error response of the operation. If not specified, the default error response is used.
 * @template TraitContexts Trait contexts applicable to the operation. Defaults to `TraitContext.Undefined` which means that only traits that always apply will appear. Can specify multiple using the | operator.
 */
@Foundations.Private.needsRoute
@post
op LongRunningRpcOperation<
  TParams extends TypeSpec.Reflection.Model,
  TResponse extends TypeSpec.Reflection.Model,
  TStatusResult extends TypeSpec.Reflection.Model,
  TStatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {},
  TErrorResponse = Azure.Core.Foundations.ErrorResponse,
  TraitContexts extends TraitContext = TraitContext.Undefined
> is Foundations.Operation<
  TParams & TraitProperties<Traits, TraitLocation.Parameters>,
  AcceptedResponse &
    ResourceOperationStatus<TResponse, TStatusResult, TStatusError> &
    Foundations.LongRunningStatusLocation<TStatusResult> &
    TraitProperties<Traits, TraitLocation.Response, TraitContexts>,
  Traits,
  TErrorResponse
>;

// Standard Resource Lifecycle Operations

alias ExpectedResourceOperationTraits = [
  {
    trait: "ConditionalRequests";
    diagnostic: "conditional-requests-trait-missing";
  },
  {
    trait: "RepeatableRequests";
    diagnostic: "repeatable-requests-trait-missing";
  },
  {
    trait: "ClientRequestId";
    diagnostic: "client-request-id-trait-missing";
  }
];

/**
 * Interface containing common resource operations.
 * @template InterfaceTraits Traits applicable to the operations.
 * @template TErrorResponse Error response of the operations. If not specified, the default error response is used.
 */
@ensureTraitsPresent(InterfaceTraits, ExpectedResourceOperationTraits)
interface ResourceOperations<
  InterfaceTraits,
  TErrorResponse = Azure.Core.Foundations.ErrorResponse
> {
  /**
   * Create or replace operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceCreateOrReplace", "PUT")
  @createsOrReplacesResource(TResource)
  ResourceCreateOrReplace<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    Foundations.ResourceBody<TResource> &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >,
    Foundations.ResourceCreatedOrOkResponse<TResource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      >>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Long-running resource create or replace operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("LongRunningResourceCreateOrReplace", "PUT")
  @createsOrReplacesResource(TResource)
  LongRunningResourceCreateOrReplace<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    Foundations.ResourceBody<TResource> &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >,
    Foundations.ResourceCreatedOrOkResponse<TResource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      > &
      Foundations.LongRunningStatusLocation>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Create or update operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceCreateOrUpdate", "PATCH")
  @createsOrUpdatesResource(TResource)
  @parameterVisibility("create", "update")
  ResourceCreateOrUpdate<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    {
      @doc("This request has a JSON Merge Patch body.")
      @TypeSpec.Http.header("Content-Type")
      contentType: "application/merge-patch+json";

      ...Foundations.ResourceBody<TResource>;
      ...TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >;
    },
    Foundations.ResourceCreatedOrOkResponse<TResource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      >>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Long-running resource create or update operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("LongRunningResourceCreateOrUpdate", "PATCH")
  @createsOrUpdatesResource(TResource)
  @parameterVisibility("create", "update")
  LongRunningResourceCreateOrUpdate<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    {
      @doc("This request has a JSON Merge Patch body.")
      @TypeSpec.Http.header("Content-Type")
      contentType: "application/merge-patch+json";

      ...Foundations.ResourceBody<TResource>;
      ...TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >;
    },
    Foundations.ResourceCreatedOrOkResponse<TResource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      > &
      Foundations.LongRunningStatusLocation<TResource>>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource update operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceUpdate", "PATCH")
  @updatesResource(TResource)
  ResourceUpdate<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    {
      @doc("This request has a JSON Merge Patch body.")
      @TypeSpec.Http.header("Content-Type")
      contentType: "application/merge-patch+json";

      ...Foundations.ResourceBody<TResource>;
      ...TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Update>;
    },
    Foundations.ResourceOkResponse<TResource &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Update>>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource create with service-provided name operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  @Foundations.Private.ensureVerb("ResourceCreateWithServiceProvidedName", "POST")
  @createsResource(TResource)
  ResourceCreateWithServiceProvidedName<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    TResource,
    Foundations.ResourceBody<TResource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Create>,
    Foundations.LocationOfCreatedResourceResponse<TResource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Create>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Long-running resource create with service-provided name operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  @Foundations.Private.ensureVerb("LongRunningResourceCreateWithServiceProvidedName", "POST")
  @createsResource(TResource)
  LongRunningResourceCreateWithServiceProvidedName<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    TResource,
    Foundations.ResourceBody<TResource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Create>,
    Foundations.LocationOfCreatedResourceWithServiceProvidedNameResponse<TResource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Create>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource read operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceRead", "GET")
  @readsResource(TResource)
  ResourceRead<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Read>,
    TResource &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Read>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource delete operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  @Foundations.Private.ensureVerb("ResourceDelete", "DELETE")
  @deletesResource(TResource)
  ResourceDelete<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Delete>,
    TypeSpec.Http.NoContentResponse &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Delete>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Long-running resource delete operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "We do support bodies in data plane service APIs..."
  @Foundations.Private.ensureVerb("LongRunningResourceDelete", "DELETE")
  @deletesResource(TResource)
  LongRunningResourceDelete<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Delete>,
    Foundations.AcceptedResponse<Foundations.OperationStatus &
      Foundations.LongRunningStatusLocation &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Delete>>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource list operation template.
   * @template TResource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceList", "GET")
  ResourceList<
    TResource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceList<
    TResource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.List>,
    Foundations.CustomPage<TResource, Traits & InterfaceTraits>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource action operation template.
   * @template TResource Resource type.
   * @template TParams Object describing the parameters of the operation.
   * @template TResponse Object describing the response of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceAction", "POST")
  @action
  @actionSeparator(":")
  ResourceAction<
    TResource extends TypeSpec.Reflection.Model,
    TParams extends TypeSpec.Reflection.Model,
    TResponse extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    TParams &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    TResponse &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource collection action operation template.
   * @template TResource Resource type.
   * @template TParams Object describing the parameters of the operation.
   * @template TResponse Object describing the response of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceCollectionAction", "POST")
  @collectionAction(TResource)
  @actionSeparator(":")
  ResourceCollectionAction<
    TResource extends TypeSpec.Reflection.Model,
    TParams extends TypeSpec.Reflection.Model,
    TResponse extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    TResource,
    TParams &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    TResponse &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Long-running resource action operation template.
   * @template TResource Resource type.
   * @template TParams Object describing the parameters of the operation.
   * @template TStatusResult Object describing the status result of the operation.
   * @template TStatusError Object describing the status error of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  #suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "This operation must return a status monitor in its response."
  @Foundations.Private.ensureVerb("LongRunningResourceAction", "POST")
  @action
  @actionSeparator(":")
  LongRunningResourceAction<
    TResource extends TypeSpec.Reflection.Model,
    TParams extends TypeSpec.Reflection.Model,
    TStatusResult extends TypeSpec.Reflection.Model,
    TStatusError = Foundations.Error,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    TResource,
    TParams &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    AcceptedResponse &
      ResourceOperationStatus<TResource, TStatusResult, TStatusError> &
      Foundations.LongRunningStatusLocation<TStatusResult> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Long-running resource collection action operation template.
   * @template TResource Resource type.
   * @template TParams Object describing the parameters of the operation.
   * @template TStatusResult Object describing the status result of the operation.
   * @template TStatusError Object describing the status error of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  #suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "This operation must return a status monitor in its response."
  @Foundations.Private.ensureVerb("LongRunningResourceCollectionAction", "POST")
  @autoRoute
  @collectionAction(TResource)
  @actionSeparator(":")
  LongRunningResourceCollectionAction<
    TResource extends TypeSpec.Reflection.Model,
    TParams extends TypeSpec.Reflection.Model,
    TStatusResult extends TypeSpec.Reflection.Model,
    TStatusError = Foundations.Error,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    TResource,
    TParams &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    AcceptedResponse &
      ResourceOperationStatus<TResource, TStatusResult, TStatusError> &
      Foundations.LongRunningStatusLocation<TStatusResult> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;

  /**
   * Resource operation status operation template.
   * @template TResource Resource type.
   * @template TStatusResult Object describing the status result of the operation.
   * @template TStatusError Object describing the status error of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("GetResourceOperationStatus", "GET")
  @readsResource(ResourceOperationStatus<TResource>)
  @Foundations.Private.ensureResourceType(TResource)
  GetResourceOperationStatus<
    TResource extends TypeSpec.Reflection.Model,
    TStatusResult = TResource,
    TStatusError = Foundations.Error,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    ResourceOperationStatus<TResource, TStatusResult, TStatusError>,
    {},
    ResourceOperationStatusResponse<TResource, TStatusResult, TStatusError>,
    Traits & InterfaceTraits,
    TErrorResponse
  >;
}

alias StandardResourceOperations = ResourceOperations<NoConditionalRequests &
  NoRepeatableRequests &
  NoClientRequestId>;

/**
 * DEPRECATED: Use `ResourceCreateOrReplace` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to create or replace a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCreateOrReplace<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCreateOrReplace<TResource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceCreateOrReplace` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to create or replace a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCreateOrReplace<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCreateOrReplace<TResource, Traits>;

/**
 * DEPRECATED: Use `ResourceCreateOrUpdate` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to create or update a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCreateOrUpdate<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCreateOrUpdate<TResource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceCreateOrUpdate` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to create or update a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCreateOrUpdate<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCreateOrUpdate<TResource, Traits>;

/**
 * DEPRECATED: Use `ResourceUpdate` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 * Operation signature to update a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceUpdate<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceUpdate<TResource, Traits>;

/**
 * DEPRECATED: Use `ResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to synchronously create a resource with a service-provided name.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCreateWithServiceProvidedName<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCreateWithServiceProvidedName<TResource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to create a resource with a service-provided name.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCreateWithServiceProvidedName<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCreateWithServiceProvidedName<TResource, Traits>;

/**
 * DEPRECATED: Use `ResourceRead` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to retrieve a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceRead<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceRead<TResource, Traits>;

/**
 * DEPRECATED: Use `ResourceDelete` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to delete a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceDelete<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceDelete<TResource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceDelete` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to delete a resource.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceDelete<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceDelete<TResource, Traits>;

/**
 * DEPRECATED: Use `ResourceList` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to list resources in a paginated way.
 * @template TResource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceList<
  TResource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceList<TResource, Traits>;

/**
 * DEPRECATED: Use `ResourceAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature for a resource action.
 * @template TResource The type of the resource.
 * @template TParams Object describing the request parameters.
 * @template TResponse Object describing the response parameters.
 * @template Traits Traits to apply to the operation.
 */
op ResourceAction<
  TResource extends TypeSpec.Reflection.Model,
  TParams extends TypeSpec.Reflection.Model,
  TResponse extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceAction<TResource, TParams, TResponse, Traits>;

/**
 * DEPRECATED: Use `ResourceCollectionAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature for an action that applies to a collection of resources.
 * @template TResource The type of the resource.
 * @template TParams Object describing the request parameters.
 * @template TResponse Object describing the response parameters.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCollectionAction<
  TResource extends TypeSpec.Reflection.Model,
  TParams extends TypeSpec.Reflection.Model,
  TResponse extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCollectionAction<TResource, TParams, TResponse, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature for a resource action.
 * @template TResource The type of the resource.
 * @template TParams Object describing the request parameters.
 * @template TStatusResult Object describing the result of the status operation.
 * @template TStatusError Object describing the error of the status operation. If not provided, the default error type is used.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceAction<
  TResource extends TypeSpec.Reflection.Model,
  TParams extends TypeSpec.Reflection.Model,
  TStatusResult extends TypeSpec.Reflection.Model,
  TStatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceAction<
  TResource,
  TParams,
  TStatusResult,
  TStatusError,
  Traits
>;

/**
 * DEPRECATED: Use `LongRunningResourceCollectionAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature for an action that applies to a collection of resources.
 * @template TResource The type of the resource.
 * @template TParams Object describing the request parameters.
 * @template TStatusResult Object describing the result of the status operation.
 * @template TStatusError Object describing the error of the status operation. If not provided, the default error type is used.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCollectionAction<
  TResource extends TypeSpec.Reflection.Model,
  TParams extends TypeSpec.Reflection.Model,
  TStatusResult extends TypeSpec.Reflection.Model,
  TStatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCollectionAction<
  TResource,
  TParams,
  TStatusResult,
  TStatusError,
  Traits
>;

// Resource Status Monitoring

/**
 * Operation signature to retrieve a resource operation status.
 * @template TResource The type of the resource.
 * @template TStatusResult Object describing the result of the status operation.
 * @template TStatusError Object describing the error of the status operation. If not provided, the default error type is used.
 * @template Traits Traits to apply to the operation.
 */
@readsResource(ResourceOperationStatus<TResource>)
@Foundations.Private.ensureResourceType(TResource)
op GetResourceOperationStatus<
  TResource extends TypeSpec.Reflection.Model,
  TStatusResult = TResource,
  TStatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {}
> is Foundations.ResourceOperation<
  ResourceOperationStatus<TResource, TStatusResult, TStatusError>,
  {},
  ResourceOperationStatusResponse<TResource, TStatusResult, TStatusError>,
  Traits
>;
