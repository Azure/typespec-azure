#!/usr/bin/env node

/* eslint-disable no-console */

import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import {
  aggregateTypeSpecResults,
  compareResults,
  comparisonMarkdown,
  coverageBreakdownMarkdown,
  createCoverageBreakdown,
  loadKnownValidatorRules,
  loadValidatorFixtureMetadata,
  loadValidatorRuleData,
  type TypeSpecDiagnostic,
  type ValidatorRuleData,
} from "./typespec-results.js";

interface ResultIndex {
  specsCommit: string;
  generatedAt: string;
  durationMs: number;
  partial: boolean;
  sourceProjectCount: number;
  filters: { path?: string; limit?: number };
  projects: Array<{ project: string; status: "success" | "failed" }>;
  rules: Record<string, { resultsFile: string }>;
}

interface ValidatorIndex {
  specsCommit: string;
  rules: Record<string, { resultsFile: string }>;
}

interface DatasetMetadata {
  projects: Array<{
    sourcePath: string;
    typespecPath: string;
    apiVersion?: string;
  }>;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function mergeRules(
  production: Record<string, ValidatorRuleData>,
  staging: Record<string, ValidatorRuleData>,
): Record<string, ValidatorRuleData> {
  return { ...production, ...staging };
}

export function refreshCoverage(
  datasetDir: string,
  packageDir: string,
  specsRepo?: string,
): void {
  const metadata = readJson<DatasetMetadata>(path.join(datasetDir, "_meta.json"));
  const typeSpecIndex = readJson<ResultIndex>(
    path.join(datasetDir, "typespec-results.json"),
  );
  const validatorIndex = readJson<ValidatorIndex>(
    path.join(datasetDir, "validator-results.json"),
  );
  const stagingPath = path.join(datasetDir, "staging-validator-results.json");
  const stagingIndex = fs.existsSync(stagingPath)
    ? readJson<ValidatorIndex>(stagingPath)
    : undefined;
  const selectedProjects = new Set(
    typeSpecIndex.projects.map((project) => project.project),
  );
  const diagnostics = Object.values(typeSpecIndex.rules).flatMap((rule) =>
    readJson<{ results: TypeSpecDiagnostic[] }>(
      path.join(datasetDir, rule.resultsFile),
    ).results,
  );
  const aggregate = aggregateTypeSpecResults(
    typeSpecIndex.specsCommit,
    typeSpecIndex.generatedAt,
    diagnostics,
  );
  const fixtureMetadata = loadValidatorFixtureMetadata(
    path.join(packageDir, "test", "fixtures"),
  );
  const mappings = new Map(
    [...fixtureMetadata].map(([rule, metadata]) => [rule, metadata.tspLints]),
  );
  const failedProjects = new Set(
    typeSpecIndex.projects
      .filter((project) => project.status === "failed")
      .map((project) => project.project),
  );
  const validatorRules = mergeRules(
    loadValidatorRuleData(datasetDir, validatorIndex, selectedProjects),
    stagingIndex
      ? loadValidatorRuleData(datasetDir, stagingIndex, selectedProjects)
      : {},
  );
  const comparison = compareResults(
    typeSpecIndex.specsCommit,
    typeSpecIndex.generatedAt,
    validatorRules,
    aggregate,
    mappings,
    {
      partial: typeSpecIndex.partial,
      sourceProjectCount: typeSpecIndex.sourceProjectCount,
      projects: [...selectedProjects],
      filters: typeSpecIndex.filters,
    },
    {
      durationMs: typeSpecIndex.durationMs,
      failedProjects,
      fixtureMetadata,
      knownValidatorRules: loadKnownValidatorRules(
        path.join(packageDir, "catalog", "validator-rule-metadata.json"),
      ),
      stagingValidatorRules: new Set(Object.keys(stagingIndex?.rules ?? {})),
      normalizationContext: {
        selectedApiVersions: new Map(
          metadata.projects.map((project) => [
            project.sourcePath,
            project.apiVersion,
          ]),
        ),
        loadSwaggerDocument: (relativePath) =>
          readJson(path.join(datasetDir, ...relativePath.split("/"))),
        loadTypeSpecSource: (projectName, relativePath) => {
          const project = metadata.projects.find(
            (candidate) => candidate.sourcePath === projectName,
          );
          if (!project) {
            throw new Error(`Unknown dataset project: ${projectName}`);
          }
          const datasetSource = path.resolve(
            datasetDir,
            ...project.typespecPath.split("/"),
            ...relativePath.split("/"),
          );
          const sourcePath = specsRepo
            ? path.resolve(specsRepo, projectName, relativePath)
            : datasetSource;
          if (!fs.existsSync(sourcePath)) {
            throw new Error(
              `TypeSpec source is outside the copied dataset; rerun with --specs-repo <path>: ${sourcePath}`,
            );
          }
          return fs.readFileSync(sourcePath, "utf8");
        },
      },
    },
  );
  const coverage = createCoverageBreakdown(comparison);
  writeJson(path.join(datasetDir, "comparison-results.json"), comparison);
  fs.writeFileSync(
    path.join(datasetDir, "comparison-results.md"),
    comparisonMarkdown(comparison),
  );
  writeJson(path.join(datasetDir, "coverage-breakdown.json"), coverage);
  fs.writeFileSync(
    path.join(datasetDir, "coverage-breakdown.md"),
    coverageBreakdownMarkdown(coverage),
  );
}

function main(): void {
  const packageDir = path.resolve(import.meta.dirname, "..", "..");
  const args = process.argv.slice(2);
  const specsRepoIndex = args.indexOf("--specs-repo");
  const specsRepo =
    specsRepoIndex === -1
      ? process.env.LINTDIFF_SPECS_REPO
      : args[specsRepoIndex + 1];
  const datasetArg = args.find(
    (argument, index) =>
      !argument.startsWith("--") && index !== specsRepoIndex + 1,
  );
  const datasetDir = path.resolve(datasetArg ?? path.join(packageDir, "specs"));
  refreshCoverage(
    datasetDir,
    packageDir,
    specsRepo ? path.resolve(specsRepo) : undefined,
  );
  console.log(`Coverage reports refreshed in ${datasetDir}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
