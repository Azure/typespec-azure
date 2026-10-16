package streamingssegroup_test

import (
	"context"
	"streamingssegroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSseUnnamedClientReceive(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewSseUnnamedClient().Receive(context.Background(), nil)
	require.NoError(t, err)
	requireSseStream(t, resp.Body, resp.ContentType,
		"data: {\"desc\": \"one\"}\n\ndata: {\"desc\": \"two\"}\n\ndata: {\"desc\": \"three\"}\n\n")
}
