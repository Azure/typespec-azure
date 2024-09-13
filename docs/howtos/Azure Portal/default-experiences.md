# Generating experiences in Azure Portal with TypeSpec

Go to the [TypeSpec guide](https://typespec.io/docs/next/libraries/http/content-types#content-type-negotiation) to learn how to customize a default Azure Portal experience for your resource types using TypeSpec. Go to this documentation link to learn how to apply TypeSpec decorators and see an example to brand your generated experience.

## About Default Experiences

Azure Portal generates end-to-end experiences automatically, providing Resource Providers with immediate UX in Azure Portal for their resource types. This pipeline runs offline and generates views and an asset for your resource type. These generated experiences done by Azure Portal based on resource type metadata are called "Default Experiences". Leveraging TypeSpec affords Resource Providers with an easy, declarative way of branding and promoting these experiences, as the generated default experience is hidden by default. [Learn more](https://eng.ms/docs/products/azure-portal-framework-ibizafx/declarative/generated)

#### Default experiences include:
| **Browse + Management** |  |
| --- | --- |
| > Global Search | *Discover resource instances and browse view through search* |
| > All Resources | *Discover resource instances in All Resources and launch Overview UX* |
| > Browse | *Browse and manage resource instances in standard browse view* |
| **Overview UX** |  |
| > Commands: | Refresh, Delete, Create, Open in mobile, CMD by REST-API-SPEC (w/out params) |
| > Tabs: | Get Started template, Properties, Monitoring, Recommendations |
| > Essentials | *Enable essentials control* |
| **Resource Menu** |  |
| > Standard Framework Options: | Support + Troubleshooting, Activity Log, IAM, Tags, Monitoring, Diagnostics, etc. |
| > Properties view | *Enable properties view for resource* |
| > CLI / PS view | *Enable CLI / PS view for resource* |
| > Child Browse views | *View child resources in menu* |

![alt-text](https://github.com/Azure/portaldocs/raw/main/portal-sdk/media/top-extensions-autogeneration/GeneratedOverviewTabs.jpg "Overview blade breakdown")



## Promoting generated experiences to production
See [Promoting Default Experiences](https://eng.ms/docs/products/azure-portal-framework-ibizafx/declarative/promotion) to learn how to promote your default generated Portal experience using TypeSpec.
