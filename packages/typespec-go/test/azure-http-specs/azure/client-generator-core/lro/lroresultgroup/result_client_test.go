// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package lroresultgroup_test

import (
	"context"
	"lroresultgroup"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/runtime"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestResultClient_BeginCreateDefault(t *testing.T) {
	client, err := lroresultgroup.NewResultClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	poller, err := client.BeginCreateDefault(context.Background(), "default", lroresultgroup.Job{
		Status: to.Ptr(lroresultgroup.JobStatusRunning),
	}, nil)
	require.NoError(t, err)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{
		Frequency: time.Second,
	})
	require.NoError(t, err)
	require.Equal(t, "default", *resp.ID)
	require.Equal(t, lroresultgroup.JobStatusSucceeded, *resp.Status)
	require.Equal(t, "completed", *resp.Result.Value)
}

func TestResultClient_BeginCreateWithClientLroResult(t *testing.T) {
	client, err := lroresultgroup.NewResultClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	poller, err := client.BeginCreateWithClientLroResult(context.Background(), "client-result", lroresultgroup.Job{
		Status: to.Ptr(lroresultgroup.JobStatusRunning),
	}, nil)
	require.NoError(t, err)

	resp, err := poller.PollUntilDone(context.Background(), &runtime.PollUntilDoneOptions{
		Frequency: time.Second,
	})
	require.NoError(t, err)
	require.Equal(t, "completed", *resp.Value)
}
