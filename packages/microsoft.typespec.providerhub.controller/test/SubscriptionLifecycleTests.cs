// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle;
using Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums;
using Newtonsoft.Json;
using NUnit.Framework;
using System;

namespace ProviderHubControllerTests
{
    public class SubscriptionLifecycleTests
    {
        const string optionalArgsMissingPayload = @"{
    ""state"": ""Registered"",
    ""registrationDate"": ""Thu, 26 Oct 2023 10:21:33 GMT"",
    ""properties"": {
        ""tenantId"": ""72f988bf-86f1-41af-91ab-2d7cd011db47"",
        ""locationPlacementId"": ""Internal_2014-09-01"",
        ""quotaId"": ""Internal_2014-09-01"",
        ""spendingLimit"": ""On"",
        ""accountOwner"": {
            ""puid"": ""1111111111111111"",
            ""email"": ""user@company.com""
        },
        ""registeredFeatures"": [
            {
                ""name"": ""<featureName>"",
                ""state"": ""Registered""
            }
        ],
        ""managedByTenants"": [
            {
                ""tenantId"": ""<managedByTenantId>""
            }
        ],
        ""additionalProperties"": {
            ""resourceProviderProperties"": ""{\""resourceProviderNamespace\"":\""Microsoft.Contoso\""}"",
            ""billingProperties"": {
                ""channelType"": ""Internal"",
                ""paymentType"": ""Paid"",
                ""workloadType"": ""DevTest"",
                ""billingType"": ""Legacy"",
                ""costCategory"": ""FX"",
                ""tier"": ""Standard"",
                ""billingAccount"": {
                    ""id"": ""/providers/Microsoft.Billing/billingAccounts/ac430efe-1866-4124-9ed9-ee67f9cb75db""
                }
            }
        }
    }
}";

        const string noAdditionalPropsPayload = @"{
    ""state"": ""Warned"",
    ""registrationDate"": ""Thu, 26 Oct 2023 10:21:33 GMT"",
    ""properties"": {
        ""tenantId"": ""72f988bf-86f1-41af-91ab-2d7cd011db47"",
        ""locationPlacementId"": ""Internal_2014-09-01"",
        ""quotaId"": ""Internal_2014-09-01"",
        ""spendingLimit"": ""On"",
        ""accountOwner"": {
            ""puid"": ""1111111111111111"",
            ""email"": ""user@company.com""
        },
        ""registeredFeatures"": [
            {
                ""name"": ""<featureName>"",
                ""state"": ""Registered""
            }
        ],
        ""managedByTenants"": [
            {
                ""tenantId"": ""<managedByTenantId>""
            }
        ],
        ""additionalProperties"": {}
    }
}";

        const string fullPayload = @"{
  ""state"": ""Unregistered"",
  ""registrationDate"": ""Tue, 15 Nov 1994 08:12:31 GMT"",
  ""properties"": {
    ""tenantId"": ""ac430efe-1866-4124-9ed9-ee67f9cb75db"",
    ""locationPlacementId"": ""Internal_2014-09-01"",
    ""quotaId"": ""Default_2014-09-01"",
    ""registeredFeatures"": [
      {
        ""name"": ""<featureName>"",
        ""state"": ""Registered""
      }
    ],
    ""availabilityZones"": {
      ""location"": ""<locationName>"",
      ""zoneMappings"": [
        {
          ""logicalZone"": ""1"",
          ""physicalZone"": ""2""
        },
        {
          ""logicalZone"": ""2"",
          ""physicalZone"": ""1""
        }
      ]
    },
    ""spendingLimit"": ""On"",
    ""accountOwner"": {
      ""puid"": ""12445122"",
      ""email"": ""account@company.com""
    },
    ""managedByTenants"": [
      {
        ""tenantId"": ""<managedByTenantId>""
      }
    ],
    ""additionalProperties"": {
      ""billingProperties"": {
        ""costCategory"": ""FR"",
        ""channelType"": ""Internal"",
        ""billingType"": ""Legacy"",
        ""paymentType"": ""Paid"",
        ""workloadType"": ""Production"",
        ""tier"": ""Standard"",
        ""billingAccount"": {
          ""id"": ""/providers/Microsoft.Billing/billingAccounts/54731783""
        },
        ""additionalStateInformation"": {
          ""releaseNonDataRetentionResource"": {
            ""value"": true,
            ""effectiveDate"": ""Tue, 15 Nov 1994 08:12:31 GMT""
          },
          ""blockNewResourceCreation"": {
            ""value"": false,
            ""effectiveDate"": ""Wed, 16 Nov 1994 08:12:31 GMT""
          }
        }
      },
      ""resourceProviderProperties"": ""{\""resourceProviderNamespace\"":\""Microsoft.Contoso\""}"",
    }
  }
}";

        const string randomExtraProps = @"{
  ""state"": ""Unregistered"",
  ""registrationDate"": ""Tue, 15 Nov 1994 08:12:31 GMT"",
  ""properties"": {
    ""additionalProperties"": {
        ""someNewProperty"": ""ThatNoOneHasHeardOf"",
        ""anotherRandomDateTime"": ""Thu, 16 Nov 2023 22:08:58 +0400""
    }
  }
}";

        [SetUp]
        public void Init()
        {
        }

        /// <summary>
        /// Tests that deserialization still works even if optional properties are missing from the payload.
        /// </summary>
        [Test]
        public void DeserializePayloadOptionalArgsMissing()
        {
            RegistrationStatePayload? payload = null;
            Assert.DoesNotThrow(() => payload = JsonConvert.DeserializeObject<RegistrationStatePayload>(optionalArgsMissingPayload));
            Assert.NotNull(payload);
            Assert.AreEqual(RegistrationState.Registered, payload.RegistrationState);
            Assert.AreEqual(DateTime.Parse("Thu, 26 Oct 2023 10:21:33 GMT").ToUniversalTime(), payload.RegistrationDate);

            // Properties
            Assert.AreEqual("72f988bf-86f1-41af-91ab-2d7cd011db47", payload.Properties.TenantId);
            Assert.AreEqual("Internal_2014-09-01", payload.Properties.LocationPlacementId);
            Assert.AreEqual("Internal_2014-09-01", payload.Properties.QuotaId);
            Assert.AreEqual(SpendingLimit.On, payload.Properties.SpendingLimit);
            Assert.AreEqual("1111111111111111", payload.Properties.AccountOwner.Puid);
            Assert.AreEqual("user@company.com", payload.Properties.AccountOwner.Email);
            Assert.AreEqual("<featureName>", payload.Properties.RegisteredFeatures[0].Name);
            Assert.AreEqual("Registered", payload.Properties.RegisteredFeatures[0].State);
            Assert.AreEqual("<managedByTenantId>", payload.Properties.ManagedByTenants[0].TenantId);

            // Additional Properties
            Assert.AreEqual("{\"resourceProviderNamespace\":\"Microsoft.Contoso\"}", payload.Properties.AdditionalProperties.ResourceProviderProperties);
            Assert.AreEqual(ChannelType.Internal, payload.Properties.AdditionalProperties.BillingProperties.ChannelType);
            Assert.AreEqual(PaymentType.Paid, payload.Properties.AdditionalProperties.BillingProperties.PaymentType);
            Assert.AreEqual(WorkloadType.DevTest, payload.Properties.AdditionalProperties.BillingProperties.WorkloadType);
            Assert.AreEqual(BillingType.Legacy, payload.Properties.AdditionalProperties.BillingProperties.BillingType);
            Assert.AreEqual(CostCategory.CostOfGoodsSold, payload.Properties.AdditionalProperties.BillingProperties.CostCategory);
            Assert.AreEqual(Tier.Standard, payload.Properties.AdditionalProperties.BillingProperties.Tier);
            Assert.AreEqual("/providers/Microsoft.Billing/billingAccounts/ac430efe-1866-4124-9ed9-ee67f9cb75db", payload.Properties.AdditionalProperties.BillingProperties.BillingAccount.Id);
        }

        /// <summary>
        /// Tests that deserialization works when all properties are present in the payload.
        /// </summary>
        [Test]
        public void DeserializeFullPayload()
        {
            RegistrationStatePayload? payload = null;
            Assert.DoesNotThrow(() => payload = JsonConvert.DeserializeObject<RegistrationStatePayload>(fullPayload));
            Assert.NotNull(payload);
            Assert.AreEqual(RegistrationState.Unregistered, payload.RegistrationState);
            Assert.AreEqual(DateTime.Parse("Tue, 15 Nov 1994 08:12:31 GMT").ToUniversalTime(), payload.RegistrationDate);

            // Properties
            Assert.AreEqual("ac430efe-1866-4124-9ed9-ee67f9cb75db", payload.Properties.TenantId);
            Assert.AreEqual("Internal_2014-09-01", payload.Properties.LocationPlacementId);
            Assert.AreEqual("Default_2014-09-01", payload.Properties.QuotaId);
            Assert.AreEqual("<featureName>", payload.Properties.RegisteredFeatures[0].Name);
            Assert.AreEqual("Registered", payload.Properties.RegisteredFeatures[0].State);
            Assert.AreEqual("<locationName>", payload.Properties.AvailabilityZones.Location);
            Assert.AreEqual("1", payload.Properties.AvailabilityZones.ZoneMappings[0].LogicalZone);
            Assert.AreEqual("2", payload.Properties.AvailabilityZones.ZoneMappings[0].PhysicalZone);
            Assert.AreEqual("2", payload.Properties.AvailabilityZones.ZoneMappings[1].LogicalZone);
            Assert.AreEqual("1", payload.Properties.AvailabilityZones.ZoneMappings[1].PhysicalZone);
            Assert.AreEqual(SpendingLimit.On, payload.Properties.SpendingLimit);
            Assert.AreEqual("12445122", payload.Properties.AccountOwner.Puid);
            Assert.AreEqual("account@company.com", payload.Properties.AccountOwner.Email);
            Assert.AreEqual("<managedByTenantId>", payload.Properties.ManagedByTenants[0].TenantId);

            // Additional Properties
            Assert.AreEqual(CostCategory.ResearchAndDevelopment, payload.Properties.AdditionalProperties.BillingProperties.CostCategory);
            Assert.AreEqual(ChannelType.Internal, payload.Properties.AdditionalProperties.BillingProperties.ChannelType);
            Assert.AreEqual(BillingType.Legacy, payload.Properties.AdditionalProperties.BillingProperties.BillingType);
            Assert.AreEqual(PaymentType.Paid, payload.Properties.AdditionalProperties.BillingProperties.PaymentType);
            Assert.AreEqual(WorkloadType.Production, payload.Properties.AdditionalProperties.BillingProperties.WorkloadType);
            Assert.AreEqual(Tier.Standard, payload.Properties.AdditionalProperties.BillingProperties.Tier);
            Assert.AreEqual("/providers/Microsoft.Billing/billingAccounts/54731783", payload.Properties.AdditionalProperties.BillingProperties.BillingAccount.Id);
            Assert.True(payload.Properties.AdditionalProperties.BillingProperties.AdditionalStateInformation.ReleaseNonDataRetentionResource.Value);
            Assert.AreEqual(DateTime.Parse("Tue, 15 Nov 1994 08:12:31 GMT").ToUniversalTime(), payload.Properties.AdditionalProperties.BillingProperties.AdditionalStateInformation.ReleaseNonDataRetentionResource.EffectiveDate);
            Assert.False(payload.Properties.AdditionalProperties.BillingProperties.AdditionalStateInformation.BlockNewResourceCreation.Value);
            Assert.AreEqual(DateTime.Parse("Wed, 16 Nov 1994 08:12:31 GMT").ToUniversalTime(), payload.Properties.AdditionalProperties.BillingProperties.AdditionalStateInformation.BlockNewResourceCreation.EffectiveDate);
            Assert.AreEqual("{\"resourceProviderNamespace\":\"Microsoft.Contoso\"}", payload.Properties.AdditionalProperties.ResourceProviderProperties);
        }

        /// <summary>
        /// Tests that deserialization works even when extra "additionalProperties" are passed.
        /// </summary>
        [Test]
        public void DeserializePayloadWithExtras()
        {
            RegistrationStatePayload? payload = null;
            Assert.DoesNotThrow(() => payload = JsonConvert.DeserializeObject<RegistrationStatePayload>(randomExtraProps));
            Assert.NotNull(payload);
            Assert.AreEqual(RegistrationState.Unregistered, payload.RegistrationState);
            Assert.AreEqual(DateTime.Parse("Tue, 15 Nov 1994 08:12:31 GMT").ToUniversalTime(), payload.RegistrationDate);
        }

        /// <summary>
        /// Tests that deserialization works when the "additionalProperties" bag is not passed.
        /// </summary>
        [Test]
        public void DeserializePayloadWithNoAdditionalProperties()
        {
            RegistrationStatePayload? payload = null;
            Assert.DoesNotThrow(() => payload = JsonConvert.DeserializeObject<RegistrationStatePayload>(noAdditionalPropsPayload));
            Assert.NotNull(payload);
            Assert.AreEqual(RegistrationState.Warned, payload.RegistrationState);
            Assert.AreEqual(DateTime.Parse("Thu, 26 Oct 2023 10:21:33 GMT").ToUniversalTime(), payload.RegistrationDate);

            // Properties
            Assert.AreEqual("72f988bf-86f1-41af-91ab-2d7cd011db47", payload.Properties.TenantId);
            Assert.AreEqual("Internal_2014-09-01", payload.Properties.LocationPlacementId);
            Assert.AreEqual("Internal_2014-09-01", payload.Properties.QuotaId);
            Assert.AreEqual(SpendingLimit.On, payload.Properties.SpendingLimit);
            Assert.AreEqual("1111111111111111", payload.Properties.AccountOwner.Puid);
            Assert.AreEqual("user@company.com", payload.Properties.AccountOwner.Email);
            Assert.AreEqual("<featureName>", payload.Properties.RegisteredFeatures[0].Name);
            Assert.AreEqual("Registered", payload.Properties.RegisteredFeatures[0].State);
            Assert.AreEqual("<managedByTenantId>", payload.Properties.ManagedByTenants[0].TenantId);
        }

        /// <summary>
        /// Tests that valid registration states are accepted, while staying extensible for future values that may be added.
        /// </summary>
        /// <param name="jsonPayload"></param>
        [TestCase("{'state':'Registered'}", "Registered")]
        [TestCase("{'state':'Unregistered'}", "Unregistered")]
        [TestCase("{'state':'Warned'}", "Warned")]
        [TestCase("{'state':'Suspended'}", "Suspended")]
        [TestCase("{'state':'Deleted'}", "Deleted")]
        [TestCase("{'state':'reg'}", "reg")]
        [TestCase("{'state':'someOtherRandom!!!value'}", "someOtherRandom!!!value")]
        public void ValidRegistrationStateSucceeds(string jsonPayload, string expectedState)
        {
            RegistrationStatePayload? payload = null;
            var registrationState = payload = JsonConvert.DeserializeObject<RegistrationStatePayload>(jsonPayload);
            Assert.NotNull(payload);
            Assert.AreEqual(new RegistrationState(expectedState), registrationState.RegistrationState);
        }
    }
}
