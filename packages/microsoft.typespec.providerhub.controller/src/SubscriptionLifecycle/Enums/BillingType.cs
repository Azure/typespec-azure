// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<BillingType>))]
    public readonly partial struct BillingType
    {
        public static readonly BillingType Legacy = "Legacy", Modern = "Modern";

        private readonly string _value;

        public BillingType(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(BillingType obj) =>
            obj.ToString();

        public static implicit operator BillingType(string str) =>
            new BillingType(str);
    }
}
