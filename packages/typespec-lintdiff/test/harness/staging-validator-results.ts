#!/usr/bin/env node

/* eslint-disable no-console */

import rulesetsPkg from "@microsoft.azure/openapi-validator-rulesets";
import spectralPkg from "@stoplight/spectral-core";
import * as fs from "fs";
import cloneDeep from "lodash/cloneDeep.js";
import * as path from "path";
import { pathToFileURL } from "url";

const { spectralRulesets, deleteRulesPropertiesInPayloadNotValidForSpectralRules } = rulesetsPkg;
const { Spectral } = spectralPkg;
const DEFAULT_RULE = "ValidQueryParametersForPointOperations";
const SCHEMA_VERSION = 6;

interface DatasetMetadata {
  specsCommit: string;
  projects: Array<{
    sourcePath: string;
    swaggerFiles: string[];
  }>;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function generateStagingValidatorResults(
  datasetDir: string,
  ruleName = DEFAULT_RULE,
): Promise<void> {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(datasetDir, "_meta.json"), "utf8"),
  ) as DatasetMetadata;
  const rule = cloneDeep(spectralRulesets.azARM.rules[ruleName]);
  if (rule === undefined) {
    throw new Error(`Unknown ARM validator rule: ${ruleName}`);
  }
  const ruleset = { rules: { [ruleName]: rule } };
  deleteRulesPropertiesInPayloadNotValidForSpectralRules(ruleset);
  const spectral = new Spectral();
  spectral.setRuleset(ruleset);

  const results = [];
  for (const project of metadata.projects) {
    for (const swaggerFile of project.swaggerFiles) {
      const document = JSON.parse(
        fs.readFileSync(path.join(datasetDir, ...swaggerFile.split("/")), "utf8"),
      );
      for (const diagnostic of await spectral.run(document)) {
        if (String(diagnostic.code) !== ruleName) {
          continue;
        }
        results.push({
          rule: ruleName,
          level: diagnostic.severity === 0 ? "error" : "warning",
          project: project.sourcePath,
          swaggerFile,
          message: diagnostic.message,
          path: diagnostic.path,
        });
      }
    }
  }

  const generatedAt = new Date().toISOString();
  const resultsFile = `results/by-staging-rule/${ruleName}.json`;
  writeJson(path.join(datasetDir, resultsFile), {
    schemaVersion: SCHEMA_VERSION,
    specsCommit: metadata.specsCommit,
    generatedAt,
    rule: ruleName,
    count: results.length,
    results,
  });
  writeJson(path.join(datasetDir, "staging-validator-results.json"), {
    schemaVersion: SCHEMA_VERSION,
    specsCommit: metadata.specsCommit,
    generatedAt,
    rules: {
      [ruleName]: {
        count: results.length,
        levels: { error: results.length },
        resultsFile,
      },
    },
  });
}

async function main(): Promise<void> {
  const datasetDir = path.resolve(
    process.argv[2] ?? path.join(import.meta.dirname, "..", "..", "specs"),
  );
  const ruleName = process.argv[3] ?? DEFAULT_RULE;
  await generateStagingValidatorResults(datasetDir, ruleName);
  console.log(`Staging validator results written to ${datasetDir}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
