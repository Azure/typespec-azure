# Doc-Updater Pipeline

```mermaid
flowchart LR
    subgraph Config
        YAML["configs/*.yaml
        (auto-discovered)"]
        PROMPT[doc-update.md]
    end

    subgraph "Scheduler (traditional workflow)"
        DISCOVER["Discover configs
        (find configs/*.yaml)"]
        DISPATCH[Dispatch per config]
    end

    subgraph "Agentic Workflow (per config)"
        direction TB
        PRECOMPUTE["steps: precompute.ts
        Extract diffs + feedback + knowledge
        (deterministic, no untrusted text)"]
        AGENT["Agent (copilot, claude-opus-4_6)
        Update docs + build knowledge"]
        VALIDATE["post-steps: validate file scope
        + update-meta.ts"]
    end

    Config --> PRECOMPUTE
    DISCOVER --> DISPATCH
    DISPATCH --> PRECOMPUTE
    PRECOMPUTE -->|"context.json
    (code diffs only)"| AGENT
    PROMPT --> AGENT
    AGENT --> VALIDATE

    KB[(knowledge/<config>.md)]
    PR["safe-output:
    create-pull-request"]

    KB --> PRECOMPUTE
    AGENT --> KB
    VALIDATE --> PR
    PR -->|"human review
    + merge"| PRECOMPUTE
```

## Security Model

- **No untrusted text in agent context**: Review comments and commit messages
  are excluded from `context.json`. Only code diffs are passed to the agent.
- **File scope enforced by post-step**: The agent has full shell and edit
  access, but the `validate file scope` post-step checks that only files
  within `allowedPaths` from the config were modified. Violations fail the run.
- **Write operations via safe outputs**: Pull requests are created only via the
  `create-pull-request` safe output, which sanitizes the output.
- **Network isolation**: The agent runs in a sandboxed container with
  restricted network access.
