// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: to fix the handlebars issue
import hbs from "handlebars";
import { ClientModel } from "../../interfaces.js";
import { sampleTestContent } from "./template.js";

export function buildSampleTest(_model: ClientModel) {
  return {
    path: "test/public/sampleTest.spec.ts",
    content: hbs.compile(sampleTestContent, { noEscape: true })({}),
  };
}
