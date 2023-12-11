# Nuget warning NU1605

This article helps you to solve the nuget warning NU1065 which can occur when including the Microsoft.TypeSpec.ProviderHub.Controller package in a solution that targets .Net Core 3.0 or higher.

## Symptoms

```
error NU1605: Detected package downgrade: System.Collections from 4.3.0 to 4.0.11. Reference the package directly from the project to select a different version.
  [typespec project] -> Microsoft.TypeSpec.ProviderHub.Controller 0.1.0 -> Microsoft.AspNetCore.Mvc.Core 2.2.5 -> Microsoft.Extensions.DependencyModel 2.1.0 -> Microsoft.DotNet.PlatformAbstractions 2.1.0 -> System.IO.FileSystem 4.0.1 -> runtime.win.System.IO.FileSystem 4.3.0 -> System.Collections (>= 4.3.0)
  [typespec project] -> Microsoft.TypeSpec.ProviderHub.Controller 0.1.0 -> Microsoft.AspNetCore.Mvc.Core 2.2.5 -> Microsoft.Extensions.DependencyModel 2.1.0 -> Microsoft.DotNet.PlatformAbstractions 2.1.0 -> System.Collections (>= 4.0.11)
```

## Cause

The 'Microsoft.AspNetCore.Mvc.Core' version '2.2.5' required by 'Microsoft.TypeSpec.ProviderHub.Controller' nuget package contains some combinations of packages which shipped with .NET Core 1.0 and 1.1 which are not compatible with each other when they are referenced together in a .NET Core 3.0 or higher project.

## Workaround

Please refer to [nu1605-issue-2](https://learn.microsoft.com/en-us/nuget/reference/errors-and-warnings/nu1605#issue-2) for workaround.
