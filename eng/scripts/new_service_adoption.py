#!/usr/bin/env python3

# Run 'pip install requests' to install the necessary libraries prior to running this script.

"""
This script counts the number of Pull Requests (PRs) within the specified
date range for services that do not have a GA version and do not have a TypeSpec. This script is meant to be run in a bash shell.
"""

# Import necessary libraries
import glob
import os
import subprocess
import re
import requests
import argparse
from datetime import datetime

# When creating your GitHub token, make sure it's credentialed
# to access 'Microsoft Azure' using the 'Configure SSO' option
# or it flat out won't work!
token = os.environ.get('GITHUB_TOKEN')

# The auth_header is used for authenticating requests to the GitHub API
auth_header = {'Authorization': 'Bearer ' + token} if token else None

# Initialize counters and lists to store data
total = 0
closed = 0
new_version = 0
new_service = 0
typespec = []
non_typespec = []
monthly_counts = {}

# Function to get the files associated with a PR
def get_pr_files(pr) -> list[dict]:
    # Send a GET request to the GitHub API to get the files associated with the PR
    r = requests.get(pr['pull_request']['url'] + '/files', headers = auth_header)
    # If the request is not successful, print an error message and exit the script
    if r.status_code != 200:
        print(f'Error getting files associated with PR: {r.status_code} {r.text}')
        exit(1)
    # Parse the JSON response to get the list of files
    files = r.json()
    # If there are more files to retrieve (indicated by the presence of a 'next' link), continue retrieving files
    while 'next' in r.links:
        r = requests.get(r.links['next']['url'], headers = auth_header)
        if r.status_code != 200:
            print(f'Error getting next links: {r.status_code} {r.text}')
            exit(1)
        # Add the newly retrieved files to the list of files
        files.extend(r.json())
    # Return the list of files
    return files

# List of private repositories
private_rps = [
    'testbase',  # Has stable versions in private repo but not public
    ]

# Function to check if a namespace is non-public
def non_public(namespace) -> bool:
    rp = namespace.split('/')[0]
    if rp in private_rps:
        return True
    return False

# Function to check if a PR is for a service that does not have a GA version
def pr_for_new_service(pr, files: list[dict]):
    # To find the namespace, look for files matching the pattern
    # 'specification/[a-z-]+/(data-plane|resource-manager)/*'
    # and exclude files with 'common' in the path
    # Make sure there are at least 4 path segments
    pattern = r'specification/[a-z-]+/(data-plane|resource-manager)/.*/.*'
    filenames = [x['filename'] for x in files]
    x_files = [x for x in filenames if re.match(pattern, x) and 'common' not in x]
    # The namespace is the combined 3 path segments after "specification"
    namespaces = list({'/'.join(x.split('/')[1:4]) for x in x_files})
    for namespace in namespaces:
        if non_public(namespace):
            continue
        stable = glob.glob(f'azure-rest-api-specs-pr/specification/{namespace}/**/stable', recursive=True)
        if not stable:
            return namespace
    return False

# Function to check if a PR has a TypeSpec
def pr_has_typespec(pr, files: list[dict]) -> bool:
    # Check if the PR has a label of 'TypeSpec' or 'Cadl'
    if any({label['name'] in ['TypeSpec','Cadl'] for label in pr['labels']}):
        return True
    # Check if the PR includes a file named 'tspconfig.yaml' or 'cadl-project.yaml'
    filenames = [x['filename'] for x in files]
    if any({filename == 'tspconfig.yaml' for filename in filenames}):
        return True
    if any({filename == 'cadl-project.yaml' for filename in filenames}):
        return True
    # Check if the PR includes a file with a '.tsp' or '.cadl' extension
    if any({filename.endswith('.tsp') for filename in filenames}):
        return True
    if any({filename.endswith('.cadl') for filename in filenames}):
        return True 
    return False

# Function to get the version from a file path
def getVersion(path) -> str | None:
    """
    Returns the version segment in a file path or None.
    """
    parts = path.split('/')
    # Get the index of the "stable" or "preview" part of the path
    if "preview" in parts:
        indx = parts.index("preview")
    elif "stable" in parts:
        indx = parts.index("stable")
    else:
        return None
    if indx < len(parts) - 1:
        return parts[indx+1]
    return None


# Function to check if a PR introduces a new API version
def newAPIVersion(pr, files) -> bool:
    versionInfo = dict()

    # If the PR has a label of 'new-api-version', return True
    if any({label['name'] == 'new-api-version' for label in pr['labels']}):
        return True
    # Check each file in the PR
    for e in files:
        # Get the version from the file path
        version = getVersion(e['filename'])
        if version is not None:
            # If this version is not already in versionInfo, add it
            if version not in versionInfo:
                versionInfo[version] = True
            # If the file status is not "added", set the version to False in versionInfo
            if e['status'] != "added":
                versionInfo[version] = False
    
    # If any version in versionInfo is True, return True
    for key in versionInfo:
        if versionInfo[key] is True:
            return True
    return False

# Find PRs that do not have TypeSpec and are for "greenfield" RPs (no GA version)
def analyze_prs(prs):
    global total, closed, new_service, new_version, typespec, non_typespec, monthly_counts

    for pr in prs:
        # Get the month in 'YYYY-MM' format from the 'created_at' field of the PR
        month = pr['created_at'][:7]

        # If this month is not already in monthly_counts, initialize the counts for this month
        if month not in monthly_counts:
            monthly_counts[month] = {'total': 0, 'closed': 0, 'new_version': 0, 'new_service': 0, 'typespec': 0, 'non_typespec': 0}

        monthly_counts[month]['total'] += 1
        total += 1
        
        # If the PR is closed and not merged, increment the closed counter and continue to the next PR
        if pr['state'] == 'closed' and not pr['pull_request']['merged_at']:
            monthly_counts[month]['closed'] += 1
            closed += 1
            continue

        files = get_pr_files(pr)
        labels = {label['name'] for label in pr['labels']} & {'data-plane', 'resource-manager', 'RPaaS'}

        if newAPIVersion(pr, files) is False:
            continue

        monthly_counts[month]['new_version'] += 1
        new_version += 1

        # If the PR is for a service that already has a GA version, skip it
        if namespace := pr_for_new_service(pr, files):
            monthly_counts[month]['new_service'] += 1
            new_service += 1

            # If the PR has a TypeSpec, add it to the typespec list and increment the typespec count for this month
            if pr_has_typespec(pr, files):
                monthly_counts[month]['typespec'] += 1
                typespec.append((namespace, labels, pr['pull_request']['html_url']))
            else:
                # If the PR does not have a TypeSpec, increment the non-typespec count for this month
                monthly_counts[month]['non_typespec'] += 1
                non_typespec.append((namespace, labels, pr['pull_request']['html_url']))

# Define the date range for which to analyze PRs
# Create the parser
parser = argparse.ArgumentParser(description="Analyze PRs for a specific date range.")

# Add the arguments
parser.add_argument('date_range', type=str, help='The date range for which to analyze PRs (format: YYYY-MM-DD..YYYY-MM-DD)')
parser.add_argument('--monthly', action='store_true', help='Sort the output by month')
parser.add_argument('--public', action='store_true', help='Switch the query to the main (public) branch')

# Parse the arguments
args = parser.parse_args()

# Get the date range from the arguments
date_range = args.date_range

# Define the base branch based on the --public option
base_branch = 'main' if args.public else 'RPSaaSMaster'

# Define the query to use to get PRs from the GitHub API
query = f"repo:azure/azure-rest-api-specs-pr+is:pr+base:{base_branch}+label:new-api-version+created:{date_range}"
url = f'https://api.github.com/search/issues?q={query}'

# Pull in the latest version of the Azure API docs (NO shallow clone)
# Check if the directory already exists
if os.path.isdir('azure-rest-api-specs-pr'):
    # If it does, change into that directory
    os.chdir('azure-rest-api-specs-pr')
    # Pull the latest changes
    subprocess.run(['git', 'pull'])
    # Checkout the base branch
    subprocess.run(['git', 'checkout', base_branch])
    # Change back to the parent directory
    os.chdir('..')
else:
    # If the directory doesn't exist, clone the repository
    os.system(f'git clone https://{token}@github.com/Azure/azure-rest-api-specs-pr.git')


# Send a GET request to the GitHub API to get the PRs
r = requests.get(url, headers = auth_header)
# If the request is not successful, print an error message and exit the script
if r.status_code != 200:
    print(f'Error getting PRs: {url} {r.status_code} {r.text}')
    exit(1) 
# Analyze the PRs
analyze_prs(r.json()['items'])
# If there are more PRs to retrieve (indicated by the presence of a 'next' link), continue retrieving and analyzing PRs
while 'next' in r.links:
    r = requests.get(r.links['next']['url'], headers = auth_header)
    if r.status_code != 200:
        print(f'Error getting links while analyzing PRs: {r.status_code} {r.text}')
        exit(1) 
    analyze_prs(r.json()['items'])

# Function to print results
def print_results(month, counts, cumulative_counts=None, typespec=None, non_typespec=None):
    # Convert the month from 'YYYY-MM' format to 'MMM YY' format
    month = datetime.strptime(month, '%Y-%m').strftime('%b %y')

    # Print the month and counts
    print(f'Month: {month}')
    print('Counts:')
    print(f'Total PRs: {counts["total"]}')
    print(f'Closed PRs: {counts["closed"]}')
    print(f'PRs for new API versions: {counts["new_version"]}')
    print(f'PRs for new services: {counts["new_service"]}')
    print(f'PRs for new services with TypeSpec: {counts["typespec"]}')
    print(f'PRs for new services without TypeSpec: {counts["non_typespec"]}')

    # If cumulative_counts is not None, print the cumulative counts
    if cumulative_counts:
        print('Cumulative Counts:')
        print(f'Total PRs: {cumulative_counts["total"]}')
        print(f'Closed PRs: {cumulative_counts["closed"]}')
        print(f'PRs for new API versions: {cumulative_counts["new_version"]}')
        print(f'PRs for new services: {cumulative_counts["new_service"]}')
        print(f'PRs for new services with TypeSpec: {cumulative_counts["typespec"]}')
        print(f'PRs for new services without TypeSpec: {cumulative_counts["non_typespec"]}')

    # If typespec and non_typespec are not None and cumulative_counts is None, print the PR details
    if typespec and non_typespec and not cumulative_counts:
        print('\nTypeSpec PRs:')
        for item in sorted(typespec, key=lambda x: x[0]):
            print(f'{item[0]}: {item[1]}: {item[2]}')
        print('\nNon-TypeSpec PRs:')
        for item in sorted(non_typespec, key=lambda x: x[0]):
            print(f'{item[0]}: {item[1]}: {item[2]}')
    print()

# If the --monthly flag is used, calculate and print cumulative counts for each month
if args.monthly:
    # Initialize a dictionary to store the cumulative counts
    cumulative_counts = {'total': 0, 'closed': 0, 'new_version': 0, 'new_service': 0, 'typespec': 0, 'non_typespec': 0}

    # Loop through each month in sorted order
    for month in sorted(monthly_counts.keys()):
        # Add the counts for this month to the cumulative counts
        for key in cumulative_counts.keys():
            cumulative_counts[key] += monthly_counts[month][key]

        # Print the results for this month
        print_results(month, monthly_counts[month], cumulative_counts)
else:
    # If the --monthly flag is not used, calculate the total counts and print the results
    counts = {'total': total, 'closed': closed, 'new_version': new_version, 'new_service': new_service, 'typespec': len(typespec), 'non_typespec': len(non_typespec)}
    print_results('Overall', counts, typespec=typespec, non_typespec=non_typespec)
