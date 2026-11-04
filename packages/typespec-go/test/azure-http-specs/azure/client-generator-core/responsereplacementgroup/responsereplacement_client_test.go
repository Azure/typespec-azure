// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package responsereplacementgroup_test

import (
	"context"
	"io"
	"mime"
	"net/http"
	"responsereplacementgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/stretchr/testify/require"
)

func TestResponseReplacementClient_BytesResponse(t *testing.T) {
	client, err := responsereplacementgroup.NewResponseReplacementClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.BytesResponse(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Body)
	t.Cleanup(func() {
		require.NoError(t, resp.Body.Close())
	})

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.Equal(t, []byte(`{"name":"widget"}`), body)
}

func TestResponseReplacementClient_VoidResponse(t *testing.T) {
	client, err := responsereplacementgroup.NewResponseReplacementClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	var httpResp *http.Response
	resp, err := client.VoidResponse(policy.WithCaptureResponse(context.Background(), &httpResp), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
	require.NotNil(t, httpResp)
	require.Equal(t, http.StatusOK, httpResp.StatusCode)
	mediaType, _, err := mime.ParseMediaType(httpResp.Header.Get("Content-Type"))
	require.NoError(t, err)
	require.Equal(t, "application/json", mediaType)

	body, err := runtime.Payload(httpResp)
	require.NoError(t, err)
	require.Equal(t, []byte(`{"name":"widget"}`), body)
}
