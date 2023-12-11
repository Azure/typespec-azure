// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

using Newtonsoft.Json;

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums
{
    [JsonConverter(typeof(EnumJsonConverter<RegistrationState>))]
    public readonly partial struct RegistrationState
    {
        public static readonly RegistrationState Registered = "Registered", Unregistered = "Unregistered", Warned = "Warned", Suspended = "Suspended", Deleted = "Deleted";

        private readonly string _value;

        public RegistrationState(string value) =>
            _value = value;

        public override string ToString() =>
            _value;

        public static implicit operator string(RegistrationState obj) =>
            obj.ToString();

        public static implicit operator RegistrationState(string str) =>
            new RegistrationState(str);
    }
}
