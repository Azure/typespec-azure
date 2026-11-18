// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package lrometadatapaging_test

import (
	"context"
	"fmt"
	"lrometadatapaging"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/stretchr/testify/require"
)

func TestPageableMetadataResume(t *testing.T) {
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/jobs":
			w.Header().Set("Operation-Location", server.URL+"/status")
			fmt.Fprint(w, `{}`)
		case "/status":
			fmt.Fprintf(w, `{"status":"Succeeded","progress":100,"result":{"items":[{"value":"first"}],"next":%q}}`, server.URL+"/page2")
		case "/page2":
			fmt.Fprint(w, `{"items":[{"value":"second"}]}`)
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client, err := lrometadatapaging.NewClientWithNoCredential(server.URL, nil)
	require.NoError(t, err)
	poller, err := client.BeginStart(context.Background(), nil)
	require.NoError(t, err)
	token, err := poller.ResumeToken()
	require.NoError(t, err)
	poller, err = client.BeginStart(context.Background(), &lrometadatapaging.ClientBeginStartOptions{ResumeToken: token})
	require.NoError(t, err)
	require.Nil(t, poller.StatusMetadata().Progress)
	pager, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{})
	require.NoError(t, err)
	require.EqualValues(t, 100, *poller.StatusMetadata().Progress)
	page, err := pager.NextPage(context.Background())
	require.NoError(t, err)
	require.Equal(t, "first", *page.Items[0].Value)
	page, err = pager.NextPage(context.Background())
	require.NoError(t, err)
	require.Equal(t, "second", *page.Items[0].Value)
	require.False(t, pager.More())
}
