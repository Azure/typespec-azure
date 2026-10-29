// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"routesgroup"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type routeTransport func(*http.Request) (*http.Response, error)

func (transport routeTransport) Do(req *http.Request) (*http.Response, error) {
	return transport(req)
}

func newRoutesRequestClient(t *testing.T, path string, query url.Values) *routesgroup.RoutesClient {
	t.Helper()
	called := false
	options := &routesgroup.RoutesClientOptions{}
	options.Transport = routeTransport(func(req *http.Request) (*http.Response, error) {
		called = true
		require.Equal(t, path, req.URL.EscapedPath())
		require.Equal(t, query, req.URL.Query())
		return &http.Response{
			StatusCode: http.StatusNoContent,
			Header:     http.Header{},
			Body:       io.NopCloser(strings.NewReader("")),
			Request:    req,
		}, nil
	})
	t.Cleanup(func() { require.True(t, called, "request must reach the transport") })
	client, err := routesgroup.NewRoutesClientWithNoCredential("http://localhost:3000", options)
	require.NoError(t, err)
	return client
}

func newRoutesClient(t *testing.T) *routesgroup.RoutesClient {
	t.Helper()
	client, err := routesgroup.NewRoutesClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	return client
}

func TestRoutesFixed(t *testing.T) {
	resp, err := newRoutesClient(t).Fixed(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
