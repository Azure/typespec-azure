package streamingjsonlgroup_test

import (
	"streamingjsonlgroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestJsonlClient(t *testing.T) {
	client, err := streamingjsonlgroup.NewJsonlClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	require.NotNil(t, client.NewJsonlBasicClient())
}
