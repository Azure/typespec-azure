// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package booleangroup_test

import (
	"booleangroup"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBooleanClient(t *testing.T) {
	client, err := booleangroup.NewBooleanClientWithNoCredential("http://localhost:3000", nil)
	require.NoError(t, err)
	require.NotNil(t, client.NewBooleanPropertyClient())
}
