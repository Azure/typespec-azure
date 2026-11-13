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

func TestDiscriminatedNoEnvelopeCustomDiscriminatorClient(t *testing.T) {
	client := newClient(t).NewDiscriminatedNoEnvelopeClient().NewDiscriminatedNoEnvelopeCustomDiscriminatorClient()
	expected := &disriminatedgroup.PetInlineWithCustomDiscriminatorCat{
		Type: to.Ptr("cat"),
		Name: to.Ptr("Whiskers"),
		Meow: to.Ptr(true),
	}

	resp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, expected, resp.PetInlineWithCustomDiscriminatorClassification)

	cat, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedNoEnvelopeCustomDiscriminatorClientGetOptions{Type: to.Ptr("cat")})
	require.NoError(t, err)
	require.Equal(t, expected, cat.PetInlineWithCustomDiscriminatorClassification)

	dog, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedNoEnvelopeCustomDiscriminatorClientGetOptions{Type: to.Ptr("dog")})
	require.NoError(t, err)
	require.Equal(t, &disriminatedgroup.PetInlineWithCustomDiscriminatorDog{
		Type: to.Ptr("dog"),
		Name: to.Ptr("Rex"),
		Bark: to.Ptr(false),
	}, dog.PetInlineWithCustomDiscriminatorClassification)

	input := &disriminatedgroup.PetInlineWithCustomDiscriminatorCat{Name: expected.Name, Meow: expected.Meow}
	result, err := client.Put(context.Background(), input, nil)
	require.NoError(t, err)
	require.Equal(t, expected, result.PetInlineWithCustomDiscriminatorClassification)
}
