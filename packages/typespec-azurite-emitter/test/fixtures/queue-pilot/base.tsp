import "@typespec/http";

using Http;

@service(#{ title: "Queue Pilot Service" })
namespace QueuePilot {
  alias VisibilityTimeoutParameter = {
    @maxValue(604800)
    @query
    visibilityTimeout?: int32;
  };

  model AccessPolicy {
    start: utcDateTime;
    expiry: utcDateTime;
    permission: string;
  }

  model SignedIdentifier {
    id: string;
    accessPolicy: AccessPolicy;
  }

  model SignedIdentifiers {
    items: SignedIdentifier[];
  }

  model QueueMetadata {
    /** Arbitrary emulator-defined metadata values for the queue. */
    description?: string;

    /** Whether the queue allows anonymous access. */
    publicAccess?: boolean;
  }

  model QueueProperties {
    /** Name of the queue. */
    name: string;

    /** Arbitrary emulator-defined metadata values for the queue. */
    description?: string;
  }

  model QueueMessage {
    /** Opaque message id assigned by the service. */
    messageId: string;

    /** Message body text. */
    messageText: string;
  }

  model QueueMessageList {
    messages: QueueMessage[];
  }

  @route("/{queueName}")
  @put
  op createQueue(@path queueName: string, @body metadata: QueueMetadata): {
    @statusCode statusCode: 201;
    @header("x-ms-request-id") requestId: string;
  };

  @route("/{queueName}")
  @get
  op getQueueProperties(@path queueName: string): {
    @statusCode statusCode: 200;
    @header("x-ms-approximate-messages-count") approximateMessagesCount: int32;
    @body properties: QueueProperties;
  };

  @route("/{queueName}")
  @delete
  op deleteQueue(@path queueName: string): {
    @statusCode statusCode: 204;
    @header("x-ms-request-id") requestId: string;
  };

  @route("/{queueName}/messages")
  @get
  op listMessages(
    @path queueName: string,
    @query numOfMessages?: int32,
    ...VisibilityTimeoutParameter,
  ): {
    @statusCode statusCode: 200;
    @body messages: QueueMessageList;
  };

  @route("/{queueName}?comp=acl")
  @put
  op setAccessPolicy(@path queueName: string, @body queueAcl: SignedIdentifiers): {
    @statusCode statusCode: 204;
  };
}
