// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<SpendingLimit>))]
    public readonly partial struct SpendingLimit
    {
        public static readonly SpendingLimit On = "On", Off = "Off", CurrentPeriodOff = "CurrentPeriodOff";

        private readonly string _value;

        public SpendingLimit(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(SpendingLimit obj) =>
            obj.ToString();

        public static implicit operator SpendingLimit(string str) =>
            new SpendingLimit(str);
    }
}
