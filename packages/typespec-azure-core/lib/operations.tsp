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
 * @template Parameters Object describing the parameters of the operation.
 * @template Response Object describing the response of the operation.
 * @template Traits Object describing the traits of the operation.
 * @template ErrorResponse Error response of the operation. If not specified, the default error response is used.
 * @template TraitContexts Trait contexts applicable to the operation. Defaults to `TraitContext.Undefined` which means that only traits that always apply will appear. Can specify multiple using the | operator.
 */
@Foundations.Private.needsRoute
op RpcOperation<
  Parameters extends TypeSpec.Reflection.Model,
  Response extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {},
  ErrorResponse = Azure.Core.Foundations.ErrorResponse,
  TraitContexts extends TraitContext = TraitContext.Undefined
> is Foundations.Operation<
  Parameters & TraitProperties<Traits, TraitLocation.Parameters>,
  Response & TraitProperties<Traits, TraitLocation.Response, TraitContexts>,
  Traits,
  ErrorResponse
>;

/**
 * A long-running remote procedure call (RPC) operation.
 * @template Parameters Object describing the parameters of the operation.
 * @template Response Object describing the response of the operation.
 * @template StatusResult Object describing the status result of the operation.
 * @template StatusError Error response of the status operation. If not specified, the default error response is used.
 * @template Traits Object describing the traits of the operation.
 * @template ErrorResponse Error response of the operation. If not specified, the default error response is used.
 * @template TraitContexts Trait contexts applicable to the operation. Defaults to `TraitContext.Undefined` which means that only traits that always apply will appear. Can specify multiple using the | operator.
 */
@Foundations.Private.needsRoute
@post
op LongRunningRpcOperation<
  Parameters extends TypeSpec.Reflection.Model,
  Response extends TypeSpec.Reflection.Model,
  StatusResult extends TypeSpec.Reflection.Model,
  StatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {},
  ErrorResponse = Azure.Core.Foundations.ErrorResponse,
  TraitContexts extends TraitContext = TraitContext.Undefined
> is Foundations.Operation<
  Parameters & TraitProperties<Traits, TraitLocation.Parameters>,
  AcceptedResponse &
    ResourceOperationStatus<Response, StatusResult, StatusError> &
    Foundations.LongRunningStatusLocation<StatusResult> &
    TraitProperties<Traits, TraitLocation.Response, TraitContexts>,
  Traits,
  ErrorResponse
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
 * @template ErrorResponse Error response of the operations. If not specified, the default error response is used.
 */
@ensureTraitsPresent(InterfaceTraits, ExpectedResourceOperationTraits)
interface ResourceOperations<
  InterfaceTraits,
  ErrorResponse = Azure.Core.Foundations.ErrorResponse
> {
  /**
   * Create or replace operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceCreateOrReplace", "PUT")
  @createsOrReplacesResource(Resource)
  ResourceCreateOrReplace<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    Foundations.ResourceBody<Resource> &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >,
    Foundations.ResourceCreatedOrOkResponse<Resource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      >>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Long-running resource create or replace operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("LongRunningResourceCreateOrReplace", "PUT")
  @createsOrReplacesResource(Resource)
  LongRunningResourceCreateOrReplace<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    Foundations.ResourceBody<Resource> &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >,
    Foundations.ResourceCreatedOrOkResponse<Resource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      > &
      Foundations.LongRunningStatusLocation>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Create or update operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceCreateOrUpdate", "PATCH")
  @createsOrUpdatesResource(Resource)
  @parameterVisibility("create", "update")
  ResourceCreateOrUpdate<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    {
      @doc("This request has a JSON Merge Patch body.")
      @TypeSpec.Http.header("Content-Type")
      contentType: "application/merge-patch+json";

      ...Foundations.ResourceBody<Resource>;
      ...TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >;
    },
    Foundations.ResourceCreatedOrOkResponse<Resource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      >>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Long-running resource create or update operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("LongRunningResourceCreateOrUpdate", "PATCH")
  @createsOrUpdatesResource(Resource)
  @parameterVisibility("create", "update")
  LongRunningResourceCreateOrUpdate<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    {
      @doc("This request has a JSON Merge Patch body.")
      @TypeSpec.Http.header("Content-Type")
      contentType: "application/merge-patch+json";

      ...Foundations.ResourceBody<Resource>;
      ...TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Parameters,
        TraitContext.Create | TraitContext.Update
      >;
    },
    Foundations.ResourceCreatedOrOkResponse<Resource &
      TraitProperties<
        Traits & InterfaceTraits,
        TraitLocation.Response,
        TraitContext.Create | TraitContext.Update
      > &
      Foundations.LongRunningStatusLocation<Resource>>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource update operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceUpdate", "PATCH")
  @updatesResource(Resource)
  ResourceUpdate<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    {
      @doc("This request has a JSON Merge Patch body.")
      @TypeSpec.Http.header("Content-Type")
      contentType: "application/merge-patch+json";

      ...Foundations.ResourceBody<Resource>;
      ...TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Update>;
    },
    Foundations.ResourceOkResponse<Resource &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Update>>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource create with service-provided name operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  @Foundations.Private.ensureVerb("ResourceCreateWithServiceProvidedName", "POST")
  @createsResource(Resource)
  ResourceCreateWithServiceProvidedName<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    Resource,
    Foundations.ResourceBody<Resource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Create>,
    Foundations.LocationOfCreatedResourceResponse<Resource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Create>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Long-running resource create with service-provided name operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  @Foundations.Private.ensureVerb("LongRunningResourceCreateWithServiceProvidedName", "POST")
  @createsResource(Resource)
  LongRunningResourceCreateWithServiceProvidedName<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    Resource,
    Foundations.ResourceBody<Resource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Create>,
    Foundations.LocationOfCreatedResourceWithServiceProvidedNameResponse<Resource> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Create>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource read operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceRead", "GET")
  @readsResource(Resource)
  ResourceRead<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Read>,
    Resource &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Read>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource delete operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  @Foundations.Private.ensureVerb("ResourceDelete", "DELETE")
  @deletesResource(Resource)
  ResourceDelete<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Delete>,
    TypeSpec.Http.NoContentResponse &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Delete>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Long-running resource delete operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "We do support bodies in data plane service APIs..."
  @Foundations.Private.ensureVerb("LongRunningResourceDelete", "DELETE")
  @deletesResource(Resource)
  LongRunningResourceDelete<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Delete>,
    Foundations.AcceptedResponse<Foundations.OperationStatus &
      Foundations.LongRunningStatusLocation &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Delete>>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource list operation template.
   * @template Resource Resource type.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceList", "GET")
  ResourceList<
    Resource extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceList<
    Resource,
    TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.List>,
    Foundations.CustomPage<Resource, Traits & InterfaceTraits>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource action operation template.
   * @template Resource Resource type.
   * @template Parameters Object describing the parameters of the operation.
   * @template Response Object describing the response of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceAction", "POST")
  @action
  @actionSeparator(":")
  ResourceAction<
    Resource extends TypeSpec.Reflection.Model,
    Parameters extends TypeSpec.Reflection.Model,
    Response extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    Parameters &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    Response &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource collection action operation template.
   * @template Resource Resource type.
   * @template Parameters Object describing the parameters of the operation.
   * @template Response Object describing the response of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("ResourceCollectionAction", "POST")
  @collectionAction(Resource)
  @actionSeparator(":")
  ResourceCollectionAction<
    Resource extends TypeSpec.Reflection.Model,
    Parameters extends TypeSpec.Reflection.Model,
    Response extends TypeSpec.Reflection.Model,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    Resource,
    Parameters &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    Response &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Long-running resource action operation template.
   * @template Resource Resource type.
   * @template Parameters Object describing the parameters of the operation.
   * @template StatusResult Object describing the status result of the operation.
   * @template StatusError Object describing the status error of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  #suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "This operation must return a status monitor in its response."
  @Foundations.Private.ensureVerb("LongRunningResourceAction", "POST")
  @action
  @actionSeparator(":")
  LongRunningResourceAction<
    Resource extends TypeSpec.Reflection.Model,
    Parameters extends TypeSpec.Reflection.Model,
    StatusResult extends TypeSpec.Reflection.Model,
    StatusError = Foundations.Error,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    Resource,
    Parameters &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    AcceptedResponse &
      ResourceOperationStatus<Resource, StatusResult, StatusError> &
      Foundations.LongRunningStatusLocation<StatusResult> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Long-running resource collection action operation template.
   * @template Resource Resource type.
   * @template Parameters Object describing the parameters of the operation.
   * @template StatusResult Object describing the status result of the operation.
   * @template StatusError Object describing the status error of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  #suppress "@azure-tools/typespec-providerhub/no-inline-model" "This operation signature is not used in Azure Resource Manager operations (yet)"
  #suppress "@azure-tools/typespec-azure-resource-manager/no-response-body" "This operation must return a status monitor in its response."
  @Foundations.Private.ensureVerb("LongRunningResourceCollectionAction", "POST")
  @autoRoute
  @collectionAction(Resource)
  @actionSeparator(":")
  LongRunningResourceCollectionAction<
    Resource extends TypeSpec.Reflection.Model,
    Parameters extends TypeSpec.Reflection.Model,
    StatusResult extends TypeSpec.Reflection.Model,
    StatusError = Foundations.Error,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceCollectionOperation<
    Resource,
    Parameters &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Parameters, TraitContext.Action>,
    AcceptedResponse &
      ResourceOperationStatus<Resource, StatusResult, StatusError> &
      Foundations.LongRunningStatusLocation<StatusResult> &
      TraitProperties<Traits & InterfaceTraits, TraitLocation.Response, TraitContext.Action>,
    Traits & InterfaceTraits,
    ErrorResponse
  >;

  /**
   * Resource operation status operation template.
   * @template Resource Resource type.
   * @template StatusResult Object describing the status result of the operation.
   * @template StatusError Object describing the status error of the operation.
   * @template Traits Object describing the traits of the operation.
   */
  @Foundations.Private.ensureVerb("GetResourceOperationStatus", "GET")
  @readsResource(ResourceOperationStatus<Resource>)
  @Foundations.Private.ensureResourceType(Resource)
  GetResourceOperationStatus<
    Resource extends TypeSpec.Reflection.Model,
    StatusResult = Resource,
    StatusError = Foundations.Error,
    Traits extends TypeSpec.Reflection.Model = {}
  > is Foundations.ResourceOperation<
    ResourceOperationStatus<Resource, StatusResult, StatusError>,
    {},
    ResourceOperationStatusResponse<Resource, StatusResult, StatusError>,
    Traits & InterfaceTraits,
    ErrorResponse
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
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCreateOrReplace<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCreateOrReplace<Resource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceCreateOrReplace` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to create or replace a resource.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCreateOrReplace<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCreateOrReplace<Resource, Traits>;

/**
 * DEPRECATED: Use `ResourceCreateOrUpdate` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to create or update a resource.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCreateOrUpdate<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCreateOrUpdate<Resource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceCreateOrUpdate` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to create or update a resource.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCreateOrUpdate<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCreateOrUpdate<Resource, Traits>;

/**
 * DEPRECATED: Use `ResourceUpdate` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 * Operation signature to update a resource.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceUpdate<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceUpdate<Resource, Traits>;

/**
 * DEPRECATED: Use `ResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to synchronously create a resource with a service-provided name.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCreateWithServiceProvidedName<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCreateWithServiceProvidedName<Resource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceCreateWithServiceProvidedName` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to create a resource with a service-provided name.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCreateWithServiceProvidedName<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCreateWithServiceProvidedName<Resource, Traits>;

/**
 * DEPRECATED: Use `ResourceRead` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to retrieve a resource.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceRead<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceRead<Resource, Traits>;

/**
 * DEPRECATED: Use `ResourceDelete` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to delete a resource.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceDelete<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceDelete<Resource, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceDelete` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature to delete a resource.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceDelete<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceDelete<Resource, Traits>;

/**
 * DEPRECATED: Use `ResourceList` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature to list resources in a paginated way.
 * @template Resource The type of the resource.
 * @template Traits Traits to apply to the operation.
 */
op ResourceList<
  Resource extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceList<Resource, Traits>;

/**
 * DEPRECATED: Use `ResourceAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature for a resource action.
 * @template Resource The type of the resource.
 * @template Parameters Object describing the request parameters.
 * @template Response Object describing the response parameters.
 * @template Traits Traits to apply to the operation.
 */
op ResourceAction<
  Resource extends TypeSpec.Reflection.Model,
  Parameters extends TypeSpec.Reflection.Model,
  Response extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceAction<Resource, Parameters, Response, Traits>;

/**
 * DEPRECATED: Use `ResourceCollectionAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Operation signature for an action that applies to a collection of resources.
 * @template Resource The type of the resource.
 * @template Parameters Object describing the request parameters.
 * @template Response Object describing the response parameters.
 * @template Traits Traits to apply to the operation.
 */
op ResourceCollectionAction<
  Resource extends TypeSpec.Reflection.Model,
  Parameters extends TypeSpec.Reflection.Model,
  Response extends TypeSpec.Reflection.Model,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.ResourceCollectionAction<Resource, Parameters, Response, Traits>;

/**
 * DEPRECATED: Use `LongRunningResourceAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature for a resource action.
 * @template Resource The type of the resource.
 * @template Parameters Object describing the request parameters.
 * @template StatusResult Object describing the result of the status operation.
 * @template StatusError Object describing the error of the status operation. If not provided, the default error type is used.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceAction<
  Resource extends TypeSpec.Reflection.Model,
  Parameters extends TypeSpec.Reflection.Model,
  StatusResult extends TypeSpec.Reflection.Model,
  StatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceAction<
  Resource,
  Parameters,
  StatusResult,
  StatusError,
  Traits
>;

/**
 * DEPRECATED: Use `LongRunningResourceCollectionAction` from a `ResourceOperations` interface instance.
 * This can be done by instantiating your own version with the traits you want `alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;`.
 * See https://azure.github.io/typespec-azure/docs/getstarted/azure-core/step05#defining-the-operation-interface for details on how to use.
 *
 * Long-running operation signature for an action that applies to a collection of resources.
 * @template Resource The type of the resource.
 * @template Parameters Object describing the request parameters.
 * @template StatusResult Object describing the result of the status operation.
 * @template StatusError Object describing the error of the status operation. If not provided, the default error type is used.
 * @template Traits Traits to apply to the operation.
 */
op LongRunningResourceCollectionAction<
  Resource extends TypeSpec.Reflection.Model,
  Parameters extends TypeSpec.Reflection.Model,
  StatusResult extends TypeSpec.Reflection.Model,
  StatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {}
> is StandardResourceOperations.LongRunningResourceCollectionAction<
  Resource,
  Parameters,
  StatusResult,
  StatusError,
  Traits
>;

// Resource Status Monitoring

/**
 * Operation signature to retrieve a resource operation status.
 * @template Resource The type of the resource.
 * @template StatusResult Object describing the result of the status operation.
 * @template StatusError Object describing the error of the status operation. If not provided, the default error type is used.
 * @template Traits Traits to apply to the operation.
 */
@readsResource(ResourceOperationStatus<Resource>)
@Foundations.Private.ensureResourceType(Resource)
op GetResourceOperationStatus<
  Resource extends TypeSpec.Reflection.Model,
  StatusResult = Resource,
  StatusError = Foundations.Error,
  Traits extends TypeSpec.Reflection.Model = {}
> is Foundations.ResourceOperation<
  ResourceOperationStatus<Resource, StatusResult, StatusError>,
  {},
  ResourceOperationStatusResponse<Resource, StatusResult, StatusError>,
  Traits
>;
