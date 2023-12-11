// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums;
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;
    using System;

    /// <summary>
    /// This model is used to describe the body of the Subscription Lifecycle Notification from ARM.
    /// For the ARM RPC reference, see https://github.com/Azure/azure-resource-manager-rpc/blob/master/v1.0/subscription-lifecycle-api-reference.md
    /// </summary>
    public class RegistrationStatePayload
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="RegistrationStatePayload"/> class.
        /// </summary>
        /// <param name="state">The state of the registration.</param>
        /// <param name="registrationDate">The date of the registration.</param>
        /// <param name="properties">The payload properties.</param>
        public RegistrationStatePayload(string state, DateTime registrationDate, RegistrationStateProperties properties)
        {
            RegistrationState = state;
            RegistrationDate = registrationDate;
            Properties = properties;
        }

        /// <summary>
        /// Gets or sets the registration state.
        /// </summary>
        [JsonProperty("state")]
        public RegistrationState? RegistrationState { get; }

        /// <summary>
        /// Gets or sets the date of the registration.
        /// </summary>
        [JsonProperty("registrationDate")]
        public DateTime RegistrationDate { get; set; }

        /// <summary>
        /// Gets or sets the registration payload properties.
        /// </summary>
        [JsonProperty("properties")]
        public RegistrationStateProperties Properties { get; set; }
    }
}
