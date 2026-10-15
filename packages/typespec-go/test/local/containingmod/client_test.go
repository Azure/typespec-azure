// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package containingmod_test

import (
	"containingmod/v2"
	"containingmod/v2/subpkg"
	"containingmod/v2/subpkg/fake"
	"context"
	"net/http"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	azfake "github.com/Azure/azure-sdk-for-go/sdk/azcore/fake"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestSubpkgFakeServerClientGet(t *testing.T) {
	const expected int32 = 42

	transport := fake.NewContainingModServerTransport(&fake.ContainingModServer{
		Get: func(_ context.Context, _ *subpkg.ContainingModClientGetOptions) (resp azfake.Responder[subpkg.ContainingModClientGetResponse], errResp azfake.ErrorResponder) {
			resp.SetResponse(http.StatusOK, subpkg.ContainingModClientGetResponse{
				Widget: subpkg.Widget{ID: to.Ptr(expected)},
			}, nil)
			return
		},
	})

	azClient, err := containingmod.Parent(&azcore.ClientOptions{Transport: transport})
	require.NoError(t, err)

	client := subpkg.NewContainingModClient("https://fake.endpoint", azClient)

	resp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.ID)
	require.Equal(t, expected, *resp.ID)
}
