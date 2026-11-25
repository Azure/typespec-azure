// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package lroresultgroup_test

import (
	"context"
	"lroresultgroup"
	"lroresultgroup/fake"
	"net/http"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
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

func TestResultClient_BeginCreateWithClientLroResultFake(t *testing.T) {
	srv := fake.ResultServer{
		BeginCreateWithClientLroResult: func(ctx context.Context, id string, resource lroresultgroup.Job, options *lroresultgroup.ResultClientBeginCreateWithClientLroResultOptions) (resp azfake.PollerResponder[lroresultgroup.ResultClientCreateWithClientLroResultResponse], errResp azfake.ErrorResponder) {
			resp.SetTerminalResponse(http.StatusOK, lroresultgroup.ResultClientCreateWithClientLroResultResponse{
				JobResult: lroresultgroup.JobResult{
					Value: to.Ptr("completed"),
				},
			}, nil)
			return
		},
	}
	client, err := lroresultgroup.NewResultClientWithNoCredential("http://localhost:3000", &lroresultgroup.ResultClientOptions{
		ClientOptions: azcore.ClientOptions{
			Transport: fake.NewResultServerTransport(&srv),
		},
	})
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
