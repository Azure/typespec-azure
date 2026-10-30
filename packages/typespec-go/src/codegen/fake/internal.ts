/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as go from "../../codemodel/index.js";
import { contentPreamble } from "../core/helpers.js";
import { ImportManager } from "../core/imports.js";

export class RequiredHelpers {
  getHeaderValue: boolean;
  getOptional: boolean;
  initServer: boolean;
  parseOptional: boolean;
  parseWithCast: boolean;
  readRequestBody: boolean;
  splitHelper: boolean;
  tracker: boolean;
  uriTemplate: boolean;

  constructor() {
    this.getHeaderValue = false;
    this.getOptional = false;
    this.initServer = false;
    this.parseOptional = false;
    this.parseWithCast = false;
    this.readRequestBody = false;
    this.splitHelper = false;
    this.tracker = false;
    this.uriTemplate = false;
  }
}

/**
 * Generates the content for the required fake helpers in fake/internal.go.
 * while exported, this isn't called outside of src/fake.
 *
 * @param pkg contains the package content
 * @param requiredHelpers contains data about the helpers to emit
 * @returns the text for the file or the empty string
 */
export function generateServerInternal(
  pkg: go.FakePackage,
  requiredHelpers: RequiredHelpers,
): string {
  if (pkg.parent.clients.length === 0) {
    return "";
  }
  const text = contentPreamble(pkg);
  const imports = new ImportManager(pkg);
  let body = alwaysUsed;
  imports.add("net/http");

  if (requiredHelpers.getHeaderValue) {
    body += emitGetHeaderValue(imports);
  }
  if (requiredHelpers.getOptional) {
    body += emitGetOptional(imports);
  }
  if (requiredHelpers.initServer) {
    body += emitInitServer(imports);
  }
  if (requiredHelpers.parseOptional) {
    body += emitParseOptional();
  }
  if (requiredHelpers.parseWithCast) {
    body += emitParseWithCast();
  }
  if (requiredHelpers.readRequestBody) {
    body += emitReadRequestBody(imports);
  }
  if (requiredHelpers.splitHelper) {
    body += emitSplitHelper(imports);
  }
  if (requiredHelpers.tracker) {
    body += emitTracker(imports);
  }
  if (requiredHelpers.uriTemplate) {
    body += emitURITemplate(imports);
  }

  return text + imports.text() + body;
}

// contains helpers that are used in all servers
const alwaysUsed = `
type result struct {
	resp *http.Response
	err error
}

type nonRetriableError struct {
	error
}

func (*nonRetriableError) NonRetriable() {
	// marker method
}
`;

function emitGetOptional(imports: ImportManager): string {
  imports.add("reflect");
  return `
func getOptional[T any](v T) *T {
	if reflect.ValueOf(v).IsZero() {
		return nil
	}

	return &v
}
`;
}

function emitURITemplate(imports: ImportManager): string {
  imports.add("fmt");
  imports.add("net/url");
  imports.add("strings");
  return `
	func splitURIPath(value, prefix, separator string) ([]string, error) {
		if value == "" {
			return nil, nil
		}
		if !strings.HasPrefix(value, prefix) {
			return nil, fmt.Errorf("invalid URI expansion %q: expected prefix %q", value, prefix)
		}
		return strings.Split(strings.TrimPrefix(value, prefix), separator), nil
	}

	func splitURIQuery(value string) []string {
		if value == "" {
			return []string{}
		}
		return strings.Split(value, ",")
	}

	func parseURIArray[T any](values []string, unescape bool, parse func(string) (T, error)) ([]T, error) {
		if values == nil {
			return nil, nil
		}
		result := make([]T, len(values))
		for i, value := range values {
			if unescape {
				var err error
				value, err = url.PathUnescape(value)
				if err != nil {
					return nil, err
				}
			}
			parsed, err := parse(value)
			if err != nil {
				return nil, err
			}
			result[i] = parsed
		}
		return result, nil
	}

	func parseURIMap[T any](values []string, explode, unescape bool, parse func(string) (T, error)) (map[string]T, error) {
		if values == nil {
			return nil, nil
		}
		pairs := values
		if explode {
			pairs = make([]string, 0, len(values)*2)
			for _, value := range values {
				key, item, ok := strings.Cut(value, "=")
				if !ok {
					return nil, fmt.Errorf("invalid URI map entry %q: expected key=value", value)
				}
				pairs = append(pairs, key, item)
			}
		}
		if len(pairs)%2 != 0 {
			return nil, fmt.Errorf("invalid URI map expansion: expected key/value pairs")
		}
		result := make(map[string]T, len(pairs)/2)
		for i := 0; i < len(pairs); i += 2 {
			key, value := pairs[i], pairs[i+1]
			if unescape {
				var err error
				key, err = url.PathUnescape(key)
				if err != nil {
					return nil, err
				}
				value, err = url.PathUnescape(value)
				if err != nil {
					return nil, err
				}
			}
			parsed, err := parse(value)
			if err != nil {
				return nil, err
			}
			result[key] = parsed
		}
		return result, nil
	}

	func parseRawURIQuery(query string) (url.Values, error) {
		result := url.Values{}
		for _, part := range strings.Split(query, "&") {
			if part == "" {
				continue
			}
			key, value, _ := strings.Cut(part, "=")
			key, err := url.QueryUnescape(key)
			if err != nil {
				return nil, err
			}
			result.Add(key, value)
		}
		return result, nil
	}

	func parseURIQueryMap[T any](value string, parse func(string) (T, error)) (map[string]T, error) {
		parts := splitURIQuery(value)
		for i, part := range parts {
			decoded, err := url.QueryUnescape(part)
			if err != nil {
				return nil, err
			}
			parts[i] = decoded
		}
		return parseURIMap(parts, false, false, parse)
	}

	func parseURIQueryObject(value string, keys []string) (url.Values, error) {
		fields := make(map[string]bool, len(keys))
		for _, key := range keys {
			fields[key] = true
		}
		values, err := parseURIQueryMap(value, func(v string) (string, error) { return v, nil })
		if err != nil {
			return nil, err
		}
		result := url.Values{}
		for key, item := range values {
			if !fields[key] {
				return nil, fmt.Errorf("invalid URI query object entry %q", key)
			}
			result.Set(key, item)
		}
		return result, nil
	}
	`;
}

function emitGetHeaderValue(imports: ImportManager): string {
  imports.add("net/http");
  return `
func getHeaderValue(h http.Header, k string) string {
	v := h[k]
	if len(v) == 0 {
		return ""
	}
	return v[0]
}
`;
}

function emitInitServer(imports: ImportManager): string {
  imports.add("sync");
  return `
func initServer[T any](mu *sync.Mutex, dst **T, src func() *T) {
	mu.Lock()
	if *dst == nil {
		*dst = src()
	}
	mu.Unlock()
}
`;
}

function emitParseOptional(): string {
  return `
func parseOptional[T any](v string, parse func(v string) (T, error)) (*T, error) {
	if v == "" {
		return nil, nil
	}
	t, err := parse(v)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
`;
}

function emitParseWithCast(): string {
  return `
func parseWithCast[T any](v string, parse func(v string) (T, error)) (T, error) {
	t, err := parse(v)
	if err != nil {
		return *new(T), err
	}
	return t, err
}
`;
}

function emitReadRequestBody(imports: ImportManager): string {
  imports.add("net/http");
  imports.add("io");
  return `
func readRequestBody(req *http.Request) ([]byte, error) {
	if req.Body == nil {
		return nil, nil
	}
	body, err := io.ReadAll(req.Body)
	if err != nil {
		return nil, err
	}
	req.Body.Close()
	return body, nil
}
`;
}

function emitSplitHelper(imports: ImportManager): string {
  imports.add("strings");
  return `
func splitHelper(s, sep string) []string {
	if s == "" {
		return nil
	}
	return strings.Split(s, sep)
}
`;
}

function emitTracker(imports: ImportManager): string {
  imports.add("net/http");
  imports.add("sync");
  imports.add("github.com/Azure/azure-sdk-for-go/sdk/azcore/fake/server");
  return `
func newTracker[T any]() *tracker[T] {
	return &tracker[T]{
		items: map[string]*T{},
	}
}

type tracker[T any] struct {
	items map[string]*T
	mu sync.Mutex
}

func (p *tracker[T]) get(req *http.Request) *T {
	p.mu.Lock()
	defer p.mu.Unlock()
	if item, ok := p.items[server.SanitizePagerPollerPath(req.URL.Path)]; ok {
		return item
	}
	return nil
}

func (p *tracker[T]) add(req *http.Request, item *T) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.items[server.SanitizePagerPollerPath(req.URL.Path)] = item
}

func (p *tracker[T]) remove(req *http.Request) {
	p.mu.Lock()
	defer p.mu.Unlock()
	delete(p.items, server.SanitizePagerPollerPath(req.URL.Path))
}
`;
}
