// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents additional state information, including release and block resource status.
    /// </summary>
    public class AdditionalStateInformation
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AdditionalStateInformation"/> class.
        /// </summary>
        /// <param name="releaseNonDataRetentionResource">The release non-data retention resource status.</param>
        /// <param name="blockNewResourceCreation">The block new resource creation status.</param>
        public AdditionalStateInformation(ResourceStatus releaseNonDataRetentionResource, ResourceStatus blockNewResourceCreation)
        {
            ReleaseNonDataRetentionResource = releaseNonDataRetentionResource;
            BlockNewResourceCreation = blockNewResourceCreation;
        }

        /// <summary>
        /// Gets or sets the release non-data retention resource status.
        /// </summary>
        [JsonProperty("releaseNonDataRetentionResource")]
        public ResourceStatus ReleaseNonDataRetentionResource { get; set; }

        /// <summary>
        /// Gets or sets the block new resource creation status.
        /// </summary>
        [JsonProperty("blockNewResourceCreation")]
        public ResourceStatus BlockNewResourceCreation { get; set; }
    }
}
