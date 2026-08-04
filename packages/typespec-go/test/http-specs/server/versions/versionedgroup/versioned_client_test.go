// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package versionedgroup_test

import (
	"context"
	"net/http"
	"testing"
	"versionedgroup"

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

func TestVersionedClient_WithPathAPIVersion(t *testing.T) {
	client, err := versionedgroup.NewVersionedClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.WithPathAPIVersion(context.Background(), nil)
	require.NoError(t, err)
	require.True(t, resp.Success)
}

func TestVersionedClient_WithPathAPIVersionOverride(t *testing.T) {
	const apiVersion = "2023-01-01-preview"
	transport := &captureTransport{}
	client, err := versionedgroup.NewVersionedClientWithNoCredential("http://localhost:3000", &versionedgroup.VersionedClientOptions{
		ClientOptions: azcore.ClientOptions{
			APIVersion: apiVersion,
			Transport:  transport,
		},
	})
	require.NoError(t, err)

	resp, err := client.WithPathAPIVersion(context.Background(), nil)
	require.NoError(t, err)
	require.True(t, resp.Success)
	require.Equal(t, "/server/versions/versioned/with-path-api-version/"+apiVersion, transport.request.URL.Path)
}

func TestVersionedClient_WithQueryAPIVersion(t *testing.T) {
	client, err := versionedgroup.NewVersionedClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.WithQueryAPIVersion(context.Background(), nil)
	require.NoError(t, err)
	require.True(t, resp.Success)
}

func TestVersionedClient_WithQueryOldAPIVersion(t *testing.T) {
	client, err := versionedgroup.NewVersionedClientWithNoCredential("http://localhost:3000", &versionedgroup.VersionedClientOptions{
		azcore.ClientOptions{
			APIVersion: "2021-01-01-preview",
		},
	})
	require.NoError(t, err)
	resp, err := client.WithQueryOldAPIVersion(context.Background(), nil)
	require.NoError(t, err)
	require.True(t, resp.Success)
}

func TestVersionedClient_WithoutAPIVersion(t *testing.T) {
	client, err := versionedgroup.NewVersionedClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.WithoutAPIVersion(context.Background(), nil)
	require.NoError(t, err)
	require.True(t, resp.Success)
}
