---
title: 10. Versioning
---

## Versioning your service

It is inevitable that service specifications will change over time. It is a best practice to add versioning support to your specification from the first version. To do that, you will need to define an `enum` containing your service versions and then apply the `@versioned` decorator to your service namespace.

Here is an example for the `WidgetManager` service:

```typespec
@service({
  title: "Contoso Widget Manager",
})
@versioned(Contoso.WidgetManager.Versions)
namespace Contoso.WidgetManager;

enum Versions {
  @useDependency(Azure.Core.Versions.v1_0_Preview_1)
  v2022_08_31: "2022-08-31",
}
```

There are a few things to point out here:

- We define an `enum` called `Versions` inside of the service namespace. For each service version, we map a version symbol like `v2022_08_31` to a version string like `2022-08-31`. This service currently only has a single version, but we can add more to this enum as things change over time.
- We add the `@versioned` decorator and reference the `Versions` enum we defined using the fully-qualified name `Contoso.WidgetManager.Versions`. This marks the service as being versioned and specifies the set of versions.
- We change the `@useDependency` decorator we used previously to now link each service version to a specific version of `Azure.Core`. See the [Using Azure.Core Versions](#using-azurecore-versions) section for more information.

Imagine that it's 3 months later and you want to release a new version of your service with some slight changes. Add a new version to the `Versions` enum:

```typespec
enum Versions {
  @useDependency(Azure.Core.Versions.v1_0_Preview_1)
  v2022_08_31: "2022-08-31",

  v2022_11_30: "2022-11-30",
}
```

You will also need to add the `@useDependency` decorator:

```typespec
enum Versions {
  @useDependency(Azure.Core.Versions.v1_0_Preview_1)
  v2022_08_31: "2022-08-31",

  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  v2022_11_30: "2022-11-30",
}
```

Finally, you can express changes to your service using the `@added` and `@removed` decorators. Here's an example of adding a new property to `Widget` and removing an old one:

```typespec
@doc("A widget.")
@resource("widgets")
model Widget {
  @key("widgetName")
  @doc("The widget name.")
  @visibility("read")
  name: string;

  @doc("The widget color.")
  @added(Contoso.WidgetManager.Versions.v2022_11_30)
  color: string;

  @doc("The ID of the widget's manufacturer.")
  @removed(Contoso.WidgetManager.Versions.v2022_11_30)
  manufacturerId: string;
}
```

> You can do a lot more with versioning decorators, so consult the `typespec-versioning` [README.md](https://github.com/microsoft/typespec/tree/main/packages/versioning#enable-versioning-for-service-or-library) for more information on how you can use them to annotate your service and describe changes between different versions.

## Using Azure.Core versions

`typespec-azure-core` is a versioned TypeSpec library. This means that even as the TypeSpec portions of the typespec-azure-core library are updated, you can anchor each version of your spec to a specific `Azure.Core` version. This is done by decorating your service namespace with the `@useDependency` decorator from the `typespec-versioning` library.

Simple TypeSpec specs need only pass the desired `Azure.Core` version into the `@useDependency` decorator:

```typespec
@service({
  title: "Contoso Widget Manager",
})
@useDependency(Azure.Core.Versions.v1_0_Preview_2)
namespace Contoso.WidgetManager;
```

If your spec has [multiple versions](#versioning-your-service), you will need to specify the version of `typespec-azure-core` that was used for each version in your spec. Assuming that there are two versions of `Azure.Core` and each version of your service uses a different one, it would look like this:

```typespec
@service({
  title: "Contoso Widget Manager",
})
@versioned(Contoso.WidgetManager.Versions)
namespace Contoso.WidgetManager;

enum Versions {
  @useDependency(Azure.Core.Versions.v1_0_Preview_1)
  v2022_08_31: "v20220831",

  @useDependency(Azure.Core.Versions.v1_0_Preview_2)
  v2022_11_30: "v20221130",
}
```
