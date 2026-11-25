# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Sync-Versions.ps1')

function Assert-Equal($Expected, $Actual)
{
    if ($Expected -cne $Actual) { throw "Expected '$Expected', got '$Actual'." }
}

$upstream = @'
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <parent><groupId>local</groupId><artifactId>parent</artifactId><version>new</version></parent>
  <dependencies>
    <dependency><groupId>com.azure</groupId><artifactId>azure-core</artifactId><version>1.60.0</version></dependency>
    <dependency><groupId>org.mockito</groupId><artifactId>mockito-core</artifactId><version>4.11.0</version></dependency>
    <dependency><groupId>local</groupId><artifactId>property</artifactId><version>${property.version}</version></dependency>
  </dependencies>
  <build><plugins>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-javadoc-plugin</artifactId><version>3.12.0</version></plugin>
  </plugins></build>
</project>
'@
$versions = Read-PomVersions @($upstream)
Assert-Equal '1.60.0' $versions['com.azure:azure-core']
Assert-Equal '3.12.0' $versions['org.apache.maven.plugins:maven-javadoc-plugin']
Assert-Equal $false $versions.ContainsKey('local:parent')
Assert-Equal $false $versions.ContainsKey('local:property')
$failed = $false
try
{
    Read-PomVersions @($upstream, $upstream.Replace('1.60.0', '1.59.0'))
}
catch
{
    if ($_.Exception.Message -notlike '*Conflicting upstream versions*') { throw }
    $failed = $true
}
Assert-Equal $true $failed

$path = Join-Path ([System.IO.Path]::GetTempPath()) "java-test-pom-$([guid]::NewGuid()).xml"
try
{
    $pom = @'
<project>
  <!-- <groupId>com.azure</groupId><artifactId>azure-core</artifactId><version>comment</version> -->
  <parent><groupId>local</groupId><artifactId>parent</artifactId><version>old</version></parent>
  <dependencies>
    <dependency>
      <groupId>com.azure</groupId>
      <!-- Preserve this comment. -->
      <artifactId>azure-core</artifactId>
      <version>old</version>
      <exclusions><exclusion><groupId>excluded</groupId><artifactId>library</artifactId></exclusion></exclusions>
    </dependency>
    <dependency><groupId>org.mockito</groupId><artifactId>mockito-core</artifactId><version>4.11.0</version></dependency>
    <dependency><groupId>com.azure.tools</groupId><artifactId>azure-autorest-customization</artifactId><version>old</version></dependency>
  </dependencies>
  <build><plugins>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-javadoc-plugin</artifactId><version>old</version></plugin>
  </plugins></build>
</project>
'@
    $pom = $pom.Replace("`r`n", "`n").Replace("`n", "`r`n")
    [System.IO.File]::WriteAllText($path, $pom)
    Update-TestPom -Path $path -Versions $versions -WhatIf
    Assert-Equal $pom ([System.IO.File]::ReadAllText($path))
    Update-TestPom -Path $path -Versions $versions
    $expected = $pom.Replace('      <version>old</version>', '      <version>1.60.0</version>')
    $expected = $expected.Replace('<artifactId>maven-javadoc-plugin</artifactId><version>old</version>',
        '<artifactId>maven-javadoc-plugin</artifactId><version>3.12.0</version>')
    Assert-Equal $expected ([System.IO.File]::ReadAllText($path))
    $modified = (Get-Item -LiteralPath $path).LastWriteTimeUtc
    Update-TestPom -Path $path -Versions $versions
    Assert-Equal $modified (Get-Item -LiteralPath $path).LastWriteTimeUtc
    [System.IO.File]::WriteAllText($path, '<project>')
    $failed = $false
    try { Update-TestPom -Path $path -Versions $versions }
    catch { $failed = $true }
    Assert-Equal $true $failed
    Assert-Equal '<project>' ([System.IO.File]::ReadAllText($path))
    Write-Host 'Version sync tests passed.'
}
finally
{
    Remove-Item -LiteralPath $path -Force
}
