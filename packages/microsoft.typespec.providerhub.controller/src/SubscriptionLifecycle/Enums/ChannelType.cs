// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<ChannelType>))]
    public readonly partial struct ChannelType
    {
        public static readonly ChannelType Internal = "Internal", FieldLed = "FieldLed", CustomerLed = "CustomerLed", PartnerLed = "PartnerLed", None = "None";

        private readonly string _value;

        public ChannelType(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(ChannelType obj) =>
            obj.ToString();

        public static implicit operator ChannelType(string str) =>
            new ChannelType(str);
    }
}
