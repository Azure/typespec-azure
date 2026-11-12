// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package lrometadatagroup_test

import (
	"context"
	"lrometadatagroup"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func newMetadataClient(t *testing.T) *lrometadatagroup.MetadataClient {
	client, err := lrometadatagroup.NewMetadataClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	return client
}

func TestMetadataClient_BeginAnalyzeWithUsage(t *testing.T) {
	client := newMetadataClient(t)
	poller, err := client.BeginAnalyzeWithUsage(context.Background(), "analyzer-1", nil)
	require.NoError(t, err)
	// no status monitor response has been received yet
	require.Nil(t, poller.StatusMetadata().Usage)

	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	require.False(t, poller.Done())
	require.Equal(t, &lrometadatagroup.UsageDetails{
		DocumentPagesBasic: to.Ptr[int32](1),
		Tokens:             map[string]*int32{"input": to.Ptr[int32](10)},
	}, poller.StatusMetadata().Usage)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	require.NoError(t, err)
	require.Equal(t, "The document contains three sections.", *resp.Contents)
	require.Equal(t, &lrometadatagroup.UsageDetails{
		DocumentPagesBasic: to.Ptr[int32](1),
		Tokens:             map[string]*int32{"input": to.Ptr[int32](10), "output": to.Ptr[int32](4)},
	}, poller.StatusMetadata().Usage)
}

func TestMetadataClient_BeginAnalyzeJob(t *testing.T) {
	client := newMetadataClient(t)
	poller, err := client.BeginAnalyzeJob(context.Background(), nil)
	require.NoError(t, err)
	// the initial response is a status monitor
	metadata := poller.StatusMetadata()
	require.Equal(t, "job-success", *metadata.JobID)
	require.Equal(t, "Analyze documents", *metadata.DisplayName)
	require.Equal(t, time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC), *metadata.CreatedDateTime)
	require.Equal(t, time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC), *metadata.LastUpdatedDateTime)
	require.Nil(t, metadata.Statistics)
	require.Nil(t, metadata.Errors)

	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	metadata = poller.StatusMetadata()
	require.Equal(t, time.Date(2025, 1, 1, 10, 1, 0, 0, time.UTC), *metadata.LastUpdatedDateTime)
	require.Equal(t, &lrometadatagroup.JobStatistics{Total: to.Ptr[int32](3), Succeeded: to.Ptr[int32](1), Failed: to.Ptr[int32](0)}, metadata.Statistics)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	require.NoError(t, err)
	require.Equal(t, to.SliceOfPtrs("document-1", "document-2", "document-3"), resp.Documents)
	metadata = poller.StatusMetadata()
	require.Equal(t, time.Date(2025, 1, 1, 10, 2, 0, 0, time.UTC), *metadata.LastUpdatedDateTime)
	require.Equal(t, &lrometadatagroup.JobStatistics{Total: to.Ptr[int32](3), Succeeded: to.Ptr[int32](3), Failed: to.Ptr[int32](0)}, metadata.Statistics)
	require.Empty(t, metadata.Errors)
}

func TestMetadataClient_BeginAnalyzeJobWithFailure(t *testing.T) {
	client := newMetadataClient(t)
	poller, err := client.BeginAnalyzeJobWithFailure(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, "job-failure", *poller.StatusMetadata().JobID)

	_, err = poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	var respErr *azcore.ResponseError
	require.ErrorAs(t, err, &respErr)
	// status metadata from the failed status monitor response is still available
	metadata := poller.StatusMetadata()
	require.Equal(t, &lrometadatagroup.JobStatistics{Total: to.Ptr[int32](3), Succeeded: to.Ptr[int32](1), Failed: to.Ptr[int32](2)}, metadata.Statistics)
	require.Equal(t, []*lrometadatagroup.JobItemError{
		{Code: to.Ptr("InvalidDocument"), Message: to.Ptr("Document is empty."), Target: to.Ptr("document-2")},
		{Code: to.Ptr("InvalidDocument"), Message: to.Ptr("Document is unreadable."), Target: to.Ptr("document-3")},
	}, metadata.Errors)
}

func TestMetadataClient_BeginAnalyzeJob_ResumeToken(t *testing.T) {
	client := newMetadataClient(t)
	poller, err := client.BeginAnalyzeJob(context.Background(), nil)
	require.NoError(t, err)
	token, err := poller.ResumeToken()
	require.NoError(t, err)

	poller, err = client.BeginAnalyzeJob(context.Background(), &lrometadatagroup.MetadataClientBeginAnalyzeJobOptions{ResumeToken: token})
	require.NoError(t, err)
	// status metadata isn't persisted in the resume token
	require.Nil(t, poller.StatusMetadata().JobID)

	_, err = poller.Poll(context.Background())
	require.NoError(t, err)
	metadata := poller.StatusMetadata()
	require.Equal(t, "job-success", *metadata.JobID)
	require.Equal(t, &lrometadatagroup.JobStatistics{Total: to.Ptr[int32](3), Succeeded: to.Ptr[int32](1), Failed: to.Ptr[int32](0)}, metadata.Statistics)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{Frequency: time.Second})
	require.NoError(t, err)
	require.Len(t, resp.Documents, 3)
	require.Equal(t, &lrometadatagroup.JobStatistics{Total: to.Ptr[int32](3), Succeeded: to.Ptr[int32](3), Failed: to.Ptr[int32](0)}, poller.StatusMetadata().Statistics)
}
