import {
  json,
  MockRequest,
  ScenarioMockApi,
  ValidationError,
  withServiceKeys,
} from "@typespec/spec-api";

export const Scenarios: Record<string, ScenarioMockApi> = {};

function pageableHandler(req: MockRequest) {
  req.expect.containsQueryParam("maxpagesize", "3");
  const skipToken = req.query["skipToken"];
  if (skipToken === undefined) {
    return {
      pass: "firstPage",
      status: 200,
      body: json({
        value: [{ name: "user5" }, { name: "user6" }, { name: "user7" }],
        nextLink: `${req.baseUrl}/azure/payload/pageable?skipToken=name-user7&maxpagesize=3`,
      }),
    } as const;
  } else if (skipToken === "name-user7") {
    return {
      pass: "secondPage",
      status: 200,
      body: json({ value: [{ name: "user8" }] }),
    } as const;
  } else {
    throw new ValidationError(
      "Unsupported skipToken query parameter",
      `Not provided for first page, "name-user7" for second page`,
      req.query["skipToken"],
    );
  }
}

function apiVersionUpdateV1Handler(req: MockRequest) {
  req.expect.containsQueryParam("maxpagesize", "3");
  const skipToken = req.query["skipToken"];
  const apiVersion = req.query["api-version"];
  
  if (skipToken === undefined) {
    // First page - return nextLink with v1 api-version
    return {
      pass: "firstPage",
      status: 200,
      body: json({
        value: [{ name: "user1" }, { name: "user2" }, { name: "user3" }],
        nextLink: `${req.baseUrl}/azure/payload/pageable/api-version-update-nextlink-v1?skipToken=token-user3&maxpagesize=3&api-version=v1`,
      }),
    } as const;
  } else if (skipToken === "token-user3") {
    // Second page - expect v2 api-version, fail if v1
    if (apiVersion === "v1") {
      throw new ValidationError(
        "APIVersion should have been updated",
        "Expected api-version=v2, but received api-version=v1. SDK should update nextLink api-version to v2.",
        apiVersion,
      );
    } else if (apiVersion === "v2") {
      return {
        pass: "secondPage",
        status: 200,
        body: json({ value: [{ name: "user4" }] }),
      } as const;
    } else {
      throw new ValidationError(
        "Invalid API version",
        "Expected api-version=v2",
        apiVersion,
      );
    }
  } else {
    throw new ValidationError(
      "Unsupported skipToken query parameter",
      `Not provided for first page, "token-user3" for second page`,
      req.query["skipToken"],
    );
  }
}

function apiVersionUpdateMissingHandler(req: MockRequest) {
  req.expect.containsQueryParam("maxpagesize", "3");
  const skipToken = req.query["skipToken"];
  const apiVersion = req.query["api-version"];
  
  if (skipToken === undefined) {
    // First page - return nextLink without api-version
    return {
      pass: "firstPage",
      status: 200,
      body: json({
        value: [{ name: "user1" }, { name: "user2" }, { name: "user3" }],
        nextLink: `${req.baseUrl}/azure/payload/pageable/api-version-update-nextlink-missing?skipToken=token-user3&maxpagesize=3`,
      }),
    } as const;
  } else if (skipToken === "token-user3") {
    // Second page - expect v2 api-version, fail if missing
    if (apiVersion === undefined) {
      throw new ValidationError(
        "APIVersion should have been added",
        "Expected api-version=v2, but no api-version was provided. SDK should add api-version=v2 to nextLink.",
        "missing",
      );
    } else if (apiVersion === "v2") {
      return {
        pass: "secondPage",
        status: 200,
        body: json({ value: [{ name: "user4" }] }),
      } as const;
    } else {
      throw new ValidationError(
        "Invalid API version",
        "Expected api-version=v2",
        apiVersion,
      );
    }
  } else {
    throw new ValidationError(
      "Unsupported skipToken query parameter",
      `Not provided for first page, "token-user3" for second page`,
      req.query["skipToken"],
    );
  }
}

Scenarios.Azure_Payload_Pageable_list = withServiceKeys(["firstPage", "secondPage"]).pass([
  {
    uri: "/azure/payload/pageable",
    method: "get",
    request: {
      query: {
        maxpagesize: "3",
      },
    },
    response: {
      status: 200,
      // TODO: next link not working as it should include the base url
      // body: json({
      //   value: [{ name: "user5" }, { name: "user6" }, { name: "user7" }],
      //   nextLink: `/azure/payload/pageable?skipToken=name-user7&maxpagesize=3`,
      // }),
    },
    handler: pageableHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/payload/pageable",
    method: "get",
    request: {
      query: {
        maxpagesize: "3",
        skipToken: "name-user7",
      },
    },
    response: {
      status: 200,
      body: json({ value: [{ name: "user8" }] }),
    },
    handler: pageableHandler,
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_Payload_Pageable_ApiVersionUpdate_listWithApiVersionUpdateV1 = withServiceKeys(["firstPage", "secondPage"]).pass([
  {
    uri: "/azure/payload/pageable/api-version-update-nextlink-v1",
    method: "get",
    request: {
      query: {
        maxpagesize: "3",
      },
    },
    response: {
      status: 200,
    },
    handler: apiVersionUpdateV1Handler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/payload/pageable/api-version-update-nextlink-v1",
    method: "get",
    request: {
      query: {
        maxpagesize: "3",
        skipToken: "token-user3",
        "api-version": "v2",
      },
    },
    response: {
      status: 200,
      body: json({ value: [{ name: "user4" }] }),
    },
    handler: apiVersionUpdateV1Handler,
    kind: "MockApiDefinition",
  },
]);

Scenarios.Azure_Payload_Pageable_ApiVersionUpdate_listWithApiVersionUpdateMissing = withServiceKeys(["firstPage", "secondPage"]).pass([
  {
    uri: "/azure/payload/pageable/api-version-update-nextlink-missing",
    method: "get",
    request: {
      query: {
        maxpagesize: "3",
      },
    },
    response: {
      status: 200,
    },
    handler: apiVersionUpdateMissingHandler,
    kind: "MockApiDefinition",
  },
  {
    uri: "/azure/payload/pageable/api-version-update-nextlink-missing",
    method: "get",
    request: {
      query: {
        maxpagesize: "3",
        skipToken: "token-user3",
        "api-version": "v2",
      },
    },
    response: {
      status: 200,
      body: json({ value: [{ name: "user4" }] }),
    },
    handler: apiVersionUpdateMissingHandler,
    kind: "MockApiDefinition",
  },
]);
