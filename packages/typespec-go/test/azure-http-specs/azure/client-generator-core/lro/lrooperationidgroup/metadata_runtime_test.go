// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package lrooperationidgroup_test

import (
	"context"
	"fmt"
	"lrooperationidgroup"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/stretchr/testify/require"
)

func TestOperationIDPathBodyAndStandardResumeToken(t *testing.T) {
	const path = "/azure/client-generator-core/lro/operation-id/translations/operations/path%2Fid"
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodPost {
			w.Header().Set("Operation-Location", server.URL+path+"?api-version=2022-12-01-preview")
			w.WriteHeader(http.StatusAccepted)
			return
		}
		if r.URL.EscapedPath() != path || r.URL.RawQuery != "api-version=2022-12-01-preview" {
			http.Error(w, "unexpected polling URL", http.StatusBadRequest)
			return
		}
		fmt.Fprint(w, `{"status":"Running","id":"body-id"}`)
	}))
	defer server.Close()

	client, err := lrooperationidgroup.NewOperationIDClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	poller, err := client.BeginStartTranslationWithPath(context.Background(), nil)
	require.NoError(t, err)
	id, ok := poller.OperationID()
	requireOperationID(t, "path/id", id, ok)

	// Tokens issued by the wrapper can be consumed by an ordinary azcore poller,
	// and tokens from an ordinary poller can be consumed by the wrapper.
	token, err := poller.ResumeToken()
	require.NoError(t, err)
	pl := runtime.NewPipeline("test", "1.0.0", runtime.PipelineOptions{}, nil)
	standard, err := runtime.NewPollerFromResumeToken[lrooperationidgroup.OperationIDClientStartTranslationWithPathResponse](token, pl, nil)
	require.NoError(t, err)
	oldToken, err := standard.ResumeToken()
	require.NoError(t, err)
	resumed, err := client.BeginStartTranslationWithPath(context.Background(), &lrooperationidgroup.OperationIDClientBeginStartTranslationWithPathOptions{ResumeToken: oldToken})
	require.NoError(t, err)
	_, ok = resumed.OperationID()
	require.False(t, ok)
	_, err = resumed.Poll(context.Background())
	require.NoError(t, err)
	id, ok = resumed.OperationID()
	requireOperationID(t, "body-id", id, ok)

	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	id, ok = poller.OperationID()
	requireOperationID(t, "body-id", id, ok)
}

func TestOperationIDConcurrentRead(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodPost {
			w.Header().Set("Operation-Location", server.URL+"/azure/client-generator-core/lro/operation-id/translations/operations/path-id")
			w.WriteHeader(http.StatusAccepted)
			return
		}
		fmt.Fprint(w, `{"status":"Running","id":"body-id"}`)
	}))
	defer server.Close()
	client, err := lrooperationidgroup.NewOperationIDClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	poller, err := client.BeginStartTranslationWithPath(context.Background(), nil)
	require.NoError(t, err)
	done := make(chan error, 1)
	go func() {
		for i := 0; i < 50; i++ {
			if _, err := poller.Poll(context.Background()); err != nil {
				done <- err
				return
			}
		}
		done <- nil
	}()
	for {
		select {
		case err := <-done:
			require.NoError(t, err)
			return
		default:
			poller.OperationID()
		}
	}
}
