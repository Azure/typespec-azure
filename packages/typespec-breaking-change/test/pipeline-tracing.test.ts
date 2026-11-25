import { describe, expect, it } from "vitest";
import {
  analyzeBaseAndHead,
  analyzeProgram,
  type AnalysisStage,
} from "../src/pipeline/orchestrator.js";
import { resolveFindingLocation } from "../src/pipeline/resolve-location.js";
import type { Finding } from "../src/types.js";
import { TesterWithSuppressions } from "./test-host.js";

describe("pipeline stage observation", () => {
  it.each(["single-program", "base-and-head"] as const)(
    "observes actual ordered findings without changing %s analysis",
    async (mode) => {
      const { program: base } = await TesterWithSuppressions.compile(`
        @service @versioned(Versions) namespace Widgets;
        enum Versions { v1: "2024-01-01" }
        model Widget { value: string; }
        @post @route("/widgets") op create(@body widget: Widget): Widget;
      `);
      const { program: head } = await TesterWithSuppressions.compile(`
        @service @versioned(Versions) namespace Widgets;
        enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
        model Widget {
          @approvedBreakingChange("accepted", #{ kind: "ResourcePropertyTypeChanged", since: "2025-01-01" })
          @typeChangedFrom(Versions.v2, string)
          value: boolean;
        }
        @post @route("/widgets") op create(@body widget: Widget): Widget;
      `);
      const stages: { stage: AnalysisStage; kinds: string[]; suppressed: boolean[] }[] = [];
      let completed: readonly Finding[] | undefined;
      const options = {
        onStage(stage: AnalysisStage, findings: readonly Finding[]) {
          stages.push({
            stage,
            kinds: findings.map((finding) => finding.diff.kind),
            suppressed: findings.map((finding) => finding.suppressed),
          });
          if (stage === "complete") {
            completed = findings;
            expect(resolveFindingLocation(findings[0])).toBeDefined();
          }
        },
      };
      const result =
        mode === "single-program"
          ? analyzeProgram(head, options)
          : analyzeBaseAndHead(base, head, options);
      const unobserved =
        mode === "single-program" ? analyzeProgram(head) : analyzeBaseAndHead(base, head);
      expect(stages).toEqual([
        {
          stage: "classified",
          kinds: ["RequestPropertyTypeChanged", "ResponsePropertyTypeChanged"],
          suppressed: [false, false],
        },
        {
          stage: "deduplicated",
          kinds: ["RequestPropertyTypeChanged", "ResponsePropertyTypeChanged"],
          suppressed: [false, false],
        },
        { stage: "resource-merged", kinds: ["ResourcePropertyTypeChanged"], suppressed: [false] },
        { stage: "collapsed", kinds: ["ResourcePropertyTypeChanged"], suppressed: [false] },
        { stage: "complete", kinds: ["ResourcePropertyTypeChanged"], suppressed: [true] },
      ]);
      expect(completed).toBe(result.findings);
      expect(result.summary).toEqual(unobserved.summary);
      const contract = (findings: readonly Finding[]) =>
        findings.map((finding) => ({
          kind: finding.diff.kind,
          identity: finding.diff.identity,
          origin: finding.diff.origin?.declarationPath,
          phase: finding.phase,
          versionPair: finding.versionPair,
          severity: finding.severity,
          rule: finding.rule,
          suppressed: finding.suppressed,
          suppressionReason: finding.suppressionReason,
          suppressionClassification: finding.suppressionClassification,
          sourceTraceLevel: resolveFindingLocation(finding)?.sourceTraceLevel,
        }));
      expect(contract(result.findings)).toEqual(contract(unobserved.findings));
    },
  );
});
