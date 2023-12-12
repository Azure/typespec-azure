// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// <auto-generated />

using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
using Microsoft.TypeSpec.ProviderHub.Controller;

namespace Microsoft.Contoso.Service
{
    /// <summary>
    /// Contract resolver for the service. This is generated to allow extensibility only.
    /// </summary>
    public partial class VersionedContractResolver : VersionedContractResolverBase
    {
        private Func<Type, string> _versionLookup;

        /// <summary>
        /// Instantiates a contract resolver, using the given version and class version mapping function.
        /// This constructor is used by the VersionedSerializer to construct the contract.
        /// </summary>
        /// <param name="version">The version string</param>
        /// <param name="versionLookup">The Type to version lookup function</param>
        public VersionedContractResolver(string version, Func<Type, string> versionLookup)
            : base(version)
        {
            OnBeforeInitialize(version, versionLookup);
            _versionLookup = versionLookup;
            OnAfterInitialize(version, versionLookup);
        }

        /// <summary>
        /// Implementing contract resolvers must provide a type-> version dictionary for types they support.
        /// This allows the service to implement service version -> library version type mappings,
        /// based on the versioned dependency in the API specification.
        /// </summary>
        /// <param name="objectType">The Type of the class to provide versioning for</param>
        /// <returns>The version for the given class</returns>
        protected override string GetModelVersion(Type objectType) => _versionLookup(objectType);

        /// <summary>
        /// Extensibility point, allows performing actions before the VersionLookup function is initialized.
        /// </summary>
        /// <param name="version">The service version</param>
        /// <param name="versionLookup">The function to look up versioned class information using the service version.</param>
        partial void OnBeforeInitialize(string version, Func<Type, string> versionLookup);

        /// <summary>
        /// Extensibility point, allows performing actions after the VersionLookup function is initialized.
        /// </summary>
        /// <param name="version">The service version</param>
        /// <param name="versionLookup">The function to look up versioned class information using the service version.</param>
        partial void OnAfterInitialize(string version, Func<Type, string> versionLookup);
    }
}
