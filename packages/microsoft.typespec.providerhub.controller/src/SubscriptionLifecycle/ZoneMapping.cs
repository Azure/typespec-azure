// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents a mapping between logical and physical zones.
    /// </summary>
    public class ZoneMapping
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ZoneMapping"/> class.
        /// </summary>
        /// <param name="logicalZone">The logical zone.</param>
        /// <param name="physicalZone">The physical zone.</param>
        public ZoneMapping(string logicalZone, string physicalZone)
        {
            LogicalZone = logicalZone;
            PhysicalZone = physicalZone;
        }

        /// <summary>
        /// Gets or sets the logical zone.
        /// </summary>
        [JsonProperty("logicalZone")]
        public string LogicalZone { get; set; }

        /// <summary>
        /// Gets or sets the physical zone.
        /// </summary>
        [JsonProperty("physicalZone")]
        public string PhysicalZone { get; set; }
    }
}
