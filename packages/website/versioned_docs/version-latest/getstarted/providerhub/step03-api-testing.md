# 3. API Test with OneBox

In the project template, we provide `apitest.sh` script to smoothen the API test experience. (The script only supports WSL2 and Linux. For Windows users, please check the commands in the script and run them manually.)

1. Generate API Scenario

To get started, generate API Scenario from Swagger with the following command:

```bash
cd swagger
chmod +x apitest.sh
./apitest.sh generate
```

It will generate a `basic.yaml` file in `scenarios` folder next to swagger file, which contains all the swagger operations and minimum required parameters. You can improve the `basic.yaml` file or create new API Scenario files to define your own API usage scenarios.

2. Run API Scenario Test

To run the API Scenario test with OneBox, use the following command:

```bash
./apitest.sh run
```

After execution, the test report and Swagger examples generated from live traffic will be under `./apitest/<scenario-file-name>/<runId>/<scenario-name>/`.

3. Manual Debug API Scenario

Import the generated Postman collection and environment file into Postman, then run the API test manually.

### API Test with ARM endpoints

After service deployment to Azure, you can use `oav` to rerun the API Scenario test with ARM endpoints.

1. [Prepare AAD app](https://docs.microsoft.com/azure/active-directory/develop/howto-create-service-principal-portal) and assign subscription contributor role to the app.

2. Update the `.apitest/env.json` file with `tenantId`, `client_id`, `client_secret`, and `subscriptionId` prepared in step 1:

```json
{
  "tenantId": "<AAD app tenantId>",
  "client_id": "<AAD app client_id>",
  "client_secret": "<AAD app client_secret>",
  "subscriptionId": "<subscriptionId>",
  "location": "westus"
}
```

3. Run API Scenario test with ARM endpoints:

```bash
  oav run <scenario-file> --specs <swagger-file> -e <env-file>
```

After execution, check the test report under `.apitest/<scenario-file-name>/<runId>/<scenario-name>/report.json`.

### Generate Swagger examples

Enable generating examples from live traffic in API Scenario test with option `--generateExample` (already enabled if using `apitest.sh`):

```bash
  oav run <scenario-file> --specs <swagger-file> -e <env-file> --generateExample
```

After execution, the Swagger examples will be generated in `.apitest/<scenario-file-name>/<runId>/<scenario-name>/examples`. You can check the examples and copy to `typespec/examples` folder. Next time when you compile typespec or build the project, the examples will be used in generated Swagger.
