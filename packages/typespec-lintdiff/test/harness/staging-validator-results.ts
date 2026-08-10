#!/usr/bin/env node

/* eslint-disable no-console */

import spectralPkg from "@stoplight/spectral-core";
import rulesetsPkg from "@microsoft.azure/openapi-validator-rulesets";
import * as fs from "fs";
import cloneDeep from "lodash/cloneDeep.js";
import * as path from "path";
import { pathToFileURL } from "url";

const { spectralRulesets, deleteRulesPropertiesInPayloadNotValidForSpectralRules } =
  rulesetsPkg;
const { Spectral } = spectralPkg;
const RULE = "ValidQueryParametersForPointOperations";
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

export async function generateStagingValidatorResults(datasetDir: string): Promise<void> {
  const metadata = JSON.parse(
    fs.readFileSync(path.join(datasetDir, "_meta.json"), "utf8"),
  ) as DatasetMetadata;
  const rule = cloneDeep(
    spectralRulesets.azARM.rules[RULE],
  );
  const ruleset = { rules: { [RULE]: rule } };
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
        if (String(diagnostic.code) !== RULE) {
          continue;
        }
        results.push({
          rule: RULE,
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
  const resultsFile = `results/by-staging-rule/${RULE}.json`;
  writeJson(path.join(datasetDir, resultsFile), {
    schemaVersion: SCHEMA_VERSION,
    specsCommit: metadata.specsCommit,
    generatedAt,
    rule: RULE,
    count: results.length,
    results,
  });
  writeJson(path.join(datasetDir, "staging-validator-results.json"), {
    schemaVersion: SCHEMA_VERSION,
    specsCommit: metadata.specsCommit,
    generatedAt,
    rules: {
      [RULE]: {
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
  await generateStagingValidatorResults(datasetDir);
  console.log(`Staging validator results written to ${datasetDir}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
