<#
.SYNOPSIS
This script analyzes a Git repository to find all commits that add a new 'tspconfig.yaml' file within a specified date range.

.DESCRIPTION
The script takes a start date, an end date, and an optional array of branch names as parameters. It then iterates over each branch and each month in the date range. For each month, it uses the `git log` command to find all commits that added a new 'tspconfig.yaml' file on the specified branches. Afer eliminating duplicate commits between branches, the script counts the number of such commits for each month and outputs the counts in a table format. It also distinguishes between data plane and management plane commits based on the existence of 'resource-manager' or 'Management' in the file paths in the commit. Furthermore, it distinguishes between greenfield (new services) and brownfield (existing services) based on the existence of a 'stable' folder in the service path.

.PARAMETER startDate
The start date for the analysis. Must be a string in the format 'yyyy-MM-dd'.

.PARAMETER endDate
The end date for the analysis. Must be a string in the format 'yyyy-MM-dd'.

.PARAMETER branchName
The names of the Git branches to analyze. Optional, defaults to 'main'. The script is typically run against 'main' and 'RPSaaSMaster' branches.

.PARAMETER DebugMode
A flag that enables debug mode, which outputs additional information for each commit. Optional, defaults to false.

.EXAMPLE
.\service-adoption.ps1 -startDate '2023-08-01' -endDate '2024-03-29' -branchName 'main', 'RPSaaSMaster'
This example runs the script with a start date of August 1, 2023, an end date of March 29, 2024, and analyzes the 'main' and 'RPSaaSMaster' branches.
#>

# Define script parameters
param (
    # Start and end dates for the analysis (mandatory)
    [Parameter(Mandatory=$true)]
    [string]$startDate,
    [Parameter(Mandatory=$true)]
    [string]$endDate,

    # Names of the Git branches to analyze (optional, defaults to 'main')
    [Parameter(Mandatory=$false)]
    [string[]]$branchName = 'main',

    # Debug mode flag (optional, defaults to false)
    [Parameter(Mandatory=$false)]
    [bool]$DebugMode = $false
)

# Convert the date strings to DateTime objects
$start = Get-Date $startDate
$end = Get-Date $endDate

# Define the relative path to the Git repository
$repoPath = Join-Path -Path $PSScriptRoot -ChildPath "azure-rest-api-specs-pr"

# Initialize an empty array to hold all commits
$allCommits = @()

# Initialize an empty hashtable to hold the output objects
$output = @{}

# Initialize an empty hashtable to hold the processed file paths
$processedPaths = @{}

# Loop over each month in the date range
for ($date = $start; $date -le $end; $date = $date.AddMonths(1)) {

    # Loop over each branch
    foreach ($branch in $branchName) {
        # Loop over each month in the date range
        for ($date = $start; $date -le $end; $date = $date.AddMonths(1)) {
            # Initialize counters for data plane and management plane commits
            $dataPlaneCommits = 0
            $managementPlaneCommits = 0
            $greenfieldCommits = 0
            $brownfieldCommits = 0

            # Initialize an empty array to hold the commits for this month
            $monthlyCommits = @()

            # Define the date range for this month
            $since = $date.ToString("yyyy-MM-dd")
            $until = $date.AddMonths(1).ToString("yyyy-MM-dd")

            # Change to the Git repository directory
            Set-Location -Path $repoPath

            # Get the name of the current branch
            $currentBranch = git rev-parse --abbrev-ref HEAD

            # Check if the current branch matches $branch
            if ($currentBranch -ne $branch) {
                # If not, switch to $branch
                git checkout $branch
            }

            # Find commits that add new 'tspconfig.yaml' files during this month on the specified branch
            $commitHashesAndDates = git log $branch --since=$since --until=$until --pretty=format:"%H %ad" --diff-filter=A -- '*tspconfig.yaml'

            # Process each commit separately
            foreach ($commitHashAndDate in $commitHashesAndDates -split "`n") {
                # Split the commit hash and date
                $commitHash, $commitDate = $commitHashAndDate -split " ", 2

                # Get the file paths for this commit
                $filePaths = git show --pretty="" --name-only $commitHash

                # Check if the commit includes changes to 'tspconfig.yaml'
                if ($filePaths -match "tspconfig.yaml") {
                    $tspconfigPaths = $filePaths | Where-Object { $_ -match "tspconfig.yaml" }

                    # Skip duplicate file paths
                    if ($processedPaths.ContainsKey($tspconfigPaths)) {
                        continue
                    }

                    # Add the file path to the hashtable
                    $processedPaths[$tspconfigPaths] = $true

                    # Get the service name from the file path
                    $service = ($tspconfigPaths -split '/')[1]

                    # Print the value of $tspconfigPaths
                    if ($DebugMode) {
                        Write-Output "Paths: $tspconfigPaths"
                        Write-Output "Checking status for service $service..."
                    }
                    $stable = Get-ChildItem -Path "$repoPath/specification/$service" -Recurse -Directory | Where-Object { $_.Name -like "stable" }
                    # Check if the service has a 'stable' folder. If not, it's greenfield
                    if ($null -eq $stable) {
                        # Write-Output "Greenfield service commit"
                        $greenfieldCommits++
                    } else {
                        # Write-Output "Brownfield service commit"
                        $brownfieldCommits++
                    }
                    # Check if the file path matches the data plane or management plane criteria
                    if ($filePaths -notmatch 'resource-manager' -and $filePaths -notmatch '\.Management')
                    {
                        # This is a data plane commit
                        $dataPlaneCommits++
                    } else {
                        # This is a management plane commit
                        $managementPlaneCommits++
                    }

                    # Add the commit to the array of all commits and the array of monthly commits
                    $allCommits += $commitHash
                    $monthlyCommits += $commitHash
                }
            }

            # Count the unique commits
            $discreteCount = $monthlyCommits | Sort-Object -Unique | Measure-Object | % { $_.Count }

            # Update the hashtable
            $monthKey = $date.ToString("yyyy-MM")

            if ($output.ContainsKey($monthKey)) {
                # Update the existing object
                $output[$monthKey].Discrete += $discreteCount
                # cumulativeCount is updated separately further down below
                $output[$monthKey].Data += $dataPlaneCommits
                $output[$monthKey].Mgmt += $managementPlaneCommits
                $output[$monthKey].Greenfield += $greenfieldCommits
                $output[$monthKey].Brownfield += $brownfieldCommits
            } else {
                # Create a new object and add it to the hashtable
                $output[$monthKey] = New-Object PSObject -Property @{
                    Month = $monthKey
                    Discrete = $discreteCount
                    Cumulative = 0
                    Data = $dataPlaneCommits
                    Mgmt = $managementPlaneCommits
                    Greenfield = $greenfieldCommits
                    Brownfield = $brownfieldCommits
                }
            }
        }
    }
}

# Change back to the script directory
Set-Location -Path $PSScriptRoot

# Calculate the cumulative counts
$cumulativeCount = 0
$output.Values | Sort-Object Month | ForEach-Object {
    $cumulativeCount += $_.Discrete
    $_.Cumulative = $cumulativeCount
}

# Output the counts in a table format
$output.Values | Sort-Object Month | Format-Table -Property Month, Discrete, Cumulative, Data, Mgmt, Greenfield, Brownfield -AutoSize

# Export the counts to a CSV file with the properties in the same order. CSV file can be loaded in Excel to generate charts.
$output.Values | Sort-Object Month | Select-Object Month, Discrete, Cumulative, Data, Mgmt, Greenfield, Brownfield | Export-Csv -Path ./output.csv -NoTypeInformation
