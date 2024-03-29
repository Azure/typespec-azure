<#
.SYNOPSIS
This script analyzes a Git repository to find all commits that add a new 'tspconfig.yaml' file within a specified date range.

.DESCRIPTION
The script takes a start date, an end date, and an optional branch name as parameters. It then iterates over each month in the date range, and for each month, it uses the `git log` command to find all commits that added a new 'tspconfig.yaml' file on the specified branch. The script counts the number of such commits for each month and outputs the counts in a table format. It also distinguishes between data plane and management plane commits based on the existince of 'resource-manager' or 'Management' in the file paths in the commit. Further, it distinguishes between greenfield and brownfield services based on the existence of a 'stable' folder in the service path.

.PARAMETER startDate
The start date for the analysis. Must be a string in the format 'yyyy-MM-dd'.

.PARAMETER endDate
The end date for the analysis. Must be a string in the format 'yyyy-MM-dd'.

.PARAMETER branchName
The name of the Git branch to analyze. Optional, defaults to 'main'. Usual expectation is to run against 'main' and 'RPSaaSMaster' branches.

.PARAMETER DebugMode
A flag that enables debug mode, which outputs additional information for each commit. Optional, defaults to false.
#>

# Define script parameters
param (
    # Start and end dates for the analysis (mandatory)
    [Parameter(Mandatory=$true)]
    [string]$startDate,
    [Parameter(Mandatory=$true)]
    [string]$endDate,

    # Name of the Git branch to analyze (optional, defaults to 'main')
    [Parameter(Mandatory=$false)]
    [string]$branchName = 'main',

    # Debug mode flag (optional, defaults to false)
    [Parameter(Mandatory=$false)]
    [bool]$DebugMode = $false
)

# Convert the date strings to DateTime objects
$start = Get-Date $startDate
$end = Get-Date $endDate

# Define the relative path to the Git repository
# Assumes the repository is a subdirectory named "azure-rest-api-specs-pr" in the same directory as the script
$repoPath = Join-Path -Path $PSScriptRoot -ChildPath "azure-rest-api-specs-pr"

# Initialize an empty array to hold all commits
$allCommits = @()

# Initialize counters for data plane and management plane commits
$dataPlaneCommits = 0
$managementPlaneCommits = 0

# Initialize an empty array to hold the output objects
$output = @()

# Loop over each month in the date range
for ($date = $start; $date -le $end; $date = $date.AddMonths(1)) {
    # Define the date range for this month
    $since = $date.ToString("yyyy-MM-dd")
    $until = $date.AddMonths(1).ToString("yyyy-MM-dd")

    # Change to the Git repository directory
    Set-Location -Path $repoPath

    # Get the name of the current branch
    $currentBranch = git rev-parse --abbrev-ref HEAD

    # Check if the current branch matches $branchName
    if ($currentBranch -ne $branchName) {
        # If not, switch to $branchName
        git checkout $branchName
    }

    # Find commits that add new 'tspconfig.yaml' files during this month on the specified branch
    $commitHashesAndDates = git log $branchName --since=$since --until=$until --pretty=format:"%H %ad" --diff-filter=A -- '*tspconfig.yaml'

    # Initialize an empty array to hold the commits for this month
    $monthlyCommits = @()

    # Process each commit separately
    foreach ($commitHashAndDate in $commitHashesAndDates -split "`n") {
        # Split the commit hash and date
        $commitHash, $commitDate = $commitHashAndDate -split " ", 2
    
        # Get the file paths for this commit
        $filePaths = git show --pretty="" --name-only $commitHash
    
        # Check if the commit includes changes to 'tspconfig.yaml'
        if ($filePaths -match "tspconfig.yaml") {
            $tspconfigPaths = $filePaths | Where-Object { $_ -match "tspconfig.yaml" }

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
            if ($filePaths -notmatch 'resource-manager' -and $filePaths -notmatch '\.Management') {
                # This is a data plane commit
                $dataPlaneCommits++
            } else {
                # This is a management plane commit
                $managementPlaneCommits++
            }

            # Add the commit to the array of all commits and the array of monthly commits
            $allCommits += $commitHash
            $monthlyCommits += $commitHash
    
            # Output the commit hash, date, and file paths for debug
            if ($DebugMode) {
                Write-Output "Commit hash: $commitHash"
                Write-Output "Commit date: $commitDate"
                Write-Output "File paths:"
                Write-Output $filePaths
            }
        }
    }

    # Count the unique commits
    $cumulativeCount = $allCommits | Sort-Object -Unique | Measure-Object | % { $_.Count }
    $discreteCount = $monthlyCommits | Sort-Object -Unique | Measure-Object | % { $_.Count }

    # Create an object for this month and add it to the output array
    $output += New-Object PSObject -Property @{
        Month = $date.ToString("yyyy-MM")
        Discrete = $discreteCount
        Cumulative = $cumulativeCount
        Data = $dataPlaneCommits
        Mgmt = $managementPlaneCommits
        Greenfield = $greenfieldCommits
        Brownfield = $brownfieldCommits
    }
}

# Change back to the script directory
Set-Location -Path $PSScriptRoot

# Output the counts in a table format
$output | Format-Table -Property Month, Discrete, Cumulative, Data, Mgmt, Greenfield, Brownfield -AutoSize
