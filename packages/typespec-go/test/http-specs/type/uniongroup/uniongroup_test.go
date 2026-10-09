// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package uniongroup_test

import (
	"context"
	"testing"
	"uniongroup"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

const endpoint = "http://localhost:3000"

func newClient(t *testing.T) *uniongroup.UnionClient {
	client, err := uniongroup.NewUnionClientWithNoCredential(endpoint, nil)
	require.NoError(t, err)
	return client
}

func TestUnionStringsOnlyClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionStringsOnlyClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, uniongroup.GetResponsePropB, *resp.Prop)
}

func TestUnionStringsOnlyClient_Send(t *testing.T) {
	resp, err := newClient(t).NewUnionStringsOnlyClient().Send(context.Background(), uniongroup.GetResponsePropB, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionStringExtensibleClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionStringExtensibleClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, uniongroup.GetResponseProp1("custom"), *resp.Prop)
}

func TestUnionStringExtensibleClient_Send(t *testing.T) {
	resp, err := newClient(t).NewUnionStringExtensibleClient().Send(context.Background(), uniongroup.GetResponseProp1("custom"), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionStringExtensibleNamedClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionStringExtensibleNamedClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, uniongroup.StringExtensibleNamedUnion("custom"), *resp.Prop)
}

func TestUnionStringExtensibleNamedClient_Send(t *testing.T) {
	resp, err := newClient(t).NewUnionStringExtensibleNamedClient().Send(context.Background(), uniongroup.StringExtensibleNamedUnion("custom"), nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionIntsOnlyClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionIntsOnlyClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, uniongroup.GetResponseProp22, *resp.Prop)
}

func TestUnionIntsOnlyClient_Send(t *testing.T) {
	resp, err := newClient(t).NewUnionIntsOnlyClient().Send(context.Background(), uniongroup.GetResponseProp22, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionFloatsOnlyClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionFloatsOnlyClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, uniongroup.GetResponseProp322, *resp.Prop)
}

func TestUnionFloatsOnlyClient_Send(t *testing.T) {
	resp, err := newClient(t).NewUnionFloatsOnlyClient().Send(context.Background(), uniongroup.GetResponseProp322, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionModelsOnlyClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionModelsOnlyClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.NotNil(t, resp.Prop.Cat)
	require.Equal(t, "test", *resp.Prop.Cat.Name)
}

func TestUnionModelsOnlyClient_Send(t *testing.T) {
	prop := uniongroup.GetResponseProp4{
		Cat: &uniongroup.Cat{Name: to.Ptr("test")},
	}
	resp, err := newClient(t).NewUnionModelsOnlyClient().Send(context.Background(), prop, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionEnumsOnlyClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionEnumsOnlyClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.Equal(t, uniongroup.EnumsOnlyCasesLrRight, *resp.Prop.Lr)
	require.Equal(t, uniongroup.EnumsOnlyCasesUdUp, *resp.Prop.Ud)
}

func TestUnionEnumsOnlyClient_Send(t *testing.T) {
	prop := uniongroup.EnumsOnlyCases{
		Lr: to.Ptr(uniongroup.EnumsOnlyCasesLrRight),
		Ud: to.Ptr(uniongroup.EnumsOnlyCasesUdUp),
	}
	resp, err := newClient(t).NewUnionEnumsOnlyClient().Send(context.Background(), prop, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionStringAndArrayClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionStringAndArrayClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.NotNil(t, resp.Prop.String)
	require.Equal(t, "test", *resp.Prop.String.String)
	require.NotNil(t, resp.Prop.Array)
	require.Equal(t, []string{"test1", "test2"}, resp.Prop.Array.SliceOfString)
}

func TestUnionStringAndArrayClient_Send(t *testing.T) {
	prop := uniongroup.StringAndArrayCases{
		String: &uniongroup.StringAndArrayCasesString{String: to.Ptr("test")},
		Array:  &uniongroup.StringAndArrayCasesArray{SliceOfString: []string{"test1", "test2"}},
	}
	resp, err := newClient(t).NewUnionStringAndArrayClient().Send(context.Background(), prop, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionMixedLiteralsClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionMixedLiteralsClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.NotNil(t, resp.Prop.StringLiteral)
	require.Equal(t, "a", *resp.Prop.StringLiteral.LiteralString)
	require.NotNil(t, resp.Prop.IntLiteral)
	require.Equal(t, int32(2), *resp.Prop.IntLiteral.LiteralInt32)
	require.NotNil(t, resp.Prop.FloatLiteral)
	require.Equal(t, float32(3.3), *resp.Prop.FloatLiteral.LiteralFloat32)
	require.NotNil(t, resp.Prop.BooleanLiteral)
	require.Equal(t, true, *resp.Prop.BooleanLiteral.LiteralBool)
}

func TestUnionMixedLiteralsClient_Send(t *testing.T) {
	prop := uniongroup.MixedLiteralsCases{
		StringLiteral:  &uniongroup.MixedLiteralsCasesStringLiteral{LiteralString: to.Ptr("a")},
		IntLiteral:     &uniongroup.MixedLiteralsCasesStringLiteral{LiteralInt32: to.Ptr[int32](2)},
		FloatLiteral:   &uniongroup.MixedLiteralsCasesStringLiteral{LiteralFloat32: to.Ptr[float32](3.3)},
		BooleanLiteral: &uniongroup.MixedLiteralsCasesStringLiteral{LiteralBool: to.Ptr(true)},
	}
	resp, err := newClient(t).NewUnionMixedLiteralsClient().Send(context.Background(), prop, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}

func TestUnionMixedTypesClient_Get(t *testing.T) {
	resp, err := newClient(t).NewUnionMixedTypesClient().Get(context.Background(), nil)
	require.NoError(t, err)
	require.NotNil(t, resp.Prop)
	require.NotNil(t, resp.Prop.Model)
	require.NotNil(t, resp.Prop.Model.Cat)
	require.Equal(t, "test", *resp.Prop.Model.Cat.Name)
	require.NotNil(t, resp.Prop.Literal)
	require.Equal(t, "a", *resp.Prop.Literal.LiteralString)
	require.NotNil(t, resp.Prop.Int)
	require.Equal(t, int32(2), *resp.Prop.Int.Int32)
	require.NotNil(t, resp.Prop.Boolean)
	require.Equal(t, true, *resp.Prop.Boolean.Bool)
	require.Len(t, resp.Prop.Array, 4)
	require.NotNil(t, resp.Prop.Array[0].Cat)
	require.Equal(t, "test", *resp.Prop.Array[0].Cat.Name)
	require.Equal(t, "a", *resp.Prop.Array[1].LiteralString)
	require.Equal(t, int32(2), *resp.Prop.Array[2].Int32)
	require.Equal(t, true, *resp.Prop.Array[3].Bool)
}

func TestUnionMixedTypesClient_Send(t *testing.T) {
	prop := uniongroup.MixedTypesCases{
		Model:   &uniongroup.MixedTypesCasesModel{Cat: &uniongroup.Cat{Name: to.Ptr("test")}},
		Literal: &uniongroup.MixedTypesCasesModel{LiteralString: to.Ptr("a")},
		Int:     &uniongroup.MixedTypesCasesModel{Int32: to.Ptr[int32](2)},
		Boolean: &uniongroup.MixedTypesCasesModel{Bool: to.Ptr(true)},
		Array: []uniongroup.MixedTypesCasesModel{
			{Cat: &uniongroup.Cat{Name: to.Ptr("test")}},
			{LiteralString: to.Ptr("a")},
			{Int32: to.Ptr[int32](2)},
			{Bool: to.Ptr(true)},
		},
	}
	resp, err := newClient(t).NewUnionMixedTypesClient().Send(context.Background(), prop, nil)
	require.NoError(t, err)
	require.Zero(t, resp)
}
