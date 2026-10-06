import { PathUncheckedResponse, StreamableMethod } from "@azure-rest/core-client";
import type { NodeJSReadableStream } from "@azure/core-sse";

export type SseResponse = PathUncheckedResponse & {
  body?: NodeJSReadableStream;
};

export async function getSseResponse(streamableMethod: StreamableMethod): Promise<SseResponse> {
  return (await streamableMethod.asNodeStream()) as SseResponse;
}

export async function cancelSseResponse(response: SseResponse): Promise<void> {
  response.body?.destroy();
}

export async function parseSseErrorResponse(response: SseResponse): Promise<PathUncheckedResponse> {
  if (!response.body) {
    return response;
  }

  const decoder = new TextDecoder();
  let body = "";
  for await (const chunk of response.body) {
    body += decoder.decode(chunk, { stream: true });
  }
  body += decoder.decode();

  return {
    ...response,
    body: body.length > 0 ? parseErrorBody(body, getContentType(response.headers)) : undefined,
  } as PathUncheckedResponse;
}

function parseErrorBody(body: string, contentType: string | undefined): unknown {
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
  return mediaType?.endsWith("/json") || mediaType?.endsWith("+json") ? JSON.parse(body) : body;
}

function getContentType(headers: Record<string, string>): string | undefined {
  return Object.entries(headers).find(([name]) => name.toLowerCase() === "content-type")?.[1];
}
