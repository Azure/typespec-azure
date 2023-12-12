// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// <auto-generated />

using System;
using System.ComponentModel;
using System.Runtime.Serialization;
using Newtonsoft.Json;
using Microsoft.TypeSpec.ProviderHub.Controller;

namespace Microsoft.Contoso.Service.Models
{
    /// <summary>
    /// Helper for merging canonical Employee models as part of a PUT or PATCH operation
    /// </summary>
    public partial class EmployeeCopyHelper
    {
        /// <summary>
        /// Extensibility point: perform actions before data is copied
        /// </summary>
        /// <param name="source">The source Employee</param>
        /// <param name="target">The target Employee</param>
        partial void OnBeginCopyForPatch(Employee source, Employee target);

        /// <summary>
        /// Extensibility point: perform actions after data is copied
        /// </summary>
        /// <param name="source">The source Employee</param>
        /// <param name="target">The target Employee</param>
        partial void OnEndCopyForPatch(Employee source, Employee target);

        /// <summary>
        /// Copy the properties of a source Employee to a target Employee, using PATCH semantics
        /// </summary>
        /// <param name="source">The source Employee</param>
        /// <param name="target">The target Employee</param>
        public void CopyForPatch(Employee source, Employee target)
        {
            var serialization = source.SerializationInfo;
            OnBeginCopyForPatch(source, target);
            if (serialization.IsSerializedProperty(nameof(source.Properties)))
                target.Properties = source.Properties;
            OnEndCopyForPatch(source, target);
        }

        /// <summary>
        /// Extensibility point: perform actions before data is copied
        /// </summary>
        /// <param name="source">The source Employee</param>
        /// <param name="target">The target Employee</param>
        partial void OnBeginCopyForPut(Employee source, Employee target);

        /// <summary>
        /// Extensibility point: perform actions after data is copied
        /// </summary>
        /// <param name="source">The source Employee</param>
        /// <param name="target">The target Employee</param>
        partial void OnEndCopyForPut(Employee source, Employee target);

        /// <summary>
        /// Copy the properties of a source Employee to a target Employee, using PUT semantics
        /// </summary>
        /// <param name="source">The source Employee</param>
        /// <param name="target">The target Employee</param>
        public void CopyForPut(Employee source, Employee target)
        {
            var serialization = source.SerializationInfo;
            OnBeginCopyForPut(source, target);
            target.Properties = source.Properties;
            OnEndCopyForPut(source, target);
        }
    }
}
