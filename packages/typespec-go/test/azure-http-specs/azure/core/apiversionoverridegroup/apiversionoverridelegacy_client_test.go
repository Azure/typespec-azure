package apiversionoverridegroup_test

import (
	"apiversionoverridegroup"
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAPIVersionOverrideLegacyClientGet(t *testing.T) {
	client, err := apiversionoverridegroup.NewAPIVersionOverrideClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.NewAPIVersionOverrideLegacyClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
