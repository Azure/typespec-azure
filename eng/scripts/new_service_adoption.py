#!/usr/bin/env python3

"""
Count the number of PRs in a 1 month period for services that do not have a GA
version and do not have a TypeSpec.
"""

import glob
import os
import re
import requests

token = os.environ.get('GITHUB_TOKEN')
auth_header = {'Authorization': 'Bearer ' + token} if token else None

total = 0
closed = 0
new_version = 0
new_service = 0
typespec = []
non_typespec = []

def get_pr_files(pr) -> list[dict]:
    r = requests.get(pr['pull_request']['url'] + '/files', headers = auth_header)
    if r.status_code != 200:
        print(f'Error: {r.status_code} {r.text}')
        exit(1)
    files = r.json()
    while 'next' in r.links:
        r = requests.get(r.links['next']['url'], headers = auth_header)
        if r.status_code != 200:
            print(f'Error: {r.status_code} {r.text}')
            exit(1)
        files.extend(r.json())
    return files


private_rps = [
    'testbase',  # Has stable versions in private repo but not public
    ]

def non_public(namespace) -> bool:
    rp = namespace.split('/')[0]
    if rp in private_rps:
        return True
    return False

# Return true if PR is for a service that does not have a GA version
def pr_for_new_service(pr, files: list[dict]):
    # To find the namespace, look for files matching the pattern
    # 'specification/[a-z-]+/(data-plane|resource-manager)/*'
    # and exclude files with 'common' in the path
    # Make sure there are at least 4 path segments
    pattern = r'specification/[a-z-]+/(data-plane|resource-manager)/.*/.*'
    filenames = [x['filename'] for x in files]
    xfiles = [x for x in filenames if re.match(pattern, x) and 'common' not in x]
    # The namespace is the combined 3 path segments after "specification"
    namespaces = list({'/'.join(x.split('/')[1:4]) for x in xfiles})
    for namespace in namespaces:
        if non_public(namespace):
            continue
        stable = glob.glob(f'azure-rest-api-specs/specification/{namespace}/**/stable', recursive=True)
        if not stable:
            return namespace
    return False


def pr_has_typespec(pr, files: list[dict]) -> bool:
    if any({label['name'] in ['TypeSpec','Cadl'] for label in pr['labels']}):
        return True
    filenames = [x['filename'] for x in files]
    if any({filename == 'tspconfig.yaml' for filename in filenames}):
        return True
    if any({filename == 'cadl-project.yaml' for filename in filenames}):
        return True
    if any({filename.endswith('.tsp') for filename in filenames}):
        return True
    if any({filename.endswith('.cadl') for filename in filenames}):
        return True 
    return False


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


def newAPIVersion(pr, files) -> bool:
    versionInfo = dict()

    if any({label['name'] == 'new-api-version' for label in pr['labels']}):
        return True
    for e in files:
        version = getVersion(e['filename'])
        if version is not None:
            if version not in versionInfo:
                versionInfo[version] = True
            if e['status'] != "added":
                versionInfo[version] = False
    
    for key in versionInfo:
        if versionInfo[key] is True:
            return True
    return False


# Find PRs that do not have TypeSpec and are for "greenfield" RPs (no GA version)
def analyze_prs(prs):
    global total, closed, new_service, new_version, typespec, non_typespec
    # Count PRs with the Cadl or TypeSpec label and add that to typespec
    for pr in prs:
        total += 1
        if pr['state'] == 'closed' and not pr['pull_request']['merged_at']:
            closed += 1
            continue
        files = get_pr_files(pr)
        labels = {label['name'] for label in pr['labels']} & {'data-plane', 'resource-manager', 'RPaaS'}
        if newAPIVersion(pr, files) is False:
            continue
        new_version += 1
        # if pr is for a service that already has a GA version, skip it
        if namespace := pr_for_new_service(pr, files):
            new_service += 1
            if pr_has_typespec(pr, files):
                typespec.append((namespace, labels, pr['pull_request']['html_url']))
            else:
                # Get only the data-plane, resource-manager, and RPaaS labels from the PR
                non_typespec.append((namespace, labels, pr['pull_request']['html_url']))

date_range = '2023-07-01..2023-07-31'

#query = "repo:azure/azure-rest-api-specs-pr+is:pr+base:RPSaaSMaster+label:new-api-version+created:2023-08-01..2023-08-31"
query = f"repo:azure/azure-rest-api-specs+is:pr+base:main+created:{date_range}"
url = f'https://api.github.com/search/issues?q={query}'

# Pull in the latest version of the Azure API docs (NO shallow clone)
os.system('rm -rf azure-rest-api-specs')
os.system('git clone https://github.com/Azure/azure-rest-api-specs.git')

r = requests.get(url, headers = auth_header)
if r.status_code != 200:
    print(f'Error: {r.status_code} {r.text}')
    exit(1) 
analyze_prs(r.json()['items'])
while 'next' in r.links:
    r = requests.get(r.links['next']['url'], headers = auth_header)
    if r.status_code != 200:
        print(f'Error: {r.status_code} {r.text}')
        exit(1) 
    analyze_prs(r.json()['items'])

print(f'Date range: {date_range}')
print(f'Total PRs: {total}')
print(f'Closed PRs: {closed}')
print(f'PRs for new API versions: {new_version}')
print(f'PRs for new services: {new_service}')
print(f'PRs for new services with TypeSpec: {len(typespec)}')
print(f'PRs for new services without TypeSpec: {len(non_typespec)}')
print('\nTypeSpec PRs:')
# sort by namespace
for item in sorted(typespec, key=lambda x: x[0]):
    print(f'{item[0]}: {item[1]}: {item[2]}')
print('\nNon-TypeSpec PRs:')
# sort by namespace
for item in sorted(non_typespec, key=lambda x: x[0]):
    print(f'{item[0]}: {item[1]}: {item[2]}')
