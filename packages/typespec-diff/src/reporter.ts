import pc from "picocolors";
import { DiffMessage, Severity } from "./rules.js";

const msgCaches: string[] = [];
function isCached(msg: DiffMessage) {
  const str = JSON.stringify(msg);
  if (msgCaches.includes(str)) {
    return true;
  } else {
    msgCaches.push(str);
  }
  return false;
}

export interface MessageReporter {
  report: (msg: DiffMessage) => void;
}

export class ConsoleJsonMessageReporter implements MessageReporter {
  public report(msg: DiffMessage) {
    if (isCached(msg)) {
      return;
    }
    const msgStr = JSON.stringify(msg, null, 2);
    // eslint-disable-next-line no-console
    if (msgCaches) console.log(msgStr);
  }
}

export class ConsoleTextMessageReporter implements MessageReporter {
  public report(msg: DiffMessage) {
    if (isCached(msg)) {
      return;
    }
    function formatSeverity(severity: Severity) {
      switch (severity) {
        case "error":
          return pc.red("[error]");
        case "warn":
          return pc.yellow("[warn] ");
        case "info":
          return pc.blue("[info] ");
      }
    }
    // eslint-disable-next-line no-console
    console.log(`${formatSeverity(msg.severity)} ${msg.code} | ${msg.message}
        ${msg.new ? `new:${msg.new}` : ""} ${msg.old ? `old:${msg.old}` : ""} ${
          Object.values(msg.versions).filter((v) => v).length > 0 ? "|" : ""
        } ${msg.versions.newVersion ? `newVersion: ${msg.versions.newVersion}` : ""} ${
          msg.versions.oldVersion ? `oldVersion: ${msg.versions.oldVersion}` : ""
        }`);
  }
}
