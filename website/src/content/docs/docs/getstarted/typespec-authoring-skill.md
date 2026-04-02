---
title: TypeSpec Authoring Skill for Azure
---

## TypeSpec Authoring Skill for Azure

Azure TypeSpec Author helps you write and update Azure API specifications using TypeSpec with confidence. It guides you through common authoring tasks, such as creating new services, adding API versions, and evolving existing specs, while ensuring your changes follow Azure standards, repository conventions, and validation rules, so your APIs are ready for review and SDK generation.

## Set up environment

### Copilot CLI Mode
1. Install the GitHub Copilot CLI by following the [official installation guide](https://docs.github.com/en/copilot/how-tos/copilot-cli).
2. Launch copilot CLI session from the root folder of https://github.com/Azure/azure-rest-api-specs in VSCode terminal.
3. In the Copilot CLI session, input prompts.

### VSCode Agend Mode
1. Launch VSCode from the root folder of https://github.com/Azure/azure-rest-api-specs.
2. Input prompts in the agent panel.

## Sample prompts

### API Versioning 

- "In specification/widget/resource-manager/Microsoft.Widget, Add a new preview API version 2026-01-01-preview"
- "In specification/widget/resource-manager/Microsoft.Widget, Add a new stable API version 2026-01-01"
- "In specification/widget/resource-manager/Microsoft.Widget, Change visibility of provisioningState to Read+Create in 2025-05-04-preview only"
- "In specification/widget/resource-manager/Microsoft.Widget, Change property age from required to optional in 2025-05-04-preview only"
- "In specification/widget/resource-manager/Microsoft.Widget, change visibility of provisioningState to Read+Create in 2025-05-04-preview only"

### Resource Definitions

- "In specification/widget/resource-manager/Microsoft.Widget, Add an ARM resource named Asset with CRUD operations"
- "In specification/widget/resource-manager/Microsoft.Widget, Add a child resource named Component under the Asset resource"
- "In specification/widget/resource-manager/Microsoft.Widget, Add a proxy resource named Config under the Asset resource"
- "In specification/widget/resource-manager/Microsoft.Widget, change resource Employee as extension resource"

### Resource Operations

- "In specification/widget/resource-manager/Microsoft.Widget, Add a custom action restartAsset to the Asset resource"
- "In specification/widget/resource-manager/Microsoft.Widget, Add an async/LRO operation to export data from the Asset resource"
- "In specification/widget/resource-manager/Microsoft.Widget, Add a PATCH operation to the Asset resource"
- "In specification/widget/resource-manager/Microsoft.Widget, Modify the LRO createOrUpdate PUT operation in interface employees so that it returns Azure-AsyncOperation header but NOT Retry-After header in the 201 response."
- "In specification/widget/resource-manager/Microsoft.Widget, Add 'top' and 'skip' query parameters to the ListBySubscription operation in interface employees"

### Models & Types

- "In specification/widget/resource-manager/Microsoft.Widget, Add an enum named AssetStatus with values Active, Inactive, and Deprecated"
- "In specification/widget/resource-manager/Microsoft.Widget, Add a new property tags to the Asset resource"

