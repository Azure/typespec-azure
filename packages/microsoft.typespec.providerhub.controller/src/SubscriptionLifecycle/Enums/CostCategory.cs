// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<CostCategory>))]
    public readonly partial struct CostCategory
    {
        public static readonly CostCategory ResearchAndDevelopment = "FR", GeneralAndAdministrative = "FG", SalesAndMarketing = "FS", CostOfGoodsSold = "FX", BroadReach = "FB", None = "None";

        private readonly string _value;

        public CostCategory(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(CostCategory obj) =>
            obj.ToString();

        public static implicit operator CostCategory(string str) =>
            new CostCategory(str);
    }
}
