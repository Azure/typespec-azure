// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents billing account information including an ID.
    /// </summary>
    public class BillingAccount
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BillingAccount"/> class.
        /// </summary>
        /// <param name="id">The ID of the billing account.</param>
        public BillingAccount(string id)
        {
            Id = id;
        }

        /// <summary>
        /// Gets or sets the Billing Account Id.
        /// </summary>
        [JsonProperty("id")]
        public string Id { get; set; }
    }
}
