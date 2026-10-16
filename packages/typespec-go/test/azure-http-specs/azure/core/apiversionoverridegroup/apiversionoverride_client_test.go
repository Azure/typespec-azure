package apiversionoverridegroup_test

import (
	"apiversionoverridegroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAPIVersionOverrideClient(t *testing.T) {
	client, err := apiversionoverridegroup.NewAPIVersionOverrideClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	require.NotNil(t, client.NewAPIVersionOverrideLegacyClient())
}
