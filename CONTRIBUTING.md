# Common contributing steps

Most of the steps for working in this repo are the same as those for working
in https://github.com/microsoft/typespec. Refer to
https://github.com/microsoft/typespec/blob/main/CONTRIBUTING.md for most common
day-to-day operations. The rest of this document only covers the things that
are unique to this repo.

# Testing a change in repo azure-rest-api-specs

If you are proposing a change that is likely to impact existing specs, it's
recommended to test a private of the change before merging.

1. Create a fork of https://github.com/azure/azure-rest-api-specs
   (if you don't already have one)
2. Create a branch from `main` you will use to create the test PR
3. Find the URL of the private build of your test package(s)
   1. Browse to your PR in repo `microsoft/typespec` or `azure/typespec-azure`
   2. Select the "Checks" tab, the "Verify PR" pipeline, then click "View more
      details on Azure Pipelines"
   3. Click the link "# published" which shows the artifacts published by the
      build
   4. Expand "packages", find the package you need to test, click the three
      vertical dots on the selected line, then "Copy download URL".
4. In your branch of `azure-rest-api-specs`, edit the root `package.json`, and
   replace the version with the URL to your private build, for example:

   ```diff
   - "@azure-tools/typespec-autorest": "0.36.0",
   + "@azure-tools/typespec-autorest": "https://.../package.tgz"
   ```

5. Also edit `eng/pipelines/templates/steps/npm-install.yml`, to force install
   your private build:

   ```diff
   - - script: npm ci
   + - script: npm i --no-package-lock --force
   ```

6. Create a draft PR from your fork branch.
7. In a few minutes, view the results of check "TypeSpec Validation - All".
   - If the check is green, it means your change did not impact any specs currently
     in `azure-rest-api-specs/main`.
   - If the check is red, click through to the DevOps log to see why each spec failed
     (e.g. violation of new linter rule, change to generated autorest), and determine
     the course of action.

Example: https://github.com/Azure/azure-rest-api-specs/pull/26684

# Working with the core submodule

This repository uses a git
[submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules) for the
[TypeSpec OSS core](https://github.com/microsoft/typespec).

This section covers some basic everyday tasks for working with it. The steps
below are are really just one possible workflow. There's more than one way
to accomplish these tasks and if you prefer to do it differently, that's
fine too!

## Configuring git to recurse submodules automatically for most commands

Run the following command:

```
git config --global submodule.recurse true
```

This will effectively pass `--recurse-submodules` for you to git commands
that accept it. It should eliminate some of the common pain points around
submodules.

NOTE: git clone is exceptional, see below.

## Cloning recursively

`git clone` does not recurse submodules automatically, even with
submodule.recurse=true as configured above.

Fork the repo, then clone recursively as follows:

```
git clone --recurse-submodules https://github.com/(your_username)/typespec-azure
```

## Updating and initializing the submodule

In some situations, even with the above setting, you may still end up with the core/ folder
being uninitialized and not having a good clone of microsoft/typespec, or with the core/ folder
initialized, but checked out to the wrong commit for the current branch. To fix this, run the
following command to update and initialize the submodule:

```
git submodule update --init
```

## Point the submodule origin remote to your fork

You can change the remotes of the submodule so that `origin` is your fork of
microsoft/typespec rather than microsoft/typespec itself, and microsoft/typespec is
`upstream`:

```
cd [repo_root]
cd core
git remote remove origin
git remote add origin https://github.com/(your_username)/typespec
git remote add upstream https://github.com/microsoft/typespec
```

## Forcing dependabot to send a submodule update PR

Normally, the submodule is updated automatically once per day (except on
weekends) by automated PRs from dependabot. If you would like dependabot to
perform an update right away, you can:

- Go here: https://github.com/Azure/typespec-azure/network/updates
- Click on "Last updated X hours ago" link
- Click on "Check for updates button"

## Making a cross-cutting change across both repos

1. Make matching branches:

```
cd core
git checkout -b featurebranch

cd ..
git checkout -b featurebranch
```

2. Make your changes as needed to both repos.

3. Commit changes to both repos:

```
cd core
git commit -a -m "Core part of my change"

cd ..
git commit -a -m "Azure-specific part of my change"
```

4. Push

```
git push origin featurebranch
```

NOTE: If you configured submodule.recurse=true as shown above, this will
automatically push the submodule typespec branch along with the typespec-azure
branch. If you prefer not to use that, then `cd core` and push that too.

5. Create 2 PRs from the two branches that were pushed to your
   microsoft/typespec and Azure/typespec-azure forks. Start with the microsoft/typespec
   PR, then follow up with the Azure/typespec-azure PR that depends on it.

6. Get approval for both PRs before merging either of them.

7. Merge the microsoft/typespec PR first.

8. Update the submodule to point to the actual commit you merged to microsoft/typespec main:

```
cd core
git fetch --all
git checkout upstream/main

cd ..
git commit -a -m "Update submodule"
git push origin featurebranch
```

9. Merge the typespec-azure PR and you're done.

Note that you only need to do all of the above when your changes span both
repos. If you are only changing one repo or the other, then just work in
each individual repo as you would any other.

## E2E tests

### Run tests same as the ci:

```bash
pnpm e2e-tests

```

### Test with local cadl-ranch repo

```bash
pnpm e2e-tests --local-cadl-ranch=<path> # where path is the absolute path to your local cadl-ranch repo.
# Example
pnpm e2e-tests --local-cadl-ranch=/Users/some/dev/cadl-ranch
```

## Publishing

### Prerequisites

1. Install the GitHub CLI and configure your account. Some of the tools use your GitHub account.
2. Check that validation of the `typespec-next` branch is green in [pipelines](https://dev.azure.com/azure-sdk/public/_build?definitionId=6143&_a=summary).
   1. **Note**: Anytime a new PR is merged during the release process, make sure this validation is green.
3. Verify that the CodeGen nightly [builds](https://dev.azure.com/azure-sdk/public/_dashboards/dashboard/ef641981-29b5-4a67-9e8f-1e4ae2fe4894) are green.
   1. **Note**: Check with codegen owners if a build is red due to a change unrelated to the TypeSpec release.

### Steps

Do the following to publish a new release:

1. Announce to coworkers on Teams in TypeSpec Engineering channel that you will
   be publishing and that they should hold off on merging until the process
   is complete.

2. Make sure your working copy is clean and you are up-to-date and on the
   main branch (both typespec-azure and core should point to main).

3. Generate release notes for TypeSpec once the full list of changes are in.

   1. In your fork of the core (typespec) repo, run `npx chronus changelog --policy typespec > out.md`.
   1. Create a new entry in `docs/release-notes` for this release and paste the contents of `out.md` into the new file. Reorganize the file to have the following sections in order: _Breaking Changes_, _Deprecations_, _Features_, and _Bug Fixes_. Skip the section if there are no entries in it. Also add a blurb above these sections for any especially notable updates.
      Example PR: https://github.com/microsoft/typespec/pull/4102

4. Generate release notes for TypeSpec Azure once the full list of changes are in.

   1. In your fork of the typespec-azure repo, run `npx chronus changelog --policy typespec-azure > out.md`.
   1. Create a new entry in `docs/release-notes` for this release and paste the contents of `out.md` into the new file. Reorganize the file to have the following sections in order: _Breaking Changes_, _Deprecations_, _Features_, and _Bug Fixes_. Skip the section if there are no entries in it. Also add a blurb above these sections for any especially notable updates.
      Example PR: https://github.com/Azure/typespec-azure/pull/1306

5. Once all PRs are merged, update TypeSpec-Azure core submodule (things will run more smoothly if TypeSpec-Azure core points to HEAD of TypeSpec).

   1. Can [trigger](https://github.com/Azure/typespec-azure/network/updates/18647270/jobs) dependabot via `Insights > Dependency graph > Dependabot`.

6. Double-check that typespec-azure and core submodules are both up to date with `upstream/main`.

7. Regenerate documentation via `pnpm regen-docs` in TypeSpec-Azure.

8. Run `pnpm prepare-publish` in TypeSpec-Azure repo to stage the publishing changes.

   - This creates `publish/xxxxxx` branches for TypeSpec-Azure and TypeSpec repos.
   - If it works you'll get a message like this: `Success! Push publish/kvd01q9v branches and send PRs.`

   - Double-check that updated version numbers are correct. Running the tool multiple times will increment the version number multiple times as well.

9. Push and merge TypeSpec (core) PR.

10. Update core submodule to use `main` in TypeSpec-Azure `publish/` branch and push/merge PR.

11. Make sure release pipeline completed and packages are on NPM.

### Followups

1. Upgrade https://github.com/Azure/azure-rest-api-specs to use new versions of TypeSpec.
   1. Example PR: https://github.com/Azure/azure-rest-api-specs/pull/30122
1. Upgrade https://github.com/Azure/cadl-ranch to use new versions of TypeSpec.
   1. Example PR: https://github.com/Azure/cadl-ranch/pull/668
1. Send an email to the `TypeSpec Partners` group announcing the release.

**NOTE**: The reason for step 1 to ask for folks to avoid merging while
publishing is in progress is that any changes merged to the repo while the
publish PR would become part of the release, but the release changelogs
would not include their descriptions. For this reason, publish PRs will fail
if this happens and you will have to close them and start over. In the case
where you are in another time zone and unable to coordinate with the rest of
the team, it may be easier to ask on Teams for someone in a closer time zone
to coordinate and perform the publish in the morning.

## Make a patch release

`main` branch always points the latest changes. This means in the case an important bug fix needs to make an earlier release this flow must be followed:

Depending on the package where the fix needs to go do this on the `Microsoft/typespec` repo or this repo `Azure/typespec-azure`

### 1. Make your fix

1. (only have not done for this sprint yet) Find the commit from the last release and make a new branch called `release/<sprint-name>` at that commit. For example `release/october-2022`. Push the branch to `upstream`.
1. Make a new branch with your fix like any other bug fix or new feature
1. Run `pnpm change add` or use the link in the PR comment to make the comment
1. Make a new PR from that branch targeting the `release/xyz` branch
1. Wait for CI & approval, then squash merge

### 2. Release the hot fix

1. Make a new branch in this format `publish/hotfix/<hotfix-name>` against the `release/xyz` branch
1. Run `pnpm chronus version --ignore-policies` to bump the versions, commit push, make PR, wait for CI and squash merge.
1. The package should then get published

### 3. Backmerge

1. A workflow should run automatically and create a branch named `backmerge/release/xyz-YYYY-MM-DD`.
1. Find the backmerge branch [here](https://github.com/Azure/typespec-azure/branches) and click "New pull request".
1. Rebase merge the new backmerge PR into main.

## Labels

TypeSpec repo use labels to help categorize and manage issues and PRs. The following is a list of labels and their descriptions.

<!-- LABEL GENERATED REF START -->
<!-- DO NOT EDIT: This section is automatically generated by eng/common/scripts/sync-labels.ts, update eng/common/config/labels.ts run pnpm sync-labels to update -->

### Labels reference

#### area

Area of the codebase

| Name                         | Color   | Description                                                    |
| ---------------------------- | ------- | -------------------------------------------------------------- |
| `lib:tcgc`                   | #957300 | Issues for @azure-tools/typespec-client-generator-core library |
| `lib:azure-core`             | #957300 | Issues for @azure-tools/typespec-azure-core library            |
| `lib:azure-resource-manager` | #957300 | Issues for @azure-tools/typespec-azure-core library            |
| `emitter:autorest`           | #957300 | Issues for @azure-tools/typespec-autorest emitter              |
| `eng`                        | #65bfff |                                                                |
| `ide`                        | #846da1 | Issues for Azure specific ide features                         |

#### issue_kinds

Issue kinds

| Name      | Color   | Description                                |
| --------- | ------- | ------------------------------------------ |
| `bug`     | #d93f0b | Something isn't working                    |
| `feature` | #cccccc | New feature or request                     |
| `docs`    | #cccccc | Improvements or additions to documentation |
| `epic`    | #cccccc |                                            |

#### breaking-change

Labels around annotating issues and PR if they contain breaking change or deprecation

| Name              | Color   | Description                                                                        |
| ----------------- | ------- | ---------------------------------------------------------------------------------- |
| `breaking-change` | #B60205 | A change that might cause specs or code to break                                   |
| `deprecation`     | #760205 | A previously supported feature will now report a warning and eventually be removed |

#### design-issues

Design issue management

| Name              | Color   | Description                                            |
| ----------------- | ------- | ------------------------------------------------------ |
| `design:accepted` | #1a4421 | Proposal for design has been discussed and accepted.   |
| `design:needed`   | #96c499 | A design request has been raised that needs a proposal |
| `design:proposed` | #56815a | Proposal has been added and ready for discussion       |

#### process

Process labels

| Name           | Color   | Description                                                                       |
| -------------- | ------- | --------------------------------------------------------------------------------- |
| `needs-area`   | #ffffff |                                                                                   |
| `needs-info`   | #ffffff | Mark an issue that needs reply from the author or it will be closed automatically |
| `triaged:core` | #5319e7 |                                                                                   |

#### misc

Misc labels

| Name               | Color   | Description        |
| ------------------ | ------- | ------------------ |
| `good first issue` | #7057ff | Good for newcomers |

#### external

External tools

| Name                         | Color   | Description                                  |
| ---------------------------- | ------- | -------------------------------------------- |
| `external:swagger-converter` | #7057ff | Issues related to the swagger-converter tool |
| `external:mgmt`              | #7057ff |                                              |

<!-- LABEL GENERATED REF END -->
