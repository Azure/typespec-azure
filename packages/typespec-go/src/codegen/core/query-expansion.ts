/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

export function isRawQueryExpansion(param: go.QueryParameter): boolean {
  return (
    (param.kind === "queryMapParam" && !param.explode) || param.queryExpansion?.explode === false
  );
}

export function preservedQueryExpansions(
  method: go.MethodType | go.NextPageMethod,
  params: Array<go.QueryParameter>,
): Array<go.QueryParameter> {
  const encoded = helpers.getMethodParamGroups(method).encodedQueryParams;
  const reinjected =
    method.kind !== "nextPageMethod" &&
    go.isPageableMethod(method) &&
    method.strategy?.kind === "nextLink"
      ? method.strategy.reinjectedParams
      : [];
  const hasReinjection = encoded.some((param) => reinjected.includes(param));
  return params.filter((param) => {
    const members = param.queryExpansion
      ? encoded.filter((member) => member.queryExpansion === param.queryExpansion)
      : [param];
    return (
      (hasReinjection && !members.some((member) => reinjected.includes(member))) ||
      !members.some(
        (member) =>
          go.isRequiredParameter(member.style) ||
          go.isLiteralParameter(member.style) ||
          go.isClientSideDefault(member.style),
      )
    );
  });
}

export function generateQueryExpansionHelpers(pkg: go.PackageContent): string {
  let required = false;
  let preserve = false;
  let map = false;
  let object = false;
  const track = (method: go.MethodType | go.NextPageMethod): void => {
    const params = helpers
      .getMethodParamGroups(method)
      .encodedQueryParams.filter(isRawQueryExpansion);
    required ||= params.length > 0;
    preserve ||= preservedQueryExpansions(method, params).length > 0;
    map ||= params.some(
      (param) => param.kind === "queryMapParam" && param.type.itemType.kind !== "ptr",
    );
    object ||= params.some((param) => param.queryExpansion?.explode === false);
  };
  for (const client of pkg.clients) {
    for (const method of client.methods) {
      track(method);
      if (
        go.isPageableMethod(method) &&
        method.strategy?.kind === "nextLink" &&
        method.strategy.method
      ) {
        track(method.strategy.method);
      }
    }
  }
  if (!required) {
    return "";
  }
  const imports = new ImportManager(pkg);
  imports.add("net/url");
  imports.add("sort");
  imports.add("strings");
  let text = helpers.contentPreamble(pkg) + imports.text();
  text += `func escapeQueryComponent(value string) string {
	return strings.ReplaceAll(url.QueryEscape(value), "+", "%20")
}

// encodeQuery combines ordinary values with expansions whose components are already escaped.
func encodeQuery(values, expansions url.Values) string {
	parts := []string{}
	for key, items := range expansions {
		values.Del(key)
		for _, item := range items {
			parts = append(parts, escapeQueryComponent(key)+"="+item)
		}
	}
	sort.Strings(parts)
	if encoded := strings.ReplaceAll(values.Encode(), "+", "%20"); encoded != "" {
		parts = append(parts, encoded)
	}
	return strings.Join(parts, "&")
}
`;
  if (object) {
    text += `
func setQueryExpansion(expansions url.Values, name string, parts ...string) {
	if len(parts) == 0 {
		return
	}
	escaped := make([]string, len(parts))
	for i, part := range parts {
		escaped[i] = escapeQueryComponent(part)
	}
	expansions.Set(name, strings.Join(escaped, ","))
}
`;
  }
  if (map) {
    text += `
func expandQueryMap[T any](values map[string]T, format func(T) string) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(values)*2)
	for _, key := range keys {
		parts = append(parts, escapeQueryComponent(key), escapeQueryComponent(format(values[key])))
	}
	return strings.Join(parts, ",")
}
`;
  }
  if (preserve) {
    text += `
// preserveQueryExpansions retains delimiters without decoding the expansion values.
func preserveQueryExpansions(rawQuery string, keys ...string) (url.Values, error) {
	values := url.Values{}
	for _, part := range strings.Split(rawQuery, "&") {
		key, value, _ := strings.Cut(part, "=")
		key, err := url.QueryUnescape(key)
		if err != nil {
			return nil, err
		}
		for _, preserved := range keys {
			if key == preserved {
				values.Add(key, value)
				break
			}
		}
	}
	return values, nil
}
`;
  }
  return text;
}
