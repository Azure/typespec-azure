import type { ServiceOperation } from "../../utils/operation-util.js";

/**
 * Classifies supported structured streams without generating types or binding references.
 */
export function getStructuredStreamKind(operation: ServiceOperation): "sse" | "jsonl" | undefined {
  if (operation.kind === "paging" || operation.kind === "lro" || operation.kind === "lropaging") {
    return undefined;
  }

  const streamMetadata = operation.response?.streamMetadata;
  if (!streamMetadata) {
    return undefined;
  }

  const contentTypes = streamMetadata.contentTypes ?? [];
  if (
    operation.response.sseMetadata &&
    contentTypes.some((contentType) => contentType.includes("event-stream"))
  ) {
    return "sse";
  }

  if (
    contentTypes.some((contentType) => contentType.includes("jsonl")) &&
    (streamMetadata.streamType.kind === "model" || streamMetadata.streamType.kind === "union")
  ) {
    return "jsonl";
  }

  return undefined;
}
