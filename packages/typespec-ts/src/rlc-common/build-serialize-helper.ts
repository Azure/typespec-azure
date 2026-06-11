import { joinPaths } from "@typespec/compiler";
import { RLCModel } from "./interfaces.js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: to fix the handlebars issue
import hbs from "handlebars";
import {
  hasCsvCollection,
  hasMultiCollection,
  hasPipeCollection,
  hasSsvCollection,
  hasTsvCollection,
} from "./helpers/operation-helpers.js";
import {
  buildCsvCollectionContent,
  buildMultiCollectionContent,
  buildPipeCollectionContent,
  buildSsvCollectionContent,
  buildTsvCollectionContent,
} from "./static/serialize-helper.js";

export function buildSerializeHelper(model: RLCModel) {
  let serializeHelperContent = "";
  if (hasMultiCollection(model)) {
    serializeHelperContent += "\n" + buildMultiCollectionContent;
  }
  if (hasPipeCollection(model)) {
    serializeHelperContent += "\n" + buildPipeCollectionContent;
  }
  if (hasSsvCollection(model)) {
    serializeHelperContent += "\n" + buildSsvCollectionContent;
  }
  if (hasTsvCollection(model)) {
    serializeHelperContent += "\n" + buildTsvCollectionContent;
  }
  if (hasCsvCollection(model)) {
    serializeHelperContent += "\n" + buildCsvCollectionContent;
  }
  if (serializeHelperContent !== "") {
    const readmeFileContents = hbs.compile(serializeHelperContent, {
      noEscape: true,
    });
    const { srcPath } = model;
    return {
      path: joinPaths(srcPath, "serializeHelper.ts"),
      content: readmeFileContents({}),
    };
  }
  return undefined;
}
