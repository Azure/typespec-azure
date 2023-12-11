// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;
    using System.Collections.Generic;

    /// <summary>
    /// Represents availability zone information, including location and zone mappings.
    /// </summary>
    public class AvailabilityZones
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AvailabilityZones"/> class.
        /// </summary>
        /// <param name="location">The location name.</param>
        /// <param name="zoneMappings">The list of zone mappings.</param>
        public AvailabilityZones(string location, List<ZoneMapping> zoneMappings)
        {
            Location = location;
            ZoneMappings = zoneMappings;
        }

        /// <summary>
        /// Gets or sets the availability zone location.
        /// </summary>
        [JsonProperty("location")]
        public string Location { get; set; }

        /// <summary>
        /// Gets or sets the zone mappings.
        /// </summary>
        [JsonProperty("zoneMappings")]
        public List<ZoneMapping> ZoneMappings { get; set; }
    }
}
