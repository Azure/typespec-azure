---
title: Using Build Pipelines with TypeSpec
---

This doc will help you get started with using TypeSpec in your build pipelines in your own repository. [See here for more how to use in the azure-rest-api-specs repo](./checking-in-api-specs-guide.md)

## Table of Contents

1. [Introduction](#introduction)
1. [Azure DevOps Pipelines](#azure-devops-pipelines)

## Introduction

### Dependencies

In order to build TypeSpec in your build pipeline, you will need to ensure that the following are available or are automatically installed by your project:

1. NodeJS 18.x LTS (Recommended)
2. TypeSpec compilation tools (via npm package)

## Azure DevOps Pipelines

Depending on your project, you may need to add NodeJS and install NPM packages for TypeSpec.
The following Azure Devops Pipeline tasks can be modified and added to your pipeline yaml file if you do not already utilize NodeJS in your project.

```yaml
# Install NodeJS
- task: NodeTool@0
  inputs:
    versionSpec: "18.x" # Node 18 LTS is recommended.
    checkLatest: false

# Install dependencies
- script: npm install
  workingDir: path/to/typespec/project # This is where package.json lives for your TypeSpec project

# Build
- script: npx tsp compile .
  workingDir: path/to/typespec/project # This is where package.json lives for your TypeSpec project
```

This is sufficient if you are building via a csproj file which triggers the tsp compile and finds the tsp compiler itself.

You may also need to add additional steps to compile your typespec files separately. An example of a basic pipeline is provided below.

### Example Pipeline Configuration

Note: This example assumes that your TypeSpec folder is at the root of your repository.

```yaml
trigger:
  - main
pool:
  vmImage: ubuntu-latest
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "18.17.0"
  - script: npm install
  - script: npx tsp compile .
  - task: PublishPipelineArtifact@1
    displayName: Publish TypeSpec Output Folder
    inputs:
      targetPath: "tsp-output"
      artifact: "tsp-output"
      publishLocation: "pipeline"
```
