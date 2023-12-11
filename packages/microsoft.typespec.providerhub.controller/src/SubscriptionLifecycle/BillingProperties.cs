// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

namespace Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle
{
    using Microsoft.TypeSpec.ProviderHub.Controller.SubscriptionLifeCycle.Enums;
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;

    /// <summary>
    /// Represents the billing properties on the subscription.
    /// </summary>
    public class BillingProperties
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BillingProperties"/> class.
        /// </summary>
        /// <param name="channelType">The channel type.</param>
        /// <param name="paymentType">The payment type.</param>
        /// <param name="workloadType">The workload type.</param>
        /// <param name="billingType">The billing type.</param>
        /// <param name="costCategoryCode">The cost category code.</param>
        /// <param name="tier">The billing tier.</param>
        /// <param name="billingAccount">The billing account information.</param>
        /// <param name="additionalStateInformation">The additional state information.</param>
        public BillingProperties(ChannelType channelType, PaymentType paymentType, WorkloadType workloadType, BillingType billingType, CostCategory costCategory, Tier tier, BillingAccount billingAccount, AdditionalStateInformation additionalStateInformation)
        {
            ChannelType = channelType;
            PaymentType = paymentType;
            WorkloadType = workloadType;
            BillingType = billingType;
            CostCategory = costCategory;
            Tier = tier;
            BillingAccount = billingAccount;
            AdditionalStateInformation = additionalStateInformation;
        }

        /// <summary>
        /// Gets or sets the channel type.
        /// </summary>
        [JsonProperty("channelType")]
        public ChannelType? ChannelType { get; set; }

        /// <summary>
        /// Gets or sets the payment type.
        /// </summary>
        [JsonProperty("paymentType")]
        public PaymentType? PaymentType { get; set; }

        /// <summary>
        /// Gets or sets the workload type.
        /// </summary>
        [JsonProperty("workloadType")]
        public WorkloadType? WorkloadType { get; set; }

        /// <summary>
        /// Gets or sets the billing type.
        /// </summary>
        [JsonProperty("billingType")]
        public BillingType? BillingType { get; set; }

        /// <summary>
        /// Gets or sets the cost category.
        /// </summary>
        public CostCategory CostCategory { get; set; }

        /// <summary>
        /// Gets or sets the tier.
        /// </summary>
        [JsonProperty("tier")]
        public Tier? Tier { get; set; }

        /// <summary>
        /// Gets or sets the billing account information.
        /// </summary>
        [JsonProperty("billingAccount")]
        public BillingAccount BillingAccount { get; set; }

        /// <summary>
        /// Gets or sets additional state information.
        /// </summary>
        [JsonProperty("additionalStateInformation")]
        public AdditionalStateInformation AdditionalStateInformation { get; set; }
    }
}
