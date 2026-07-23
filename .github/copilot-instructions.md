# Copilot Instructions

This document serves as an index to task-specific instructions for GitHub Copilot. Each task has its own detailed instructions file in the `.github/prompts` directory.

## Install and Build

- Packages are located in the `packages` folder
- Use `pnpm` as the package manager
- Use `pnpm install` to install dependencies
- Use `pnpm build` to build every package
- Use `pnpm -r --filter "<pkgName>..." build` to build to a specific package `<pkgName>`
- Use `pnpm format` to format all files

## Commit Rules

- Always run `pnpm format && pnpm lint` before committing.
- Always describe changes (see "Describing changes" section below).
- Do not commit the file `core` or `pnpm-lock.yaml` unless your change specifically requires updating them (e.g., the nightly bot updates the `core` submodule dependency). If these appear in your staged changes unintentionally, unstage them before committing.

## Describing changes

- Repo use `@chronus/chronus` for changelogs
- Use `pnpm change add` to add a change description for the touched packages
- Types of changes are described in `.chronus/config.yaml`

## Branch and PR Workflow

- When creating worktrees or branches for new work, base them off the main Azure fork's `main` branch (Azure/typespec-azure). Depending on the user's local git remote setup, this may be called `upstream` or `origin`.
- When creating worktrees (which clone the repo), always clone recursively with `--recurse-submodules` and run `git submodule update --init` if the `core/` submodule is missing or not at the correct commit. See [CONTRIBUTING.md - Cloning recursively](https://github.com/Azure/typespec-azure/blob/main/CONTRIBUTING.md#cloning-recursively) for details.
- When pushing changes and creating pull requests, push to your personal fork and open PRs against the main Azure fork's `main` branch.

## Available Task Instructions

- [Testserver Generation](./prompts/testserver-generation.md): Instructions for generating TypeSpec HTTP spec test servers
