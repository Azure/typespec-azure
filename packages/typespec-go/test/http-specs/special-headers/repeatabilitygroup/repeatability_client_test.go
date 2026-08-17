// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package repeatabilitygroup_test

import (
	"context"
	"testing"
	"time"

	"repeatabilitygroup"

	"github.com/stretchr/testify/require"
)

func TestRepeatabilityClientImmediateSuccess(t *testing.T) {
	client, err := repeatabilitygroup.NewRepeatabilityClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)

	resp, err := client.ImmediateSuccess(
		context.Background(),
		"2378d9bc-1726-11ee-be56-0242ac120002",
		time.Date(2022, time.November, 15, 12, 45, 26, 0, time.UTC),
		nil,
	)
	require.NoError(t, err)
	require.Equal(t, repeatabilitygroup.ImmediateSuccessResponseRepeatabilityResult("accepted"), *resp.RepeatabilityResult)
}
