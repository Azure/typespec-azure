import "./base.tsp";
import "@azure-tools/typespec-azurite-emitter";
import "@azure-tools/typespec-client-generator-core";

using QueuePilot;
using Azurite;
using Azure.ClientGenerator.Core;

@@clientName(QueuePilot.createQueue, "Queue_Create");

@@makeOptional(QueuePilot.AccessPolicy.start);
@@makeOptional(QueuePilot.AccessPolicy.expiry);
@@makeOptional(QueuePilot.AccessPolicy.permission);
