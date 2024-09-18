import { ExtensionConfig } from "../reporters/types.js";

export function getFetchHttpOverride(): ExtensionConfig["httpXHROverride"] {
  return {
    sendPOST: (payload, onComplete) => {
      fetch(payload.urlString, {
        method: "POST",
        headers: {
          ...payload.headers,
        },
        body: payload.data,
      })
        .then(async (response) => {
          const body = await response.text();
          onComplete(response.status, convertHeadersToRecord(response.headers), body);
        })
        .catch(() => {
          // set to 0 so we can retry events
          onComplete(0, {});
        });
    },
  };
}

function convertHeadersToRecord(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
