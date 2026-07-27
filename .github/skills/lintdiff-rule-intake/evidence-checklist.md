# Rule intake evidence checklist

A high-quality intake should account for all of these when they are available:

## Upstream rule definition

- validator rule name and engine
- rule documentation / intended semantics
- implementation logic and notable edge cases
- upstream tests or examples
- registration metadata such as severity, selectors, and `disableForTypeSpec*` hints

## Local migration evidence

- local `rule.md`
- violating fixtures
- compliant fixtures
- stored validator diagnostics
- stored TypeSpec diagnostics
- catalog or inventory classification
- validation report evidence

## Prerequisite and blocking evidence

- `#suppress` directives in local TypeSpec repros
- unrelated TypeSpec diagnostics that already forbid the violating construct
- template-generated or framework-enforced behavior that makes a separate lint unnecessary

## Intake conclusion

End by naming the strongest currently supported status:

- covered
- template-enforced
- blocked / suppression-dependent
- partial
- plausible gap
- test-quality issue
