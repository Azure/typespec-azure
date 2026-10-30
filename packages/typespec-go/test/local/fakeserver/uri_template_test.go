// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package fakeserver_test

import (
	"context"
	"fakeserver"
	"fakeserver/fake"
	"io"
	"net/http"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

type uriTemplateTransport func(*http.Request) (*http.Response, error)

func (transport uriTemplateTransport) Do(req *http.Request) (*http.Response, error) {
	return transport(req)
}

func TestURITemplateQueryPreservesExistingExpansions(t *testing.T) {
	for _, tt := range []struct {
		method string
		args   []any
		query  string
	}{
		{"OptionalQueryMap", []any{nil}, "value=a%2Cb,1&fixed=a%2Bb%20c"},
		{"OptionalQueryMap", []any{&fakeserver.ClientOptionalQueryMapOptions{
			Value: map[string]int32{"new,key": 2},
		}}, "value=new%2Ckey,2&fixed=a%2Bb%20c"},
		{"OptionalQueryObject", []any{nil}, "value=a%2Cb,1&fixed=a%2Bb%20c"},
		{"OptionalQueryObject", []any{&fakeserver.ClientOptionalQueryObjectOptions{
			Field: to.Ptr("a,b"),
		}}, "value=field,a%2Cb&fixed=a%2Bb%20c"},
		{"BytesMap", []any{map[string][]byte{"new,key": {1}}, nil},
			"value=new%2Ckey,AQ&fixed=a%2Bb%20c"},
	} {
		t.Run(tt.method, func(t *testing.T) {
			called := false
			client, err := fakeserver.NewClientWithNoCredential(
				"https://fake.endpoint?value=a%2Cb,1&fixed=a%2Bb%20c",
				&fakeserver.ClientOptions{ClientOptions: policy.ClientOptions{
					Transport: uriTemplateTransport(func(req *http.Request) (*http.Response, error) {
						called = true
						require.Equal(t, tt.query, req.URL.RawQuery)
						return &http.Response{
							StatusCode: http.StatusNoContent,
							Header:     http.Header{},
							Body:       io.NopCloser(strings.NewReader("")),
							Request:    req,
						}, nil
					}),
				}},
			)
			require.NoError(t, err)
			method := reflect.ValueOf(client).MethodByName(tt.method)
			args := []reflect.Value{reflect.ValueOf(context.Background())}
			for i, arg := range tt.args {
				if arg == nil {
					args = append(args, reflect.Zero(method.Type().In(i+1)))
				} else {
					args = append(args, reflect.ValueOf(arg))
				}
			}
			result := method.Call(args)
			require.True(t, result[1].IsNil(), "request failed: %v", result[1])
			require.True(t, called)
		})
	}
}

func TestURITemplateQueryPreservesNextLinkExpansion(t *testing.T) {
	for _, tt := range []struct {
		name     string
		nextLink string
		query    string
	}{
		{"absolute", "https://fake.endpoint/uri/query-paged-map?value=next%2Ckey,2", "value=next%2Ckey,2&includePending=true"},
		{"relative", "/uri/query-paged-map?value=next%2Ckey,2", "value=next%2Ckey,2&includePending=true"},
		{"no-query", "https://fake.endpoint/uri/query-paged-map", "includePending=true"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			requests := 0
			client, err := fakeserver.NewClientWithNoCredential("https://fake.endpoint",
				&fakeserver.ClientOptions{ClientOptions: policy.ClientOptions{
					Transport: uriTemplateTransport(func(req *http.Request) (*http.Response, error) {
						var body string
						switch requests {
						case 0:
							require.Equal(t, "value=first%2Ckey,1&includePending=true", req.URL.RawQuery)
							body = `{"items":["first"],"nextLink":"` + tt.nextLink + `"}`
						case 1:
							require.Equal(t, tt.query, req.URL.RawQuery)
							body = `{"items":["second"]}`
						default:
							t.Fatal("unexpected page request")
						}
						requests++
						return &http.Response{
							StatusCode: http.StatusOK,
							Header:     http.Header{"Content-Type": {"application/json"}},
							Body:       io.NopCloser(strings.NewReader(body)),
							Request:    req,
						}, nil
					}),
				}},
			)
			require.NoError(t, err)
			pager := client.NewQueryPagedMapPager(true, map[string]int32{"first,key": 1}, nil)
			for pager.More() {
				_, err = pager.NextPage(context.Background())
				require.NoError(t, err)
			}
			require.Equal(t, 2, requests)
		})
	}
}

func TestURITemplateFakeRoundTrip(t *testing.T) {
	array := []string{"a/b", "a,b", "%20", "a+b = c", "", "a.b"}
	record := map[string]int32{"a/b": 0, "a,b": -2, "%20": 3, "a=b": 4, "a.b": 5, "a+b c": 6, "%2C": 7}
	date := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	tests := []struct {
		method string
		args   []any
	}{
		{"SimpleArray", []any{array, nil}},
		{"SimpleMap", []any{record, nil}},
		{"SimpleExplodedMap", []any{record, nil}},
		{"PathArray", []any{array, nil}},
		{"PathExplodedArray", []any{array[:4], nil}},
		{"PathExplodedMap", []any{record, nil}},
		{"LabelArray", []any{array, nil}},
		{"LabelExplodedArray", []any{array, nil}},
		{"LabelExplodedMap", []any{record, nil}},
		{"MatrixArray", []any{array, nil}},
		{"MatrixExplodedArray", []any{array, nil}},
		{"MatrixMap", []any{record, nil}},
		{"MatrixExplodedMap", []any{record, nil}},
		{"LabelScalar", []any{"a/b %20", nil}},
		{"MatrixScalar", []any{int32(42), nil}},
		{"PathScalar", []any{"a/b %20", nil}},
		{"TypedArray", []any{[]int32{0, -2, 3}, nil}},
		{"TimeArray", []any{[]time.Time{date}, nil}},
		{"EnumArray", []any{[]fakeserver.IntEnum{fakeserver.IntEnumOne, fakeserver.IntEnumTwo}, nil}},
		{"BoolMap", []any{map[string]bool{"a": false, "b": true}, nil}},
		{"QueryMap", []any{record, nil}},
		{"QueryExplodedMap", []any{record, nil}},
		{"OptionalQueryMap", []any{nil}},
		{"OptionalQueryMap", []any{&fakeserver.ClientOptionalQueryMapOptions{Value: map[string]int32{}}}},
		{"QueryObject", []any{fakeserver.QueryFields{Field: "a & b%20"}, &fakeserver.ClientQueryObjectOptions{
			Count: to.Ptr[int32](0), Enabled: to.Ptr(false),
		}}},
		{"QueryObject", []any{fakeserver.QueryFields{}, nil}},
		{"QueryObject", []any{fakeserver.QueryFields{Field: "a,count,1"}, nil}},
		{"QueryExplodedObject", []any{fakeserver.QueryFields{}, &fakeserver.ClientQueryExplodedObjectOptions{
			Count: to.Ptr[int32](0), Enabled: to.Ptr(false),
		}}},
		{"OptionalQueryObject", []any{nil}},
		{"OptionalQueryObject", []any{&fakeserver.ClientOptionalQueryObjectOptions{
			Field: to.Ptr(""), Count: to.Ptr[int32](0),
		}}},
		{"QueryGroups", []any{"path-name", "raw-values", "query-key",
			fakeserver.RequiredQueryFields{Name: "name,parts", Parts: "first,count,1"},
			fakeserver.RequiredQueryFields{Name: "second-name", Parts: "a,b"}, nil,
		}},
		{"QueryOptionCollisions", []any{&fakeserver.ClientQueryOptionCollisionsOptions{
			FirstCountParam: to.Ptr[int32](0), SecondCount: to.Ptr[int32](2),
			Count: to.Ptr[int32](3), FirstCount: to.Ptr[int32](4),
		}}},
		{"QueryOptionCollisions", []any{nil}},
		{"SpreadMaps", []any{
			map[string]*int32{"null": nil, "value": to.Ptr[int32](1)},
			map[string]*int32{"value": to.Ptr[int32](2)},
			[]int32{0, 3},
			map[string]map[string]*int32{"nested": {"null": nil, "value": to.Ptr[int32](4)}},
			nil,
		}},
		{"BytesObject", []any{fakeserver.BytesQueryFields{Value: []byte{0xfb}}, nil}},
		{"BytesMap", []any{map[string][]byte{"a,b": {0xfb, 0xff}}, nil}},
		{"BytesArray", []any{[][]byte{{0xfb}, {0xfb, 0xff}, {0xfb, 0xff, 0xff}}, nil}},
		{"BytesScalar", []any{[]byte{0xfb}, nil}},
	}
	for _, tt := range tests {
		t.Run(tt.method, func(t *testing.T) {
			srv := &fake.Server{}
			client, err := fakeserver.NewClientWithNoCredential("https://fake.endpoint", &fakeserver.ClientOptions{
				ClientOptions: policy.ClientOptions{Transport: fake.NewServerTransport(srv)},
			})
			require.NoError(t, err)
			method := reflect.ValueOf(client).MethodByName(tt.method)
			callback := reflect.ValueOf(srv).Elem().FieldByName(tt.method)
			var received []any
			// Each generated operation has its own response/options types.
			callback.Set(reflect.MakeFunc(callback.Type(), func(args []reflect.Value) []reflect.Value {
				for _, arg := range args[1:] {
					if arg.Kind() == reflect.Pointer && arg.IsNil() {
						received = append(received, nil)
					} else {
						received = append(received, arg.Interface())
					}
				}
				responder := reflect.New(callback.Type().Out(0))
				setResponse := responder.MethodByName("SetResponse")
				setResponse.Call([]reflect.Value{
					reflect.ValueOf(http.StatusNoContent),
					reflect.Zero(method.Type().Out(0)),
					reflect.Zero(setResponse.Type().In(2)),
				})
				return []reflect.Value{responder.Elem(), reflect.Zero(callback.Type().Out(1))}
			}))
			args := []reflect.Value{reflect.ValueOf(context.Background())}
			for i, arg := range tt.args {
				if arg == nil {
					args = append(args, reflect.Zero(method.Type().In(i+1)))
				} else {
					args = append(args, reflect.ValueOf(arg))
				}
			}
			result := method.Call(args)
			require.True(t, result[1].IsNil(), "request failed: %v", result[1])
			require.Equal(t, tt.args, received)
		})
	}
}

func TestURITemplateFakeRejectsMalformedMap(t *testing.T) {
	called := false
	srv := &fake.Server{}
	callback := reflect.ValueOf(srv).Elem().FieldByName("SimpleMap")
	callback.Set(reflect.MakeFunc(callback.Type(), func([]reflect.Value) []reflect.Value {
		called = true
		return []reflect.Value{reflect.Zero(callback.Type().Out(0)), reflect.Zero(callback.Type().Out(1))}
	}))
	transport := fake.NewServerTransport(srv)
	for _, path := range []string{"key", "key,not-an-int", "key,2147483648"} {
		req, err := http.NewRequest(http.MethodGet, "https://fake.endpoint/uri/simple-map/"+path, nil)
		require.NoError(t, err)
		req = req.WithContext(context.WithValue(context.Background(), runtime.CtxAPINameKey{}, "Client.SimpleMap"))
		_, err = transport.Do(req)
		require.Error(t, err)
		require.False(t, called)
	}
}

func TestURITemplateFakeRejectsMalformedQuery(t *testing.T) {
	for _, tt := range []struct {
		method string
		path   string
		query  string
	}{
		{"QueryMap", "/uri/query-map", "value=key"},
		{"QueryMap", "/uri/query-map", "value=key,not-an-int"},
		{"QueryMap", "/uri/query-map", "value=a%ZZ,1"},
		{"QueryMap", "/uri/query-map", "%ZZ=key,1"},
		{"QueryObject", "/uri/query-object", "value=field"},
		{"QueryObject", "/uri/query-object", "value=field,a,unknown,b"},
		{"QueryObject", "/uri/query-object", "value=field,a%ZZ"},
		{"BytesObject", "/uri/bytes-object", "value=value,a"},
	} {
		t.Run(tt.method+"/"+tt.query, func(t *testing.T) {
			called := false
			srv := &fake.Server{}
			callback := reflect.ValueOf(srv).Elem().FieldByName(tt.method)
			callback.Set(reflect.MakeFunc(callback.Type(), func([]reflect.Value) []reflect.Value {
				called = true
				return []reflect.Value{reflect.Zero(callback.Type().Out(0)), reflect.Zero(callback.Type().Out(1))}
			}))
			req, err := http.NewRequest(http.MethodGet, "https://fake.endpoint"+tt.path+"?"+tt.query, nil)
			require.NoError(t, err)
			req = req.WithContext(context.WithValue(context.Background(), runtime.CtxAPINameKey{}, "Client."+tt.method))
			_, err = fake.NewServerTransport(srv).Do(req)
			require.Error(t, err)
			require.False(t, called)
		})
	}
}
