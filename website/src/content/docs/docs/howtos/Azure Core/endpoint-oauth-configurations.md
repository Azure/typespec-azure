---
title: Pair Endpoints with OAuth Configurations
llmstxt: true
---

Use `Azure.Core.azureServiceConfigurations` to declare named endpoint/OAuth pairs with an explicit default. The decorator calls HTTP `@server` for each endpoint and `@useAuth` once with combined OR requirements, preserving AND groups. Azure Core retains the associations that HTTP's flat server and authentication lists cannot express.

For a complete Logs-style service example, optional client customization, and data-plane SDK generation guidance, see [Endpoint and OAuth Configurations](<../Generate client libraries/14authentication.mdx>).
