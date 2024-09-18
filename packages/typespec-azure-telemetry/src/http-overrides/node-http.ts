import type { IncomingHttpHeaders } from "http";
import * as https from "https";
import { ExtensionConfig } from "../reporters/types.js";

export function getNodeHttpOverride(): ExtensionConfig["httpXHROverride"] {
  return {
    sendPOST: (payload, onComplete) => {
      const req = https.request(payload.urlString, {
        method: "POST",
        headers: {
          ...payload.headers,
          "Content-Type": "application/json",
        },
      });

      req.on("error", () => onComplete(0, {}));
      req.on("response", (res) => {
        const statusCode = res.statusCode;
        if (!statusCode) {
          onComplete(0, {});
          return;
        }

        res.on("error", () => onComplete(0, {}));

        let body = "";
        res.on("data", (chunk) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          const headers = convertHeadersToRecord(res.headers);
          onComplete(statusCode, headers, body);
        });
      });

      req.write(payload.data);
      req.end();
    },
  };
}

function convertHeadersToRecord(headers: IncomingHttpHeaders): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of Object.keys(headers)) {
    const value = headers[name];
    if (Array.isArray(value)) {
      result[name] = value.join(", ");
    } else if (typeof value === "string") {
      result[name] = value;
    }
  }
  return result;
}
