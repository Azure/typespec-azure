import "./base.tsp";
import "@azure-tools/typespec-azurite-emitter";

using QueuePilot;
using Azurite;

@@operationEnumName(QueuePilot.createQueue, "Queue_Create");
@@dispatchPattern(QueuePilot.createQueue, "/queue");

@@operationEnumName(QueuePilot.getQueueProperties, "Queue_GetProperties");
@@dispatchPattern(QueuePilot.getQueueProperties, "/queue");

@@operationEnumName(QueuePilot.listMessages, "Messages_List");
@@dispatchPattern(QueuePilot.listMessages, "/queue/messages");

@@operationEnumName(QueuePilot.setAccessPolicy, "Queue_SetAccessPolicy");
@@dispatchPattern(QueuePilot.setAccessPolicy, "/queue");

@@maxValue(QueuePilot.VisibilityTimeoutParameter.visibilityTimeout, 2147483647);

@@makeOptional(QueuePilot.AccessPolicy.start);
@@makeOptional(QueuePilot.AccessPolicy.expiry);
@@makeOptional(QueuePilot.AccessPolicy.permission);
