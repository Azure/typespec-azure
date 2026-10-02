// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package apiversionpathgroup_test

import (
	"context"
	"net/http"
	"testing"

	"apiversionpathgroup"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/stretchr/testify/require"
)

type captureTransport struct {
	request *http.Request
}

func (c *captureTransport) Do(request *http.Request) (*http.Response, error) {
	c.request = request
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{},
		Body:       http.NoBody,
		Request:    request,
	}, nil
}

func TestPathClient_PathAPIVersion(t *testing.T) {
	client, err := apiversionpathgroup.NewPathClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.PathAPIVersion(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestPathClient_PathAPIVersionOverride(t *testing.T) {
	const apiVersion = "2026-01-01-preview"
	transport := &captureTransport{}
	client, err := apiversionpathgroup.NewPathClientWithNoCredential(
		"http://localhost:3000",
		&apiversionpathgroup.PathClientOptions{
			ClientOptions: azcore.ClientOptions{
				APIVersion: apiVersion,
				Transport:  transport,
			},
		},
	)
	require.NoError(t, err)

	resp, err := client.PathAPIVersion(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
	require.NotNil(t, transport.request)
	require.Equal(
		t,
		"/azure/client-generator-core/api-version/path/"+apiVersion,
		transport.request.URL.Path,
	)
}
