package apiversionoverridegroup_test

import (
	"apiversionoverridegroup"
	"context"
	"net/http"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/stretchr/testify/require"
)

func TestAPIVersionOverrideLegacyClientGet(t *testing.T) {
	client, err := apiversionoverridegroup.NewAPIVersionOverrideClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	var rawResponse *http.Response
	ctx := policy.WithCaptureResponse(context.Background(), &rawResponse)
	resp, err := client.NewAPIVersionOverrideLegacyClient().Get(ctx, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
	require.NotNil(t, rawResponse)
	require.Equal(t, http.StatusOK, rawResponse.StatusCode)
	require.Equal(t, "2022-10-01", rawResponse.Request.URL.Query().Get("api-version"))
}
