// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package azkeys_test

import (
	"azkeys"
	"azkeys/fake"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/stretchr/testify/require"
)

func TestFakeBackupKey(t *testing.T) {
	const fakeKeyName = "fakeKey"
	fakeKeyBlob := []byte{1, 2, 3}
	server := fake.Server{
		BackupKey: func(ctx context.Context, keyName string, options *azkeys.BackupKeyOptions) (resp azfake.Responder[azkeys.BackupKeyResponse], errResp azfake.ErrorResponder) {
			if keyName != fakeKeyName {
				errResp.SetError(fmt.Errorf("bad fake key name %s", keyName))
				return
			}
			resp.SetResponse(http.StatusOK, azkeys.BackupKeyResponse{
				BackupKeyResult: azkeys.BackupKeyResult{
					Value: fakeKeyBlob,
				},
			}, nil)
			return
		},
	}

	client, err := azkeys.NewClient("https://fake.vault.azure.net", &azcore.ClientOptions{
		Transport: fake.NewServerTransport(&server),
	})
	require.NoError(t, err)

	resp, err := client.BackupKey(context.Background(), fakeKeyName, nil)
	require.NoError(t, err)
	testSerde(t, &resp)
	require.Equal(t, fakeKeyBlob, resp.Value)
}

func TestFakeServerTransportPathParameterRegex(t *testing.T) {
	t.Run("AcceptsPathSegmentCharacters", func(t *testing.T) {
		const fakeKeyName = "azAZ09._~%!$&'()*+,;=:@-"
		const escapedPath = "/keys/azAZ09._~%25!$&'()*+,;=:@-/backup"
		server := fake.Server{
			BackupKey: func(_ context.Context, keyName string, _ *azkeys.BackupKeyOptions) (resp azfake.Responder[azkeys.BackupKeyResponse], errResp azfake.ErrorResponder) {
				if keyName != fakeKeyName {
					errResp.SetError(fmt.Errorf("bad fake key name %s", keyName))
					return
				}
				resp.SetResponse(http.StatusOK, azkeys.BackupKeyResponse{}, nil)
				return
			},
		}

		transport := fake.NewServerTransport(&server)

		// Call transport.Do() directly to avoid the client escaping the key name.
		ctx := context.WithValue(context.Background(), runtime.CtxAPINameKey{}, "Client.BackupKey")
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://fake.vault.azure.net"+escapedPath, nil)
		require.NoError(t, err)
		require.Equal(t, escapedPath, req.URL.EscapedPath())

		resp, err := transport.Do(req)
		require.NoError(t, err)
		require.NoError(t, resp.Body.Close())
	})

	t.Run("RejectsPathDelimiter", func(t *testing.T) {
		const escapedPath = "/keys/key/name/backup"
		var called bool
		server := fake.Server{
			BackupKey: func(_ context.Context, _ string, _ *azkeys.BackupKeyOptions) (resp azfake.Responder[azkeys.BackupKeyResponse], errResp azfake.ErrorResponder) {
				called = true
				resp.SetResponse(http.StatusOK, azkeys.BackupKeyResponse{}, nil)
				return
			},
		}

		transport := fake.NewServerTransport(&server)

		// Call transport.Do() directly to avoid the client escaping the key name.
		ctx := context.WithValue(context.Background(), runtime.CtxAPINameKey{}, "Client.BackupKey")
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://fake.vault.azure.net"+escapedPath, nil)
		require.NoError(t, err)
		require.Equal(t, escapedPath, req.URL.EscapedPath())

		resp, err := transport.Do(req)
		require.ErrorContains(t, err, "failed to parse path")
		require.Nil(t, resp)
		require.False(t, called)
	})
}

type serdeModel interface {
	json.Marshaler
	json.Unmarshaler
}

func testSerde[T serdeModel](t *testing.T, model T) {
	data, err := model.MarshalJSON()
	require.NoError(t, err)
	err = model.UnmarshalJSON(data)
	require.NoError(t, err)

	// testing unmarshal error scenarios
	err = model.UnmarshalJSON(nil)
	require.Error(t, err)

	m := regexp.MustCompile(":.*$")
	modifiedData := m.ReplaceAllString(string(data), `:["test", "test1", "test2"]}`)
	if modifiedData != "{}" {
		data3 := []byte(modifiedData)
		err = model.UnmarshalJSON(data3)
		require.Error(t, err)
	}
}
