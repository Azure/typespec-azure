# Copilot Instructions

## Testserver Generation

- DO read the existing `main.tsp` and `client.tsp` files in the specs repo [here][spector-tests].
- DO read the existing `mockapi.ts` mockapi files in the specs repo [here][spector-tests]. Follow the imports and overall structure from these test files to write your own mockapi tests
- DO read descriptions of the input and output of existing tests and mockapis [here][spector-description].
- DO only modify code in the `typespec-azure-pr/cspell.yaml` file OR `typespec-azure-pr/packages/azure-http-specs/specs` folder
- DO add a `@scenario` and `@scenarioDoc` for every scenario you are adding. Keep in mind that the `@scenarioDoc` needs to clearly tell users what input and output to expect.
- DO add a mockapi implementation of each scenario in the `mockapi.ts` file.
- DO ensure that every scenario has a mockapi implementation,
- DO see if there are existing spec files that you can add the specification to. If not, DO create new files and folders for the new scenario
- DO know that the path of namespace and interfaces until you reach your `@scenario`-decorated operation is the full scenario name that appears in the dashboard. Make sure that the dashboard scenario name cleanly describes the exact situation that is being tested, is clear to read, and has as few words as it can
- DO keep the route names consistent with the scenario names
- DO decide whether a scenario is better as a collection of operation calls, or a single operation call. If it is better as a collection of calls, try to group the operation calls into an interface and decorate the interface with `@scenario` and `@scenarioDoc`.
- DO group operations into interfaces if it makes sense for current layout or future expansion. For example, in parameters tests, try to group them by `path`, `query` etc in interfaces, even if each operation is still its own scenario.
- DO run `pnpm build` from `typespec/azure-pr/packages/azure-http-specs` to verify it builds and scenarios pass. If this step fails, DO attempt to fix the error.
- DO run `pnpm regen-docs` from `typespec/azure-pr/packages/azure-http-specs` to automatically regenerate the docs. DON'T manually write in `spec-summary.md`
- DO run `pnpm validate-mock-apis` from `typespec/azure-pr/packages/azure-http-specs` to verify there is correct mockapi implementation for each scenario. If this step fails, DO attempt to fix the error.
- DO run `pnpm cspell` to find any spelling issues. If there are spelling issues and you believe the word is valid, please add it to `cspell.yaml`. If the word is invalid but you need to use it, use cspell disables to ignore that line. If the word is invalid and you don't need to use it, change the word.
- DO run `pnpm format` to clean up any formatting issues.
- DO run `pnpm lint` to find any linting issues. DO fix these linting issues to the best of your ability without impacting the quality of the tests.
- DON'T remove or modify existing scenario docs

<!-- References -->

[spector-tests]: https://github.com/Azure/typespec-azure-pr/tree/main/packages/azure-http-specs
[spector-description]: https://github.com/Azure/typespec-azure-pr/blob/main/packages/azure-http-specs/spec-summary.md
