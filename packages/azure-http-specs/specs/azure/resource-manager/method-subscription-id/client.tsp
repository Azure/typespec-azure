import "./main.tsp";
import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

// Apply @clientLocation to move subscriptionId from client to method level for Scenario 1 operations
// All subscription resource operations should have subscriptionId at method level

// Scenario 1: Two subscription resources - move all subscriptionId parameters to method level
@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.GetSubscriptionResource1BaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.SubscriptionResource1Operations.get
);

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.PutSubscriptionResource1BaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.SubscriptionResource1Operations.put
);

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.DeleteSubscriptionResource1BaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.SubscriptionResource1Operations.delete
);

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.GetSubscriptionResource2BaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.SubscriptionResource2Operations.get
);

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.PutSubscriptionResource2BaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.SubscriptionResource2Operations.put
);

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.DeleteSubscriptionResource2BaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.TwoSubscriptionResourcesMethodLevel.SubscriptionResource2Operations.delete
);

// Scenario 2: Mixed placement - only move subscriptionId for subscription resource operations to method level
// Resource group resource operations keep subscriptionId at client level

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.MixedSubscriptionPlacement.GetSubscriptionResourceBaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.MixedSubscriptionPlacement.SubscriptionResourceOperations.get
);

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.MixedSubscriptionPlacement.PutSubscriptionResourceBaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.MixedSubscriptionPlacement.SubscriptionResourceOperations.put
);

@@clientLocation(_Specs_.Azure.ResourceManager.MethodSubscriptionId.MixedSubscriptionPlacement.DeleteSubscriptionResourceBaseParameter.subscriptionId,
  _Specs_.Azure.ResourceManager.MethodSubscriptionId.MixedSubscriptionPlacement.SubscriptionResourceOperations.delete
);
