import "./base.tsp";
import "@azure-tools/typespec-azurite-emitter";

using QueuePilot;
using Azurite;

@@maxValue(QueuePilot.VisibilityTimeoutParameter.visibilityTimeout, 2147483647);

@@makeOptional(QueuePilot.AccessPolicy.start);
@@makeOptional(QueuePilot.AccessPolicy.expiry);
@@makeOptional(QueuePilot.AccessPolicy.permission);
