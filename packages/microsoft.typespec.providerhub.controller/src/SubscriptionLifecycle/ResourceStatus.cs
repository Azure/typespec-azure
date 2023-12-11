// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;
    using System;

    /// <summary>
    /// Represents resource status, including a boolean value and an effective date.
    /// </summary>
    public class ResourceStatus
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ResourceStatus"/> class.
        /// </summary>
        /// <param name="value">The boolean value representing the resource status.</param>
        /// <param name="effectiveDate">The effective date for the resource status.</param>
        public ResourceStatus(bool value, DateTime effectiveDate)
        {
            Value = value;
            EffectiveDate = effectiveDate;
        }

        /// <summary>
        /// Gets or sets a value indicating whether the policy is effective.
        /// </summary>
        [JsonProperty("value")]
        public bool? Value { get; set; }

        /// <summary>
        /// Gets or sets the effective date for the resource status.
        /// </summary>
        [JsonProperty("effectiveDate")]
        public DateTime? EffectiveDate { get; set; }
    }
}
