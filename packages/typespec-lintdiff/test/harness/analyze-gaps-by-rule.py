#!/usr/bin/env python3
"""Analyze gap failures per rule across all projects."""

import json
import os
import re
import sys
from collections import defaultdict

def load_correlation(tests_dir="tests", catalog_path="catalog.json"):
    validator_coverage = {}
    validator_to_tsp = {}
    tsp_to_validator = {}

    for rule_dir in os.listdir(tests_dir):
        rule_md = os.path.join(tests_dir, rule_dir, "rule.md")
        if not os.path.isfile(rule_md):
            continue
        with open(rule_md) as f:
            content = f.read()
        fm_match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", content)
        if not fm_match:
            continue
        lines = fm_match.group(1).split("\n")
        parsed = {}
        current_key = ""
        current_list = None
        for line in lines:
            line = line.rstrip("\r")
            kv = re.match(r"^(\w+):\s*(.*)$", line)
            if kv:
                if current_key and current_list is not None:
                    parsed[current_key] = current_list
                current_key = kv.group(1)
                val = kv.group(2).strip()
                if val == "" or val == "[]":
                    current_list = []
                else:
                    parsed[current_key] = val
                    current_key = ""
                    current_list = None
            else:
                lm = re.match(r"^\s*-\s+(.+)$", line)
                if lm and current_list is not None:
                    item = lm.group(1).strip().strip("'\"")
                    current_list.append(item)
        if current_key and current_list is not None:
            parsed[current_key] = current_list

        vid = parsed.get("validatorRuleId")
        if not vid:
            continue
        ck = parsed.get("coverageKind", "none")
        validator_coverage[vid] = ck
        tsp_lints = parsed.get("tspLints", [])
        if isinstance(tsp_lints, str):
            tsp_lints = [tsp_lints]
        if tsp_lints:
            validator_to_tsp.setdefault(vid, set()).update(tsp_lints)
            for tc in tsp_lints:
                tsp_to_validator.setdefault(tc, set()).add(vid)

    if os.path.isfile(catalog_path):
        with open(catalog_path) as f:
            catalog = json.load(f)
        for entry in catalog:
            eid = entry["id"]
            existing = validator_coverage.get(eid)
            unconfigured = not existing or existing == "none"
            tier = entry.get("tier", "")
            if tier == "Infallible" and unconfigured:
                validator_coverage[eid] = "infallible"
            elif tier == "Template-enforced" and unconfigured:
                validator_coverage[eid] = "template"
            teq = entry.get("tspEquivalent")
            if teq and eid not in validator_to_tsp:
                validator_to_tsp.setdefault(eid, set()).add(teq)
                tsp_to_validator.setdefault(teq, set()).add(eid)

    return validator_coverage, validator_to_tsp, tsp_to_validator


def main():
    report_path = sys.argv[1] if len(sys.argv) > 1 else "reports-addtl-arm-rules/cross-repo-comparison.json"

    with open(report_path) as f:
        report = json.load(f)

    with open("catalog.json") as f:
        catalog = json.load(f)

    validator_coverage, validator_to_tsp, tsp_to_validator = load_correlation()

    # Collect all known validator rule IDs
    all_validator_rules = set(e["id"] for e in catalog)
    for vid in report["validatorRuleSummary"]:
        all_validator_rules.add(vid)

    all_tsp_rules = set(report["tspRuleSummary"].keys())

    # Init stats
    val_rule_stats = {vid: {"fired": 0, "gap": 0, "covered": 0, "no_action": 0} for vid in all_validator_rules}
    # Track which TSP rules actually fired to cover each validator rule, and how often
    # val_covering_tsp[validator_rule][tsp_rule] = number of projects where that tsp rule fired to cover it
    val_covering_tsp = defaultdict(lambda: defaultdict(int))

    compiled_results = [r for r in report["results"] if r["compileStatus"] == "success"]
    total_compiled = len(compiled_results)

    for r in compiled_results:
        tsp_codes = set(d["code"] for d in r["tspDiagnostics"])
        val_codes = set(v["code"] for v in r["validatorViolations"])

        for vc in val_codes:
            if vc not in val_rule_stats:
                val_rule_stats[vc] = {"fired": 0, "gap": 0, "covered": 0, "no_action": 0}
            val_rule_stats[vc]["fired"] += 1

            coverage = validator_coverage.get(vc)
            mapped = validator_to_tsp.get(vc, set())
            fired_tsp = [c for c in mapped if c in tsp_codes]

            if fired_tsp:
                val_rule_stats[vc]["covered"] += 1
                for tc in fired_tsp:
                    val_covering_tsp[vc][tc] += 1
            elif coverage in ("blocked", "infallible"):
                val_rule_stats[vc]["no_action"] += 1
            elif coverage == "template":
                val_rule_stats[vc]["gap"] += 1
            elif mapped:
                has_official = any(c.startswith("@azure-tools/") for c in mapped)
                if has_official:
                    val_rule_stats[vc]["no_action"] += 1
                else:
                    val_rule_stats[vc]["gap"] += 1
            else:
                val_rule_stats[vc]["gap"] += 1

    # TSP rule stats
    tsp_rule_stats = {tc: {"fired": 0} for tc in all_tsp_rules}
    for r in compiled_results:
        seen = set()
        for d in r["tspDiagnostics"]:
            if d["code"] not in seen:
                seen.add(d["code"])
                tsp_rule_stats.setdefault(d["code"], {"fired": 0})["fired"] += 1

    # ========== TABLE 1 ==========
    print(f"Total compiled projects: {total_compiled}")
    print()
    print("=" * 130)
    print("TABLE 1: VALIDATOR RULE GAP ANALYSIS (all rules)")
    print("=" * 130)
    hdr = f"{'Rule ID':<55} {'Coverage':<14} {'Fired':<8} {'Covered':<9} {'No-Action':<10} {'Gap':<8} {'Not Fired':<10}"
    print(hdr)
    print("-" * 130)

    sorted_rules = sorted(val_rule_stats.items(), key=lambda x: (-x[1]["gap"], -x[1]["fired"], x[0]))
    for vid, stats in sorted_rules:
        cov = validator_coverage.get(vid, "unknown")
        not_fired = total_compiled - stats["fired"]
        print(f"{vid:<55} {cov:<14} {stats['fired']:<8} {stats['covered']:<9} {stats['no_action']:<10} {stats['gap']:<8} {not_fired:<10}")

    # ========== TABLE 1b ==========
    print()
    print("=" * 130)
    print("TABLE 1b: TSP RULE FIRING REPORT")
    print("=" * 130)
    print(f"{'Rule ID':<80} {'Projects Fired':<15} {'Not Fired':<10}")
    print("-" * 130)
    sorted_tsp = sorted(tsp_rule_stats.items(), key=lambda x: (-x[1]["fired"], x[0]))
    for tc, stats in sorted_tsp:
        not_fired = total_compiled - stats["fired"]
        print(f"{tc:<80} {stats['fired']:<15} {not_fired:<10}")

    # ========== TABLE 2 ==========
    print()
    print("=" * 130)
    print("TABLE 2: RULE PASS/FAIL CLASSIFICATION")
    print("=" * 130)

    val_passing = [vid for vid, s in val_rule_stats.items() if s["fired"] > 0 and s["gap"] == 0]
    val_failing = [vid for vid, s in val_rule_stats.items() if s["gap"] > 0]
    val_never = [vid for vid, s in val_rule_stats.items() if s["fired"] == 0]

    tsp_firing = [tc for tc, s in tsp_rule_stats.items() if s["fired"] > 0]
    tsp_never = [tc for tc, s in tsp_rule_stats.items() if s["fired"] == 0]

    print()
    print(f"{'Category':<55} {'Validator Rules':<18} {'TypeSpec Rules':<15}")
    print("-" * 88)
    print(f"{'Passing 100% (no gaps / always fires)':<55} {len(val_passing):<18} {len(tsp_firing):<15}")
    print(f"{'Failing (gap in >= 1 project)':<55} {len(val_failing):<18} {'N/A':<15}")
    print(f"{'Never fired in any project':<55} {len(val_never):<18} {len(tsp_never):<15}")
    print(f"{'Total':<55} {len(val_rule_stats):<18} {len(tsp_rule_stats):<15}")

    print()
    print(f"--- Validator rules passing 100% ({len(val_passing)} rules) ---")
    for v in sorted(val_passing):
        cov = validator_coverage.get(v, "?")
        print(f"  OK  {v} ({cov})")

    print()
    print(f"--- Validator rules with gaps ({len(val_failing)} rules) ---")
    for v in sorted(val_failing, key=lambda x: val_rule_stats[x]["gap"], reverse=True):
        s = val_rule_stats[v]
        cov = validator_coverage.get(v, "?")
        pct = s["gap"] * 100.0 / s["fired"] if s["fired"] else 0
        print(f"  GAP {v}: gap in {s['gap']}/{s['fired']} projects ({pct:.0f}%) [{cov}]")

    print()
    print(f"--- Validator rules never fired ({len(val_never)} rules) ---")
    for v in sorted(val_never):
        cov = validator_coverage.get(v, "?")
        print(f"  --  {v} ({cov})")

    # ========== TABLE 3: TSP rules that fired and fixed gaps ==========
    print()
    print("=" * 130)
    print("TABLE 3: TSP LINT RULES THAT FIRED AND COVERED VALIDATOR GAPS")
    print("=" * 130)
    print()
    print("For each validator rule where a TSP lint rule fired to cover it, shows which TSP rules")
    print("provided coverage and in how many projects.")
    print()

    # Sort by number of projects covered (descending)
    covered_validators = sorted(
        [(vid, tsp_map) for vid, tsp_map in val_covering_tsp.items()],
        key=lambda x: sum(x[1].values()),
        reverse=True,
    )

    print(f"{'Validator Rule':<55} {'Covered':<9} {'Fired':<8} {'TSP Rule(s) That Covered It'}")
    print("-" * 130)
    for vid, tsp_map in covered_validators:
        s = val_rule_stats[vid]
        tsp_parts = []
        for tc, cnt in sorted(tsp_map.items(), key=lambda x: -x[1]):
            tsp_parts.append(f"{tc} ({cnt}x)")
        tsp_str = ", ".join(tsp_parts)
        print(f"{vid:<55} {s['covered']:<9} {s['fired']:<8} {tsp_str}")

    # Also show validator rules that have mapped TSP rules but they never fired
    print()
    print("-" * 130)
    print("Validator rules with mapped TSP rules that NEVER fired (mapped but no coverage):")
    print("-" * 130)
    mapped_but_never_covered = []
    for vid in sorted(val_rule_stats.keys()):
        mapped = validator_to_tsp.get(vid, set())
        if mapped and vid not in val_covering_tsp and val_rule_stats[vid]["fired"] > 0:
            mapped_but_never_covered.append(vid)

    if mapped_but_never_covered:
        print(f"{'Validator Rule':<55} {'Fired':<8} {'Gap':<8} {'Mapped TSP Rule(s) (never fired)'}")
        print("-" * 130)
        for vid in mapped_but_never_covered:
            s = val_rule_stats[vid]
            mapped = validator_to_tsp.get(vid, set())
            print(f"{vid:<55} {s['fired']:<8} {s['gap']:<8} {', '.join(sorted(mapped))}")
    else:
        print("  (none)")


if __name__ == "__main__":
    main()
