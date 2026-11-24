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

func TestDiscriminatedEnvelopeObjectDefaultClient(t *testing.T) {
	client := newClient(t).NewDiscriminatedEnvelopeClient().NewDiscriminatedEnvelopeObjectClient().NewDiscriminatedEnvelopeObjectDefaultClient()
	expected := &disriminatedgroup.PetWithEnvelopeCat{
		Kind:  to.Ptr("cat"),
		Value: &disriminatedgroup.Cat{Name: to.Ptr("Whiskers"), Meow: to.Ptr(true)},
	}

	resp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, expected, resp.PetWithEnvelopeClassification)

	cat, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedEnvelopeObjectDefaultClientGetOptions{Kind: to.Ptr("cat")})
	require.NoError(t, err)
	require.Equal(t, expected, cat.PetWithEnvelopeClassification)

	dog, err := client.Get(context.Background(), &disriminatedgroup.DiscriminatedEnvelopeObjectDefaultClientGetOptions{Kind: to.Ptr("dog")})
	require.NoError(t, err)
	require.Equal(t, &disriminatedgroup.PetWithEnvelopeDog{
		Kind:  to.Ptr("dog"),
		Value: &disriminatedgroup.Dog{Name: to.Ptr("Rex"), Bark: to.Ptr(false)},
	}, dog.PetWithEnvelopeClassification)

	input := &disriminatedgroup.PetWithEnvelopeCat{Value: expected.Value}
	result, err := client.Put(context.Background(), input, nil)
	require.NoError(t, err)
	require.Equal(t, expected, result.PetWithEnvelopeClassification)
}
