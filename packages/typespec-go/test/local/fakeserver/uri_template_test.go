// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package fakeserver_test

import (
	"context"
	"fakeserver"
	"fakeserver/fake"
	"net/http"
	"reflect"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestURITemplateFakeRoundTrip(t *testing.T) {
	array := []string{"a/b", "a,b", "%20", "a+b = c", ""}
	record := map[string]int32{"a/b": 0, "a,b": -2, "%20": 3}
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
		{"QueryMap", []any{map[string]int32{"a/b": 0, "%20": -2}, nil}},
		{"QueryExplodedMap", []any{record, nil}},
		{"OptionalQueryMap", []any{nil}},
		{"OptionalQueryMap", []any{&fakeserver.ClientOptionalQueryMapOptions{Value: map[string]int32{}}}},
		{"QueryObject", []any{fakeserver.QueryFields{Field: "a & b%20"}, &fakeserver.ClientQueryObjectOptions{
			Count: to.Ptr[int32](0), Values: []string{}, Enabled: to.Ptr(false),
		}}},
		{"QueryObject", []any{fakeserver.QueryFields{}, nil}},
		{"QueryObject", []any{fakeserver.QueryFields{}, &fakeserver.ClientQueryObjectOptions{
			Values: []string{"a", "b", "c"},
		}}},
		{"QueryExplodedObject", []any{fakeserver.QueryFields{}, &fakeserver.ClientQueryExplodedObjectOptions{
			Count: to.Ptr[int32](0), Values: []string{}, Enabled: to.Ptr(false),
		}}},
		{"OptionalQueryObject", []any{nil}},
		{"OptionalQueryObject", []any{&fakeserver.ClientOptionalQueryObjectOptions{
			Field: to.Ptr(""), Count: to.Ptr[int32](0), Values: []string{},
		}}},
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
