// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package routesgroup_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRoutesInInterface(t *testing.T) {
	resp, err := newRoutesClient(t).NewRoutesInInterfaceClient().Fixed(context.Background(), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
