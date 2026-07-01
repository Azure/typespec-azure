import { ClientModel } from "../../interfaces.js";
import { recordedClientContent } from "./template.js";

export function buildRecordedClientFile(_model: ClientModel) {
  return {
    path: "test/public/utils/recordedClient.ts",
    content: recordedClientContent,
  };
}
