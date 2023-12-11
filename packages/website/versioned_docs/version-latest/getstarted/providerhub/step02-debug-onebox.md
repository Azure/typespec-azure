# 2. Debug with OneBox

To debug your UserRP project with [ProviderHub OneBox](https://armwiki.azurewebsites.net/rpaas/onebox.html) in local environment, you need basically perform following 2 steps:

1. Run OneBox locally
2. Register your resourceProvider and resourceTypes

### Prerequisites

1. Install [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
1. Install [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest)
1. Install [oav](https://www.npmjs.com/package/oav) for API Test

To authenticate with the ProviderHub OneBox ACR, use following commands:

```bash
az login
az acr login --name rpaasoneboxacr
```

If you are not authorized to access rpaasoneboxacr, you may need to be added to the [RPaaS Partners Security Group](https://idweb.microsoft.com/identitymanagement/aspx/groups/AllGroups.aspx?popupFromClipboard=%2Fidentitymanagement%2Faspx%2FGroups%2FEditGroup.aspx%3Fid%3Dfc4a82d5-c2fb-4519-8e14-6b9582de07fe).

### Run OneBox

#### Option 1: Run OneBox with `docker-compose`

```bash
cd onebox
docker-compose up
```

The OneBox will be running on <http://localhost:5000>.

Available environment variables:

- `RPAAS_ONEBOX_IMAGE_TAG`: The tag of the OneBox images to use. Default is `latest`.
- `RPAAS_ONEBOX_REGISTRY`: The registry to use for OneBox images. Default is `rpaasoneboxacr.azurecr.io`.
- `RPAAS_ONEBOX_PORT`: The port to expose the OneBox on. Default is `5000`.
- `RPAAS_ONEBOX_SERVICERP_PORT`: The port to expose the OneBox ServiceRP on. Default is `6012`.
- `RPAAS_ONEBOX_METARP_PORT`: The port to expose the OneBox MetaRP on. Default is `6010`.

For example, to run the OneBox on another port:

```bash
RPAAS_ONEBOX_PORT=8080 docker-compose up
```

To stop OneBox, run `docker-compose down`.

#### Option 2: Run OneBox with [Porter](https://porter.sh/install/)

```bash
porter install --reference rpaasoneboxacr.azurecr.io/rpaas-onebox:v0.1.1 --allow-docker-host-access
```

Available parameters:

- `tag`: The tag of the OneBox images to use. Default is `latest`.
- `registry`: The registry to use for OneBox images. Default is `rpaasoneboxacr.azurecr.io`.
- `port`: The port to expose the OneBox on. Default is `5000`.
- `port_servicerp`: The port to expose the OneBox ServiceRP on. Default is `6012`.
- `port_metarp`: The port to expose the OneBox MetaRP on. Default is `6010`.

For example, to run the OneBox on another port:

```bash
porter install --reference rpaasoneboxacr.azurecr.io/rpaas-onebox:v0.1.1 --allow-docker-host-access --param port=8080
```

To stop, run `porter uninstall rpaas-onebox`.

### Register resourceProvider and resourceTypes

The resourceProvider and resourceTypes registration contents are put in the `registrations` folder:

```
.
├── register.sh
└── registrations
    ├── Microsoft.Contoso
    │   └── employees.json
    └── Microsoft.Contoso.json
```

With following command, you can register the resourceProvider and resourceTypes to OneBox ServiceRP:

```bash
chmod +x register.sh
./register.sh
```

Limitation: ./register.sh works only for registering parent resource. Child resource type should be registered manually via curl or postman.

Example: PUT http://host.docker.internal:5000/subscriptions/{subscriptionId}/providers/Microsoft.ProviderHub/providerregistrations/{RP Namespace}/resourcetyperegistrations/{parentResource}/resourcetyperegistrations/{childResource}?api-version={api-version}

The payload for the request looks like below:

```json
{
  "properties": {
    "routingType": "Default",
    "regionality": "Regional",
    "management": {
      "incidentRoutingService": "ICM ServiceName",
      "incidentRoutingTeam": "ICM TeamName",
      "incidentContactEmail": "incidentContactEmail@domain.com"
    },
    "endpoints": [
      {
        "apiVersions": [{api-version}],
        "locations": ["West US"],
        "extensions": [
          {
            "endpointUri": "http://host.docker.internal:6020/",
            "extensionCategories": [
              "ResourceReadValidate",
              "ResourceCreationValidate",
              "ResourceCreationBegin",
              "ResourceCreationCompleted",
              "ResourcePatchValidate",
              "ResourcePatchBegin",
              "ResourcePatchCompleted",
              "ResourceDeletionValidate",
              "ResourceDeletionBegin",
              "ResourceDeletionCompleted"
            ]
          }
        ]
      }
    ]
  }
}

```

or with `docker`:

```bash
docker run --rm -v $(pwd)/registrations:/app/registrations:ro rpaasoneboxacr.azurecr.io/rpaas-onebox/register
```

or directly do the registration with Curl or other REST tools. See [ProviderHub wiki As RP owner section](https://armwiki.azurewebsites.net/rpaas/onebox.html#as-rp-owner-userrp).

Note that, the registration is idempotent, and is persisted in docker volume. In case you need to reset the registration, use following command:

```bash
docker-compose down -v
```
