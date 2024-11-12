---
title: OneBranch SDL
---

SDL violations for [Nuget Multifeed Config](https://docs.opensource.microsoft.com/tools/cg/how-to/nuget-multifeed-configuration/)

## Symptoms

If you get S360 violations for SDL or your OneBranch builds are breaking

## Cause

The Template project creates Nuget Config files with artifact feeds for azure-sdk-for-net and nuget.org. Having multiple feeds is a security vulnerability and violates the SDL.

## Workaround

Create your own ADO Artifact Feed, and add `https://api.nuget.org/v3/index.json` and `azure-feed://azure-sdk/public/azure-sdk-for-net@Local` as upstream feeds. This enables you to only specify your package feed, and then have your feed pull from the upstream feeds.
