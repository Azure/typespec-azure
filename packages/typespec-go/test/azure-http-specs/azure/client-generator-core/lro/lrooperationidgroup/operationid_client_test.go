// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package lrooperationidgroup_test

import (
	"context"
	"lrooperationidgroup"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/stretchr/testify/require"
)

func newOperationIDClient(t *testing.T) *lrooperationidgroup.OperationIDClient {
	client, err := lrooperationidgroup.NewOperationIDClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	return client
}

func requireOperationID(t *testing.T, expected string, id string, ok bool) {
	t.Helper()
	require.True(t, ok)
	require.Equal(t, expected, id)
}

func TestOperationIDClient_BeginAnalyze(t *testing.T) {
	client := newOperationIDClient(t)
	poller, err := client.BeginAnalyze(context.Background(), "document-1", nil)
	require.NoError(t, err)
	// available from the polling URL before the first poll
	id, ok := poller.OperationID()
	requireOperationID(t, "analysis-123", id, ok)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	require.NoError(t, err)
	require.Equal(t, "The document contains three sections.", *resp.Summary)
	id, ok = poller.OperationID()
	requireOperationID(t, "analysis-123", id, ok)
}

func TestOperationIDClient_BeginAnalyze_ResumeToken(t *testing.T) {
	client := newOperationIDClient(t)
	poller, err := client.BeginAnalyze(context.Background(), "document-1", nil)
	require.NoError(t, err)
	token, err := poller.ResumeToken()
	require.NoError(t, err)

	poller, err = client.BeginAnalyze(context.Background(), "document-1", &lrooperationidgroup.OperationIDClientBeginAnalyzeOptions{ResumeToken: token})
	require.NoError(t, err)
	// the polling URL is persisted in the resume token
	id, ok := poller.OperationID()
	requireOperationID(t, "analysis-123", id, ok)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	require.NoError(t, err)
	require.Equal(t, "The document contains three sections.", *resp.Summary)
}

func TestOperationIDClient_BeginStartTranslation(t *testing.T) {
	client := newOperationIDClient(t)
	poller, err := client.BeginStartTranslation(context.Background(), nil)
	require.NoError(t, err)
	// only available from the status monitor body
	_, ok := poller.OperationID()
	require.False(t, ok)

	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	id, ok := poller.OperationID()
	requireOperationID(t, "translation-123", id, ok)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	require.NoError(t, err)
	require.EqualValues(t, 42, *resp.TranslatedCharacters)
	id, ok = poller.OperationID()
	requireOperationID(t, "translation-123", id, ok)
}

func TestOperationIDClient_BeginStartTranslationWithPath(t *testing.T) {
	// the mock server's Express route for translations:start also matches translations:start-with-path,
	// so this request receives the startTranslation polling URL that doesn't contain the operation ID.
	t.Skip("blocked on the azure-http-specs mock routing for translations:start-with-path")
	client := newOperationIDClient(t)
	poller, err := client.BeginStartTranslationWithPath(context.Background(), nil)
	require.NoError(t, err)
	id, ok := poller.OperationID()
	requireOperationID(t, "translation-456", id, ok)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	require.NoError(t, err)
	require.EqualValues(t, 84, *resp.TranslatedCharacters)
	id, ok = poller.OperationID()
	requireOperationID(t, "translation-456", id, ok)
}
