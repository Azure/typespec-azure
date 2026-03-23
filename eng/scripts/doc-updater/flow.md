# Doc-Updater Pipeline

```mermaid
flowchart LR
    subgraph Config
        YAML[tcgc.yaml]
        PROMPT[doc-update.md]
    end

    Config --> P0
    Config --> P1

    P0[Feedback Session
    Learn from human corrections]
    P1[Doc Update Session
    Update docs + build knowledge
    Full or incremental]

    P0 --> P1

    KB[(knowledge/tcgc.md)]
    MCP[GitHub MCP]
    PR[Pull Request]

    MCP -.-> P0
    MCP -.-> P1
    P0 --> KB
    KB --> P1
    P1 --> KB
    P1 --> PR
    PR -.->|human edits| P0
```
