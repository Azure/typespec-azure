#!/usr/bin/env python3
"""Coverage breakdown: 100%, 80-99%, <80% for validator rules with TSP coverage."""

import json, os, re, sys
from collections import defaultdict


def load_correlation():
    validator_coverage = {}
    validator_to_tsp = {}
    tests_dir = "tests"
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
                if val in ("", "[]"):
                    current_list = []
                else:
                    parsed[current_key] = val
                    current_key = ""
                    current_list = None
            else:
                lm = re.match(r"^\s*-\s+(.+)$", line)
                if lm and current_list is not None:
                    current_list.append(lm.group(1).strip().strip("'\""))
        if current_key and current_list is not None:
            parsed[current_key] = current_list
        vid = parsed.get("validatorRuleId")
        if not vid:
            continue
        validator_coverage[vid] = parsed.get("coverageKind", "none")
        tsp_lints = parsed.get("tspLints", [])
        if isinstance(tsp_lints, str):
            tsp_lints = [tsp_lints]
        if tsp_lints:
            validator_to_tsp.setdefault(vid, set()).update(tsp_lints)

    if os.path.isfile("catalog.json"):
        with open("catalog.json") as f:
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
    return validator_coverage, validator_to_tsp


def main():
    # Parse args: [report_path] [--arm-only]
    report_path = "reports-addtl-arm-rules/cross-repo-comparison.json"
    arm_only = False
    for arg in sys.argv[1:]:
        if arg == "--arm-only":
            arm_only = True
        else:
            report_path = arg

    validator_coverage, validator_to_tsp = load_correlation()

    with open(report_path) as f:
        report = json.load(f)

    with open("catalog.json") as f:
        catalog = json.load(f)

    # Build applicability lookup from catalog
    catalog_applicability = {e["id"]: e.get("applicability", "Both") for e in catalog}

    compiled = [r for r in report["results"] if r["compileStatus"] == "success"]
    total = len(compiled)

    # All known validator rule IDs
    all_validator_rules = set(e["id"] for e in catalog)
    for vid in report.get("validatorRuleSummary", {}):
        all_validator_rules.add(vid)

    # Filter to ARM + common if requested
    if arm_only:
        all_validator_rules = set(
            vid for vid in all_validator_rules
            if catalog_applicability.get(vid, "Both") in ("ARM", "Both")
        )

    # Per-rule live stats: how often it fired and how often a TSP lint covered it
    live_stats = defaultdict(lambda: {"fired": 0, "covered": 0, "no_action": 0, "gap": 0, "covering_tsp": defaultdict(int)})
    for r in compiled:
        tsp_codes = set(d["code"] for d in r["tspDiagnostics"])
        seen_val = set()
        for v in r["validatorViolations"]:
            vc = v["code"]
            if vc in seen_val:
                continue
            seen_val.add(vc)
            live_stats[vc]["fired"] += 1
            coverage = validator_coverage.get(vc)
            mapped = validator_to_tsp.get(vc, set())
            fired_tsp = [c for c in mapped if c in tsp_codes]

            if fired_tsp:
                live_stats[vc]["covered"] += 1
                for tc in fired_tsp:
                    live_stats[vc]["covering_tsp"][tc] += 1
            elif coverage in ("blocked", "infallible"):
                live_stats[vc]["no_action"] += 1
            elif coverage == "template":
                live_stats[vc]["gap"] += 1
            elif mapped:
                has_official = any(c.startswith("@azure-tools/") for c in mapped)
                if has_official:
                    live_stats[vc]["no_action"] += 1
                else:
                    live_stats[vc]["gap"] += 1
            else:
                live_stats[vc]["gap"] += 1

    # Classify every validator rule into coverage buckets
    # A rule is "covered" when either:
    #   - A mapped TSP lint fired in the same project (covered)
    #   - It's mapped to an official @azure-tools/ lint that owns it (no_action)
    #   - It's blocked/infallible (TypeSpec prevents structurally)
    # Coverage % = (covered + no_action) / fired

    # Bucket: 100% coverage
    full_lint = []
    # Bucket: 80-99% coverage
    high_lint = []
    # Bucket: <80% coverage
    low_lint = []
    # Bucket: blocked/infallible — no lint needed
    blocked_infallible = []
    # Bucket: validator never fired but has mapping (effectively covered)
    never_fired_covered = []
    # Bucket: needs migration — validator fired but no TSP lint mapping exists
    needs_migration = []
    # Bucket: needs investigation — validator never fired and no mapping
    needs_investigation = []

    for vid in sorted(all_validator_rules):
        cov_kind = validator_coverage.get(vid, "unknown")
        mapped = validator_to_tsp.get(vid, set())
        ls = live_stats.get(vid, {"fired": 0, "covered": 0, "no_action": 0, "gap": 0, "covering_tsp": defaultdict(int)})
        fired = ls["fired"]
        covered = ls["covered"]
        no_action = ls["no_action"]
        effectively_covered = covered + no_action

        # Format TSP rules — show which ones actually fired, then which are mapped
        tsp_parts = []
        for tc, cnt in sorted(ls["covering_tsp"].items(), key=lambda x: -x[1]):
            tsp_parts.append("{} ({}x)".format(tc, cnt))
        fired_tsp_str = ", ".join(tsp_parts)
        mapped_str = ", ".join(sorted(mapped))
        tsp_str = fired_tsp_str if fired_tsp_str else mapped_str

        # Classify
        if cov_kind in ("blocked", "infallible"):
            blocked_infallible.append((vid, cov_kind, fired, effectively_covered, tsp_str))
        elif fired == 0 and mapped:
            # Validator never fired, but we have a mapping — effectively covered
            never_fired_covered.append((vid, cov_kind, fired, 0, tsp_str))
        elif fired > 0 and mapped:
            pct = effectively_covered * 100.0 / fired
            if pct >= 99.999:
                full_lint.append((vid, cov_kind, fired, covered, no_action, pct, fired_tsp_str, mapped_str))
            elif pct >= 80:
                high_lint.append((vid, cov_kind, fired, covered, no_action, pct, fired_tsp_str, mapped_str))
            else:
                low_lint.append((vid, cov_kind, fired, covered, no_action, pct, fired_tsp_str, mapped_str))
        elif fired > 0 and not mapped:
            # Fired but no mapping — needs investigation/migration
            needs_migration.append((vid, cov_kind, fired))
        elif fired == 0 and not mapped:
            # Never fired and no mapping — needs investigation
            needs_investigation.append((vid, cov_kind, fired))
        else:
            needs_investigation.append((vid, cov_kind, fired))

    total_covered = len(full_lint) + len(high_lint) + len(low_lint) + len(blocked_infallible) + len(never_fired_covered)
    total_needs_work = len(needs_migration) + len(needs_investigation)

    SEP = "=" * 150
    DASH = "-" * 150

    print("Total compiled projects: {}".format(total))
    if arm_only:
        print("Filter: ARM + Common rules only (excluding DataPlane-only)")
    print("Total validator rules{}: {}".format(" (filtered)" if arm_only else "", len(all_validator_rules)))
    print("Total with some form of coverage: {}".format(total_covered))
    print("Total needing investigation/migration: {}".format(total_needs_work))
    print()

    # ===== SUMMARY TABLE =====
    print(SEP)
    print("COVERAGE SUMMARY")
    print(SEP)
    print("{:<60} {:<10}".format("Category", "Rules"))
    print(DASH)
    print("{:<60} {:<10}".format("100% coverage (lint fired + official/no-action)", len(full_lint)))
    print("{:<60} {:<10}".format("80-99% coverage", len(high_lint)))
    print("{:<60} {:<10}".format("Below 80% coverage", len(low_lint)))
    print("{:<60} {:<10}".format("Blocked/Infallible (TypeSpec prevents structurally)", len(blocked_infallible)))
    print("{:<60} {:<10}".format("Validator never fired (mapped, effectively covered)", len(never_fired_covered)))
    print("{:<60} {:<10}".format("Needs migration (fired, no mapping)", len(needs_migration)))
    print("{:<60} {:<10}".format("Needs investigation (never fired, no mapping)", len(needs_investigation)))
    print(DASH)
    print("{:<60} {:<10}".format("TOTAL", len(all_validator_rules)))

    # ===== 100% COVERAGE =====
    print()
    print(SEP)
    print("100% COVERAGE ({} rules) - every validator firing is covered by lint or official ruleset".format(len(full_lint)))
    print(SEP)
    print("{:<45} {:<12} {:<7} {:<7} {:<10} {:<7} {}".format(
        "Validator Rule", "CovKind", "Fired", "Lint", "Official", "Pct", "TSP Rule(s)"))
    print(DASH)
    for vid, ck, fired, covered, no_action, pct, fired_tsp, mapped in sorted(full_lint, key=lambda x: -x[2]):
        tsp_display = fired_tsp if fired_tsp else mapped
        print("{:<45} {:<12} {:<7} {:<7} {:<10} {:<7.1f} {}".format(
            vid, ck, fired, covered, no_action, pct, tsp_display))

    # ===== 80-99% COVERAGE =====
    print()
    print(SEP)
    print("80-99% COVERAGE ({} rules)".format(len(high_lint)))
    print(SEP)
    print("{:<45} {:<12} {:<7} {:<7} {:<10} {:<7} {}".format(
        "Validator Rule", "CovKind", "Fired", "Lint", "Official", "Pct", "TSP Rule(s)"))
    print(DASH)
    for vid, ck, fired, covered, no_action, pct, fired_tsp, mapped in sorted(high_lint, key=lambda x: -x[5]):
        tsp_display = fired_tsp if fired_tsp else mapped
        print("{:<45} {:<12} {:<7} {:<7} {:<10} {:<7.1f} {}".format(
            vid, ck, fired, covered, no_action, pct, tsp_display))

    # ===== <80% COVERAGE =====
    print()
    print(SEP)
    print("BELOW 80% COVERAGE ({} rules)".format(len(low_lint)))
    print(SEP)
    print("{:<45} {:<12} {:<7} {:<7} {:<10} {:<7} {}".format(
        "Validator Rule", "CovKind", "Fired", "Lint", "Official", "Pct", "TSP Rule(s)"))
    print(DASH)
    for vid, ck, fired, covered, no_action, pct, fired_tsp, mapped in sorted(low_lint, key=lambda x: -x[5]):
        tsp_display = fired_tsp if fired_tsp else mapped
        print("{:<45} {:<12} {:<7} {:<7} {:<10} {:<7.1f} {}".format(
            vid, ck, fired, covered, no_action, pct, tsp_display))

    # ===== BLOCKED/INFALLIBLE =====
    print()
    print(SEP)
    print("BLOCKED/INFALLIBLE ({} rules) - TypeSpec prevents these structurally".format(len(blocked_infallible)))
    print(SEP)
    print("{:<45} {:<12} {:<8} {}".format("Validator Rule", "CovKind", "Fired", "Mapped TSP Rule(s)"))
    print(DASH)
    for vid, ck, fired, covered, tsp_str in sorted(blocked_infallible, key=lambda x: x[0]):
        print("{:<45} {:<12} {:<8} {}".format(vid, ck, fired, tsp_str))

    # ===== NEVER FIRED BUT MAPPED =====
    print()
    print(SEP)
    print("VALIDATOR NEVER FIRED, MAPPED ({} rules) - effectively covered".format(len(never_fired_covered)))
    print(SEP)
    print("{:<45} {:<12} {}".format("Validator Rule", "CovKind", "Mapped TSP Rule(s)"))
    print(DASH)
    for vid, ck, fired, covered, tsp_str in sorted(never_fired_covered, key=lambda x: x[0]):
        print("{:<45} {:<12} {}".format(vid, ck, tsp_str))

    # ===== NEEDS MIGRATION =====
    print()
    print(SEP)
    print("NEEDS MIGRATION ({} rules) - validator fired but no TSP lint mapping exists".format(len(needs_migration)))
    print(SEP)
    print("{:<45} {:<12} {:<8}".format("Validator Rule", "CovKind", "Fired"))
    print(DASH)
    for vid, ck, fired in sorted(needs_migration, key=lambda x: -x[2]):
        print("{:<45} {:<12} {:<8}".format(vid, ck, fired))

    # ===== NEEDS INVESTIGATION =====
    print()
    print(SEP)
    print("NEEDS INVESTIGATION ({} rules) - validator never fired, no mapping".format(len(needs_investigation)))
    print(SEP)
    print("{:<45} {:<12} {:<8}".format("Validator Rule", "CovKind", "Fired"))
    print(DASH)
    for vid, ck, fired in sorted(needs_investigation, key=lambda x: x[0]):
        print("{:<45} {:<12} {:<8}".format(vid, ck, fired))


if __name__ == "__main__":
    main()
