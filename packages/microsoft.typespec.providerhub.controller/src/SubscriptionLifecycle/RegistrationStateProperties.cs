// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums;
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;
    using System.Collections.Generic;

    /// <summary>
    /// This model is used to describe the properties of the request sent to us by RPaaS during subscription lifecycle notifications.
    /// </summary>
    public class RegistrationStateProperties
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="RegistrationStateProperties"/> class.
        /// </summary>
        /// <param name="tenantId">The tenant ID.</param>
        /// <param name="locationPlacementId">The location placement ID.</param>
        /// <param name="quotaId">The quota ID.</param>
        /// <param name="registeredFeatures">The list of registered features.</param>
        /// <param name="accountOwner">The subscription account owner.</param>
        /// <param name="managedByTenants">The list of managedBy tenants.</param>
        /// <param name="additionalProperties">The additional properties.</param>
        public RegistrationStateProperties(
            string tenantId,
            string locationPlacementId,
            string quotaId,
            List<RegisteredFeature> registeredFeatures,
            AccountOwner accountOwner,
            List<ManagedByTenant> managedByTenants,
            AdditionalProperties additionalProperties)
        {
            TenantId = tenantId;
            LocationPlacementId = locationPlacementId;
            QuotaId = quotaId;
            RegisteredFeatures = registeredFeatures;
            AccountOwner = accountOwner;
            ManagedByTenants = managedByTenants;
            AdditionalProperties = additionalProperties;
        }

        /// <summary>
        /// Gets or sets the tenant ID.
        /// </summary>
        [JsonProperty("tenantId")]
        public string TenantId { get; set; }

        /// <summary>
        /// Gets or sets the location placement ID.
        /// </summary>
        [JsonProperty("locationPlacementId")]
        public string LocationPlacementId { get; set; }

        /// <summary>
        /// Gets or sets the quota ID.
        /// </summary>
        [JsonProperty("quotaId")]
        public string QuotaId { get; set; }

        /// <summary>
        /// Gets or sets the list of registered features.
        /// </summary>
        [JsonProperty("registeredFeatures")]
        public List<RegisteredFeature> RegisteredFeatures { get; set; }

        /// <summary>
        /// Gets or sets the availability zones.
        /// </summary>
        [JsonProperty("availabilityZones")]
        public AvailabilityZones AvailabilityZones { get; set; }

        /// <summary>
        /// Gets or sets the spending limit.
        /// </summary>
        [JsonProperty("spendingLimit")]
        public SpendingLimit SpendingLimit { get; set; }

        /// <summary>
        /// Gets or sets the account owner, e.g. "account@company.com".
        /// </summary>
        [JsonProperty("accountOwner")]
        public AccountOwner AccountOwner { get; set; }

        /// <summary>
        /// Gets or sets the list of managedBy tenants.
        /// </summary>
        [JsonProperty("managedByTenants")]
        public List<ManagedByTenant> ManagedByTenants { get; set; }

        /// <summary>
        /// Gets or sets the additional properties.
        /// </summary>
        [JsonProperty("additionalProperties")]
        public AdditionalProperties AdditionalProperties { get; set; }
    }
}
