# Testserver Generation

## REQUIRED STEPS (ALL MUST BE COMPLETED IN ORDER)

1. **PREPARATION & RESEARCH**

   - First, run `pnpm install && pnpm build` to fully set up the repository (both commands must complete successfully)
   - Study existing test files:
     - Examine the `main.tsp` and `client.tsp` files in the [specs repository][spector-tests]
     - Review the `mockapi.ts` files in the [specs repository][spector-tests]
     - Read descriptions of existing tests and mockapis in the [spec summary][spector-description]

2. **IMPLEMENTATION REQUIREMENTS**

   - Only modify code in:
     - `cspell.yaml` file OR
     - `packages/azure-http-specs/specs` folder
   - For each scenario:
     - Add a `@scenario` and `@scenarioDoc` decorator
     - Make the `@scenarioDoc` explicit about input values and expected output
     - Add a corresponding mockapi implementation in `mockapi.ts`
   - **Scenario naming requirements:**
     - Scenario names are automatically derived from the namespace path + operation name
     - Choose explicit namespaces that describe the feature area (e.g., `Azure.Core.Page`)
     - Use clear, descriptive operation names that explain the specific behavior being tested
     - Avoid vague terms like "test" or generic descriptions like "success" when possible
     - Include key parameters or conditions in the name when relevant (e.g., `listWithCustomPageModel`)
     - Keep names concise while still being descriptive
     - Examples of well-formed full scenario names:
       - `Azure.Core.Page.listWithCustomPageModel` (testing pagination with custom page model)
       - `Azure.ClientGenerator.Core.Access.InternalOperation` (testing internal operation access)
   - Use existing spec files when possible, create new files/folders only when needed
   - Structure namespaces and interfaces carefully - this path becomes the dashboard scenario name
   - Keep route names consistent with scenario themes
   - Choose appropriate operation grouping (single vs. collection)
   - Group operations into interfaces when it makes sense (e.g., by `path`, `query`, etc.)

3. **VALIDATION & QUALITY CHECKS** (MUST PERFORM ALL OF THESE CHECKS IN THIS EXACT ORDER)

   - After implementation, run these commands from `packages/azure-http-specs` in this exact sequence:

     ```bash
     pnpm build              # Verify build and scenarios pass
     pnpm validate-mock-apis # Verify mockapi implementations
     pnpm cspell             # Check spelling
     pnpm format             # Clean up formatting
     pnpm lint               # Fix linting issues
     pnpm regen-docs         # Regenerate docs (NEVER manually edit spec-summary.md)
     ```

   - If ANY command fails:
     1. Fix the reported errors
     2. Re-run ALL validation commands from the beginning in the exact order shown above
     3. Repeat until ALL commands pass successfully
   - For spelling issues:
     - If the word is valid: add to `cspell.yaml`
     - If invalid but needed: use cspell disables
     - If invalid and not needed: change the word

4. **FINALIZATION**
   - Run `pnpm change add` from the root directory
   - Select the touched package as a "new feature"
   - Only add the `lib:azure-http-specs` label to the PR
   - NEVER remove or modify existing scenario docs

## IMPORTANT REMINDERS

- ⚠️ You MUST run `pnpm regen-docs` after any changes
- ⚠️ You MUST verify all scenarios have mockapi implementations
- ⚠️ You MUST run ALL validation commands listed above IN THE EXACT ORDER specified
- ⚠️ You MUST fix any errors before completing the task
- ⚠️ If ANY validation check fails, fix the issues and re-run ALL checks again from the beginning

<!-- References -->

[spector-tests]: https://github.com/Azure/typespec-azure/tree/main/packages/azure-http-specs
[spector-description]: https://github.com/Azure/typespec-azure/blob/main/packages/azure-http-specs/spec-summary.md
