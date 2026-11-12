/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import * as helpers from "./helpers.js";
import { ImportManager } from "./imports.js";

/**
 * Returns the URI-template expansion prefix and collection separator for a path parameter.
 * Accounts for the path style, explode setting, and matrix parameter names.
 */
export function getPathExpansionStyle(param: go.PathParameter): {
  prefix: string;
  separator: string;
} {
  return {
    prefix:
      param.pathStyle === "path"
        ? "/"
        : param.pathStyle === "label"
          ? "."
          : param.pathStyle === "matrix"
            ? param.kind === "pathMapParam" && param.explode
              ? ";"
              : `;${param.pathSegment}`
            : "",
    separator:
      param.kind === "pathScalarParam" || !param.explode || param.pathStyle === "simple"
        ? ","
        : param.pathStyle === "path"
          ? "/"
          : param.pathStyle === "label"
            ? "."
            : param.kind === "pathMapParam"
              ? ";"
              : `;${param.pathSegment}`,
  };
}

/** Creates the path expansion helpers used by operations in this package. */
export function generatePathExpansionHelpers(pkg: go.PackageContent): string {
  let array = false;
  let map = false;
  let matrix = false;
  const trackParameters = (method: go.MethodType | go.NextPageMethod): void => {
    for (const param of method.parameters) {
      array ||= param.kind === "pathCollectionParam";
      map ||= param.kind === "pathMapParam";
      matrix ||= go.isPathParameter(param) && param.pathStyle === "matrix";
    }
  };
  for (const client of pkg.clients) {
    for (const method of client.methods) {
      trackParameters(method);
      if (
        go.isPageableMethod(method) &&
        method.strategy?.kind === "nextLink" &&
        method.strategy.method
      ) {
        trackParameters(method.strategy.method);
      }
    }
  }
  if (!array && !map && !matrix) {
    return "";
  }

  const imports = new ImportManager(pkg);
  if (array || map) {
    imports.add("net/url");
    imports.add("strings");
  }
  if (map) {
    imports.add("sort");
  }
  let text = helpers.contentPreamble(pkg) + imports.text();
  if (matrix) {
    text += `func expandPathMatrix(prefix, value string) string {
	if value == "" {
		return prefix
	}
	return prefix + "=" + value
}

`;
  }
  if (array) {
    text += `func expandPathArray[T any](values []T, prefix, separator string, escape bool, format func(T) string) string {
	parts := make([]string, 0, len(values))
	for _, value := range values {
		part := format(value)
		if escape {
			part = url.PathEscape(part)
			if separator == "." {
				part = strings.ReplaceAll(part, ".", "%2E")
			}
		}
		parts = append(parts, part)
	}
	if len(parts) == 0 {
		return ""
	}
${
  matrix
    ? `	if strings.HasPrefix(prefix, ";") {
		if separator != "," {
			for i, part := range parts {
				parts[i] = expandPathMatrix(prefix, part)
			}
			return strings.Join(parts, "")
		}
		return expandPathMatrix(prefix, strings.Join(parts, separator))
	}
`
    : ""
}	return prefix + strings.Join(parts, separator)
}

`;
  }
  if (map) {
    text += `func expandPathMap[T any](values map[string]T, prefix, separator string, escape, explode bool, format func(T) string) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, 0, len(values))
	for _, key := range keys {
		value := format(values[key])
		if escape {
			key = url.PathEscape(key)
			value = url.PathEscape(value)
			if explode {
				key = strings.ReplaceAll(key, "=", "%3D")
			}
			if separator == "." {
				key = strings.ReplaceAll(key, ".", "%2E")
				value = strings.ReplaceAll(value, ".", "%2E")
			}
		}
		if explode {
${
  matrix
    ? `			if prefix == ";" && value == "" {
				parts = append(parts, key)
			} else {
				parts = append(parts, key + "=" + value)
			}
`
    : `			parts = append(parts, key + "=" + value)
`
}		} else {
			parts = append(parts, key, value)
		}
	}
	if len(parts) == 0 {
		return ""
	}
${
  matrix
    ? `	if strings.HasPrefix(prefix, ";") && !explode {
		return expandPathMatrix(prefix, strings.Join(parts, separator))
	}
`
    : ""
}	return prefix + strings.Join(parts, separator)
}
`;
  }
  return text;
}
