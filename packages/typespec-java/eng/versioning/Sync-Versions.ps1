# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'

function Read-PomVersions([string[]] $Contents)
{
    $versions = @{}
    foreach ($content in $Contents)
    {
        $pom = [xml] $content
        foreach ($node in $pom.SelectNodes("//*[local-name()='dependency' or local-name()='plugin']"))
        {
            $group = $node.SelectSingleNode("*[local-name()='groupId']")
            $artifact = $node.SelectSingleNode("*[local-name()='artifactId']")
            $version = $node.SelectSingleNode("*[local-name()='version']")
            if (!$group -or !$artifact -or !$version) { continue }
            $value = $version.InnerText.Trim()
            if ($value.StartsWith('${')) { continue }
            $package = "$($group.InnerText.Trim()):$($artifact.InnerText.Trim())"
            if ($versions.ContainsKey($package) -and $versions[$package] -cne $value)
            {
                throw "Conflicting upstream versions for $package"
            }
            $versions[$package] = $value
        }
    }
    return $versions
}

function Update-TestPom
{
    [CmdletBinding(SupportsShouldProcess)]
    param([string] $Path, [hashtable] $Versions)

    $content = [System.IO.File]::ReadAllText($Path)
    $null = [xml] $content
    $gap = '(?:\s|<!--.*?-->)*'
    $pattern = "<!--.*?-->|(?<prefix><groupId>(?<group>[^<]+)</groupId>$gap<artifactId>(?<artifact>[^<]+)</artifactId>$gap<version>)(?<version>[^<]+)(?<suffix></version>)"
    $updated = [regex]::Replace($content, $pattern, [System.Text.RegularExpressions.MatchEvaluator] {
        param($match)
        if (!$match.Groups['prefix'].Success) { return $match.Value }
        $package = "$($match.Groups['group'].Value.Trim()):$($match.Groups['artifact'].Value.Trim())"
        if (!$Versions.ContainsKey($package)) { return $match.Value }
        return $match.Groups['prefix'].Value + $Versions[$package] + $match.Groups['suffix'].Value
    }, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($updated -cne $content -and $PSCmdlet.ShouldProcess($Path, 'Sync dependency versions from pinned core'))
    {
        [System.IO.File]::WriteAllText($Path, $updated)
        Write-Host "Updated $Path"
    }
}

if ($MyInvocation.InvocationName -ne '.')
{
    $packageRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
    $coreRoot = Join-Path $packageRoot '..\..\core'
    $sha = (Get-Content -LiteralPath (Join-Path $packageRoot 'core-commit.json') -Raw | ConvertFrom-Json).sha
    if ($sha -notmatch '^[0-9a-f]{40}$') { throw 'core-commit.json must contain a full commit SHA.' }
    $contents = foreach ($path in @('generator/pom.xml', 'generator/http-client-generator-test/pom.xml'))
    {
        $content = git -C $coreRoot show "${sha}:packages/http-client-java/$path"
        if ($LASTEXITCODE -ne 0)
        {
            throw "Cannot read $path at core commit $sha. Fetch that commit in core and retry."
        }
        $content -join "`n"
    }
    $versions = Read-PomVersions $contents
    Update-TestPom -Path (Join-Path $packageRoot 'emitter-tests\pom.xml') -Versions $versions -WhatIf:$WhatIfPreference
}
