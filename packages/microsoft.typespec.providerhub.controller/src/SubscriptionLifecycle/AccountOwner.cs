// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents the Account Owner.
    /// </summary>
    public class AccountOwner
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AccountOwner"/> class.
        /// </summary>
        /// <param name="puid">The PUID of the account owner.</param>
        /// <param name="email">The email address of the account owner.</param>
        public AccountOwner(string puid, string email)
        {
            Puid = puid;
            Email = email;
        }

        /// <summary>
        /// Gets or sets the account owner PUID.
        /// </summary>
        [JsonProperty("puid")]
        public string Puid { get; set; }

        /// <summary>
        /// Gets or sets the account owner email, e.g. user@microsoft.com.
        /// </summary>
        [JsonProperty("email")]
        public string Email { get; set; }
    }
}
