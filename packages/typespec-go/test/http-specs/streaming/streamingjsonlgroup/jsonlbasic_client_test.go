package streamingjsonlgroup_test

import (
	"bufio"
	"context"
	"streamingjsonlgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestJsonlBasicClientReceive(t *testing.T) {
	client, err := streamingjsonlgroup.NewJsonlClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.NewJsonlBasicClient().Receive(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, to.Ptr("application/jsonl"), resp.ContentType)
	require.NotNil(t, resp.Body)
	t.Cleanup(func() { require.NoError(t, resp.Body.Close()) })
	scanner := bufio.NewScanner(resp.Body)
	for _, description := range []string{"one", "two", "three"} {
		require.True(t, scanner.Scan())
		require.JSONEq(t, `{"desc":"`+description+`"}`, scanner.Text())
	}
	require.False(t, scanner.Scan())
	require.NoError(t, scanner.Err())
}

func TestJsonlBasicClientSend(t *testing.T) {
	t.Skip("JSONL request bodies are Base64-encoded: https://github.com/Azure/typespec-azure/issues/4934")

	client, err := streamingjsonlgroup.NewJsonlClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.NewJsonlBasicClient().Send(context.Background(), streamingjsonlgroup.JsonlStreamInfo{
		Body: []byte("{\"desc\": \"one\"}\n{\"desc\": \"two\"}\n{\"desc\": \"three\"}"),
	}, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
