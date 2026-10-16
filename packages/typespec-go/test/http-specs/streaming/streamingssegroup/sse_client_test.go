package streamingssegroup_test

import (
	"io"
	"mime"
	"streamingssegroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSseClient(t *testing.T) {
	client, err := streamingssegroup.NewSseClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	require.NotNil(t, client.NewSseNamedClient())
	require.NotNil(t, client.NewSseUnnamedClient())
	require.NotNil(t, client.NewSseRetrieveClient())
	require.NotNil(t, client.NewSseProtocolClient())
}

func requireSseStream(t *testing.T, body io.ReadCloser, contentType *string, expected string) {
	t.Helper()
	require.NotNil(t, body)
	t.Cleanup(func() { require.NoError(t, body.Close()) })
	require.NotNil(t, contentType)
	mediaType, _, err := mime.ParseMediaType(*contentType)
	require.NoError(t, err)
	require.Equal(t, "text/event-stream", mediaType)
	actual, err := io.ReadAll(body)
	require.NoError(t, err)
	require.Equal(t, expected, string(actual))
}
