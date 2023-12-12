// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// <auto-generated />

using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Microsoft.TypeSpec.ProviderHub.Controller;

namespace Microsoft.Contoso.Service.Models
{
    /// <summary>
    /// A ContosoProviderHub resource
    /// </summary>
    public partial class Employee : TrackedResource
    {

        /// <summary>
        /// Extensibility point - allows changing class properties during construction.
        /// </summary>
        partial void OnBeforeInitialize();

        /// <summary>
        /// Extensibility point - allows changing class properties during construction.
        /// </summary>
        partial void OnAfterInitialize();

        /// <summary>
        /// Initializes a new instance of the Employee class.
        /// </summary>
        public Employee()
        {
            OnBeforeInitialize();
            OnAfterInitialize();
        }

        /// <summary>
        /// The resource-specific properties for this resource.
        /// </summary>
        [JsonProperty("properties")]
        public EmployeeProperties Properties { get; set; }



    }
}
