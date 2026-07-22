// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package durationgroup_test

import (
	"context"
	"durationgroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestLossyClientIntSeconds(t *testing.T) {
	client, err := durationgroup.NewDurationClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDurationLossyClient().IntSeconds(context.Background(), 36, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestLossyClientIntMilliseconds(t *testing.T) {
	client, err := durationgroup.NewDurationClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	resp, err := client.NewDurationLossyClient().IntMilliseconds(context.Background(), 36250, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
