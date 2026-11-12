---
title: Pair Endpoints with OAuth Configurations
llmstxt: true
---

Use `Azure.Core.azureServiceConfigurations` to declare named endpoint/OAuth pairs. Every catalog must include `public`, which is always the default. The decorator uses HTTP `@server` and `@useAuth` to validate each configuration and exposes the combined OR requirements, preserving AND groups. Azure Core retains the associations that HTTP's flat server and authentication lists cannot express.

For a complete Logs-style service example and data-plane SDK generation guidance, see [Endpoint and OAuth Configurations](<../Generate client libraries/14authentication.mdx>).
