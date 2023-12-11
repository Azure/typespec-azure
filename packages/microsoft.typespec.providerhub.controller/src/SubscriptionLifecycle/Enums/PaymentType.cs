// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<PaymentType>))]
    public readonly partial struct PaymentType
    {
        public static readonly PaymentType Paid = "Paid", Free = "Free", Entitlement = "Entitlement", SponsoredPlus = "SponsoredPlus", Sponsored = "Sponsored", Benefit = "Benefit", None = "None";

        private readonly string _value;

        public PaymentType(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(PaymentType obj) =>
            obj.ToString();

        public static implicit operator PaymentType(string str) =>
            new PaymentType(str);
    }
}
