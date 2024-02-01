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

Do the following to publish a new release:

1. Announce to coworkers on Teams in TypeSpec Engineering channel that you will
   be publishing and that they should hold off on merging until the process
   is complete.

2. Make sure your working copy is clean and you are up-to-date and on the
   main branch.

3. Run `pnpm prepare-publish` to stage the publishing changes.

If it works you'll get a message like this:

```
Success! Push publish/kvd01q9v branches and send PRs.
```

4. Follow steps 4-9 in [making a cross-cutting change across both
   repos](#making-a-cross-cutting-change-across-both-repos) to send PRs from
   the generated `publish/<unique_id>` branches and merge them.

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

1. (only have not done for this sprint yet) Find the commit from the last release and make a new branch called `release/<sprint-name>` at that commit. For example `release/october-2022`. Push the branch to `upstream`.
2. Make a new branch with your fix like any other bug fix or new feature
3. Run `rush change` to describe your change
4. Make a new PR from that branch targeting the `release/xyz` branch
5. Wait for CI & approval, then squash merge
6. Make a new branch in this format `publish/hotfix/<hotfix-name>`
7. Run `rush publish --apply` to bump the versions, commit push, make PR, wait for CI and squash merge.
8. The package should then get published
9. A workflow should run automatically and create a branch named `backmerge/release/xyz-YYYY-MM-DD`.
10. Find the backmerge branch [here](https://github.com/Azure/typespec-azure/branches) and click "New pull request".
11. Rebase merge the new backmerge PR into main.
