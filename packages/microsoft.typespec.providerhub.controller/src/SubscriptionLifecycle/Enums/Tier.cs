// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<Tier>))]
    public readonly partial struct Tier
    {
        public static readonly Tier Standard = "Standard", Premium = "Premium", Priority = "Priority", Unknown = "Unknown";

        private readonly string _value;

        public Tier(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(Tier obj) =>
            obj.ToString();

        public static implicit operator Tier(string str) =>
            new Tier(str);
    }
}
