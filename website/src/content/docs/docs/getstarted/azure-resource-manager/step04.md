---
title: 5. Defining Custom Actions
---

Some resources will provide more than the standard CRUD operations and will need to define a custom action endpoint. Additional resource operations can be added to the `interface` where you defined standard resource operations, using the `ArmResourceAction` templates.

For example, to add an additional `POST` action called `/notify` to the standard operations of `User`:

```typespec
@doc("The details of a user notification.")
model NotificationDetails {
  @doc("The notification message.")
  message: string;

  @doc("If true, the notification is urgent.")
  urgent: boolean;
}

@armResourceOperations
interface Users extends TrackedResourceOperations<User, UserProperties> {
  @doc("Send a notification to the user")
  @segment("notify")
  NotifyUser is ArmResourceActionNoContentSync<User, NotificationDetails>;
}
```

The following operation templates for different kinds of actions are provider in the `Azure.ResourceManager` namespace:

| Template                                                 | Description                                                                                        |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `ArmResourceActionNoContentSync<TResource, TRequest>`    | Synchronous action with no data in the response, providing the resource type and request payload.  |
| `ArmResourceActionNoContentAsync<TResource, TRequest>`   | Asynchronous action with no data in the response, providing the resource type and request payload. |
| `ArmResourceActionSync<TResource, TRequest, TResponse>`  | Synchronous action, providing the resource type and request and response payload.                  |
| `ArmResourceActionAsync<TResource, TRequest, TResponse>` | Asynchronous action, providing the resource type and request and response payload.                 |

## Custom Operations

Alternately, you may define custom operations for extraordinary scenarios. Be sure to have a discussion with the ARM team before defining a custom operation.
There are strict guidelines around ARM operations, and you may need to get special signoff for operation that are not expressible using the templates.

In a custom operation, you define the operation parameters, responses, http verb, and so on. For example, here is an operation defining a simple custom action.

```typespec
@post
@doc("Send a notification to the user")
@segment("notify")
op NotifyUser(
  ...ResourceInstanceParameters<User>,
  @body notification: NotificationDetails,
): ArmResponse<string> | ErrorResponse;
```

### ARM Response Types

Custom operations in ARM still need to respect the correct response schema. This library provides standard ARM response types to help with reusability and compliance.

| Model                            | Code | Description                                                                                                                 |
| -------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------- |
| `ArmResponse<T>`                 | 200  | Base Arm 200 response.                                                                                                      |
| `ArmCreatedResponse<T>`          | 201  | Resource created response.                                                                                                  |
| `ArmNoContentResponse<TMessage>` | 204  | No Content (success). The parameter is the documentation for the response (by default, `Operation completed successfully`). |
| `ArmDeletedResponse`             | 200  | Resource deleted response.                                                                                                  |
| `ArmDeleteAcceptedResponse`      | 202  | Resource deletion in progress response.                                                                                     |
| `ArmDeletedNoContentResponse`    | 204  | Resource deleted response.                                                                                                  |
| `Page<T>`                        | 200  | Return a list of resource with ARM pagination.                                                                              |
| `ErrorResponse<T>`               | x    | Error response.                                                                                                             |

### Common Operation Parameters

There are a number of model types which specify common parameters which are used in resource type operations:

| Model                        | In           | Description                                                        |
| ---------------------------- | ------------ | ------------------------------------------------------------------ |
| `ApiVersionParameter`        | query        | `api-version` parameter                                            |
| `SubscriptionIdParameter`    | path         | Subscription ID path parameter                                     |
| `ResourceGroupNameParameter` | path         | Resource Group Name path parameter                                 |
| `CommonResourceParameters`   | path & query | Group of Api version, Subscription ID and Resource group parameter |
| `ResourceUriParameter`       | path         | Resource uri path parameter                                        |
| `OperationIdParameter`       | path         | Operation Id path parameter                                        |

## Name Availability Operations

Sometimes, resource names must be globally unique or unique within a specified location. The following operation templates are provided in the `Azure.ResourceManager` namespace for checking name availability:

| Template                                                              | Description                                          |
| --------------------------------------------------------------------- | ---------------------------------------------------- |
| `checkLocalNameAvailability<TRequest, TResponse, TAdditionalParams>`  | Checks name availability based on an Azure location. |
| `checkGlobalNameAvailability<TRequest, TResponse, TAdditionalParams>` | Checks name availability globally.                   |

These templates have default values so that they are normally used without specifying any template parameters.

### Custom Name Check Operation

The above templates are specializations of the following template in the `Azure.ResourceManager.Foundations` namespace:

| Template                                                                          | Description                                                      |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `checkNameAvailability<TScopeParameters, TRequest, TResponse, TAdditionalParams>` | Checks name availability based on the provided scope parameters. |

For reference, the standard templates use the following `TScopeParameters`:

| Operation                      | Scope Parameters                                                       |
| ------------------------------ | ---------------------------------------------------------------------- |
| Global Name Availability Check | `SubscriptionIdParameter, DefaultProviderNamespace`                    |
| Local Name Availability Check  | `SubscriptionIdParameter, DefaultProviderNamespace, LocationParameter` |
