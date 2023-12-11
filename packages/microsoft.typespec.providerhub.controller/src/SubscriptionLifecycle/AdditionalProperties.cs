// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents additional properties of the Subscription LifeCycle request.
    /// </summary>
    public class AdditionalProperties
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AdditionalProperties"/> class.
        /// </summary>
        /// <param name="resourceProviderProperties">The resource provider properties.</param>
        /// <param name="billingProperties">The billing properties.</param>
        public AdditionalProperties(string resourceProviderProperties, BillingProperties billingProperties)
        {
            ResourceProviderProperties = resourceProviderProperties;
            BillingProperties = billingProperties;
        }

        /// <summary>
        /// Gets or sets additional resource provider properties.
        /// </summary>
        [JsonProperty("resourceProviderProperties")]
        public string ResourceProviderProperties { get; set; }

        /// <summary>
        /// Gets or sets billing properties.
        /// </summary>
        [JsonProperty("billingProperties")]
        public BillingProperties BillingProperties { get; set; }
    }
}
