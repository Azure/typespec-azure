// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents the tenant managing a customer subscription.
    /// </summary>
    public class ManagedByTenant
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ManagedByTenant"/> class.
        /// </summary>
        /// <param name="tenantId">The tenant ID.</param>
        public ManagedByTenant(string tenantId)
        {
            TenantId = tenantId;
        }

        /// <summary>
        /// Gets or sets the tenant ID of the managing tenant.
        /// </summary>
        [JsonProperty("tenantId")]
        public string TenantId { get; set; }
    }
}
