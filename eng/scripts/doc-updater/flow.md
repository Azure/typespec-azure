# Doc-Updater Pipeline

```mermaid
flowchart LR
    subgraph Config
        YAML[tcgc.yaml]
        PROMPT[doc-update.md]
    end

    Config --> P0

    P0[Feedback\nLearn from human corrections]
    P1[Knowledge Build\nAnalyze source → knowledge base]
    P2[Doc Update\nUpdate docs using knowledge]

    P0 --> P1 --> P2

    KB[(knowledge/tcgc.md)]
    MCP[GitHub MCP]
    PR[Pull Request]

    MCP -.-> P0
    MCP -.-> P1
    KB --> P2
    P0 --> KB
    P1 --> KB
    P2 --> PR
    PR -.->|human edits| P0
```
