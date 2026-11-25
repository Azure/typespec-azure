// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package disriminatedgroup_test

import (
	"context"
	"disriminatedgroup"
	"testing"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

func TestDiscriminatedNoEnvelopeDefaultClient(t *testing.T) {
	client := newClient(t).NewDiscriminatedNoEnvelopeClient().NewDiscriminatedNoEnvelopeDefaultClient()
	expected := &disriminatedgroup.PetInlineCat{
		Kind: to.Ptr("cat"),
		Name: to.Ptr("Whiskers"),
		Meow: to.Ptr(true),
	}

	resp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, expected, resp.PetInlineClassification)

	cat, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedNoEnvelopeDefaultClientGetOptions{Kind: to.Ptr("cat")})
	require.NoError(t, err)
	require.Equal(t, expected, cat.PetInlineClassification)

	dog, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedNoEnvelopeDefaultClientGetOptions{Kind: to.Ptr("dog")})
	require.NoError(t, err)
	require.Equal(t, &disriminatedgroup.PetInlineDog{
		Kind: to.Ptr("dog"),
		Name: to.Ptr("Rex"),
		Bark: to.Ptr(false),
	}, dog.PetInlineClassification)

	input := &disriminatedgroup.PetInlineCat{Name: expected.Name, Meow: expected.Meow}
	result, err := client.Put(context.Background(), input, nil)
	require.NoError(t, err)
	require.Equal(t, expected, result.PetInlineClassification)
}
