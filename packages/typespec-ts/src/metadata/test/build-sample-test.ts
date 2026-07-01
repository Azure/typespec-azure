import { ClientModel } from "../../interfaces.js";
import { sampleTestContent } from "./template.js";

export function buildSampleTest(_model: ClientModel) {
  return {
    path: "test/public/sampleTest.spec.ts",
    content: sampleTestContent,
  };
}
