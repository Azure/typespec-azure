// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<WorkloadType>))]
    public readonly partial struct WorkloadType
    {
        public static readonly WorkloadType Production = "Production", DevTest = "DevTest", None = "None";

        private readonly string _value;

        public WorkloadType(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(WorkloadType obj) =>
            obj.ToString();

        public static implicit operator WorkloadType(string str) =>
            new WorkloadType(str);
    }
}
