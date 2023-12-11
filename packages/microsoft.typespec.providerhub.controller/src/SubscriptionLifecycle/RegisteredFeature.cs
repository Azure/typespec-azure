// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents a registered feature on a subscription.
    /// </summary>
    public class RegisteredFeature
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="RegisteredFeature"/> class.
        /// </summary>
        /// <param name="name">The feature name.</param>
        /// <param name="state">The feature state.</param>
        public RegisteredFeature(string name, string state)
        {
            Name = name;
            State = state;
        }

        /// <summary>
        /// Gets or sets name of the feature registered on the subscription, e.g. "Microsoft.Contoso/PrivatePreview".
        /// </summary>
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the feature registration state, e.g. "registered".
        /// </summary>
        [JsonProperty("state")]
        public string State { get; set; }
    }
}
