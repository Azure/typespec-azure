// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

package addlpropsgroup_test

import (
	"addlpropsgroup"
	"context"
	"testing"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/to"
	"github.com/stretchr/testify/require"
)

const testEndpoint = "http://localhost:3000"

func newRootClient(t *testing.T) *addlpropsgroup.AdditionalPropertiesClient {
	client, err := addlpropsgroup.NewAdditionalPropertiesClientWithNoCredential(testEndpoint, nil)
	require.NoError(t, err)
	return client
}

func modelOK() *addlpropsgroup.ModelForRecord {
	return &addlpropsgroup.ModelForRecord{State: to.Ptr("ok")}
}

func modelArrayOK() []*addlpropsgroup.ModelForRecord {
	return []*addlpropsgroup.ModelForRecord{modelOK(), modelOK()}
}

func unknownProps() map[string]any {
	return map[string]any{"prop1": float64(32), "prop2": true, "prop3": "abc"}
}

// Extends

func TestAdditionalPropertiesExtendsFloatClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsFloatClient()
	body := addlpropsgroup.ExtendsFloatAdditionalProperties{
		ID:                   to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*float32{"prop": to.Ptr[float32](43.125)},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.ExtendsFloatAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsModelClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsModelClient()
	body := addlpropsgroup.ExtendsModelAdditionalProperties{
		KnownProp:            modelOK(),
		AdditionalProperties: map[string]*addlpropsgroup.ModelForRecord{"prop": modelOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.ExtendsModelAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsModelArrayClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsModelArrayClient()
	body := addlpropsgroup.ExtendsModelArrayAdditionalProperties{
		KnownProp:            modelArrayOK(),
		AdditionalProperties: map[string][]*addlpropsgroup.ModelForRecord{"prop": modelArrayOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.ExtendsModelArrayAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsStringClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsStringClient()
	body := addlpropsgroup.ExtendsStringAdditionalProperties{
		Name:                 to.Ptr("ExtendsStringAdditionalProperties"),
		AdditionalProperties: map[string]*string{"prop": to.Ptr("abc")},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.ExtendsStringAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsUnknownClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsUnknownClient()
	body := addlpropsgroup.ExtendsUnknownAdditionalProperties{
		Name:                 to.Ptr("ExtendsUnknownAdditionalProperties"),
		AdditionalProperties: unknownProps(),
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.ExtendsUnknownAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsUnknownDerivedClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsUnknownDerivedClient()
	body := addlpropsgroup.ExtendsUnknownAdditionalPropertiesDerived{
		Name:                 to.Ptr("ExtendsUnknownAdditionalProperties"),
		Index:                to.Ptr[int32](314),
		Age:                  to.Ptr[float32](2.71875),
		AdditionalProperties: unknownProps(),
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.ExtendsUnknownAdditionalPropertiesDerived)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsUnknownDiscriminatedClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsUnknownDiscriminatedClient()
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	derived, ok := getResp.ExtendsUnknownAdditionalPropertiesDiscriminatedClassification.(*addlpropsgroup.ExtendsUnknownAdditionalPropertiesDiscriminatedDerived)
	require.True(t, ok)
	require.Equal(t, to.Ptr("Derived"), derived.Name)
	require.Equal(t, to.Ptr[int32](314), derived.Index)
	require.Equal(t, to.Ptr[float32](2.71875), derived.Age)
	require.Equal(t, unknownProps(), derived.AdditionalProperties)

	body := &addlpropsgroup.ExtendsUnknownAdditionalPropertiesDiscriminatedDerived{
		Kind:                 to.Ptr("derived"),
		Name:                 to.Ptr("Derived"),
		Index:                to.Ptr[int32](314),
		Age:                  to.Ptr[float32](2.71875),
		AdditionalProperties: unknownProps(),
	}
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

// Is

func TestAdditionalPropertiesIsFloatClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesIsFloatClient()
	body := addlpropsgroup.IsFloatAdditionalProperties{
		ID:                   to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*float32{"prop": to.Ptr[float32](43.125)},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.IsFloatAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesIsModelClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesIsModelClient()
	body := addlpropsgroup.IsModelAdditionalProperties{
		KnownProp:            modelOK(),
		AdditionalProperties: map[string]*addlpropsgroup.ModelForRecord{"prop": modelOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.IsModelAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesIsModelArrayClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesIsModelArrayClient()
	body := addlpropsgroup.IsModelArrayAdditionalProperties{
		KnownProp:            modelArrayOK(),
		AdditionalProperties: map[string][]*addlpropsgroup.ModelForRecord{"prop": modelArrayOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.IsModelArrayAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesIsStringClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesIsStringClient()
	body := addlpropsgroup.IsStringAdditionalProperties{
		Name:                 to.Ptr("IsStringAdditionalProperties"),
		AdditionalProperties: map[string]*string{"prop": to.Ptr("abc")},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.IsStringAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesIsUnknownClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesIsUnknownClient()
	body := addlpropsgroup.IsUnknownAdditionalProperties{
		Name:                 to.Ptr("IsUnknownAdditionalProperties"),
		AdditionalProperties: unknownProps(),
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.IsUnknownAdditionalProperties)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesIsUnknownDerivedClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesIsUnknownDerivedClient()
	body := addlpropsgroup.IsUnknownAdditionalPropertiesDerived{
		Name:                 to.Ptr("IsUnknownAdditionalProperties"),
		Index:                to.Ptr[int32](314),
		Age:                  to.Ptr[float32](2.71875),
		AdditionalProperties: unknownProps(),
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.IsUnknownAdditionalPropertiesDerived)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesIsUnknownDiscriminatedClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesIsUnknownDiscriminatedClient()
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	derived, ok := getResp.IsUnknownAdditionalPropertiesDiscriminatedClassification.(*addlpropsgroup.IsUnknownAdditionalPropertiesDiscriminatedDerived)
	require.True(t, ok)
	require.Equal(t, to.Ptr("Derived"), derived.Name)
	require.Equal(t, to.Ptr[int32](314), derived.Index)
	require.Equal(t, to.Ptr[float32](2.71875), derived.Age)
	require.Equal(t, unknownProps(), derived.AdditionalProperties)

	body := &addlpropsgroup.IsUnknownAdditionalPropertiesDiscriminatedDerived{
		Kind:                 to.Ptr("derived"),
		Name:                 to.Ptr("Derived"),
		Index:                to.Ptr[int32](314),
		Age:                  to.Ptr[float32](2.71875),
		AdditionalProperties: unknownProps(),
	}
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

// Spread (same known property type)

func TestAdditionalPropertiesSpreadStringClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadStringClient()
	body := addlpropsgroup.SpreadStringRecord{
		Name:                 to.Ptr("SpreadSpringRecord"),
		AdditionalProperties: map[string]*string{"prop": to.Ptr("abc")},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadStringRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadFloatClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadFloatClient()
	body := addlpropsgroup.SpreadFloatRecord{
		ID:                   to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*float32{"prop": to.Ptr[float32](43.125)},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadFloatRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadModelClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadModelClient()
	body := addlpropsgroup.SpreadModelRecord{
		KnownProp:            modelOK(),
		AdditionalProperties: map[string]*addlpropsgroup.ModelForRecord{"prop": modelOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadModelRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadModelArrayClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadModelArrayClient()
	body := addlpropsgroup.SpreadModelArrayRecord{
		KnownProp:            modelArrayOK(),
		AdditionalProperties: map[string][]*addlpropsgroup.ModelForRecord{"prop": modelArrayOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadModelArrayRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

// Spread (different known property type)

func TestAdditionalPropertiesSpreadDifferentStringClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadDifferentStringClient()
	body := addlpropsgroup.DifferentSpreadStringRecord{
		ID:                   to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*string{"prop": to.Ptr("abc")},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadStringRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadDifferentFloatClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadDifferentFloatClient()
	body := addlpropsgroup.DifferentSpreadFloatRecord{
		Name:                 to.Ptr("abc"),
		AdditionalProperties: map[string]*float32{"prop": to.Ptr[float32](43.125)},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadFloatRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadDifferentModelClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadDifferentModelClient()
	body := addlpropsgroup.DifferentSpreadModelRecord{
		KnownProp:            to.Ptr("abc"),
		AdditionalProperties: map[string]*addlpropsgroup.ModelForRecord{"prop": modelOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadModelRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadDifferentModelArrayClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadDifferentModelArrayClient()
	body := addlpropsgroup.DifferentSpreadModelArrayRecord{
		KnownProp:            to.Ptr("abc"),
		AdditionalProperties: map[string][]*addlpropsgroup.ModelForRecord{"prop": modelArrayOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadModelArrayRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

// Extends model that spreads a different known property type

func TestAdditionalPropertiesExtendsDifferentSpreadStringClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsDifferentSpreadStringClient()
	body := addlpropsgroup.DifferentSpreadStringDerived{
		ID:                   to.Ptr[float32](43.125),
		DerivedProp:          to.Ptr("abc"),
		AdditionalProperties: map[string]*string{"prop": to.Ptr("abc")},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadStringDerived)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsDifferentSpreadFloatClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsDifferentSpreadFloatClient()
	body := addlpropsgroup.DifferentSpreadFloatDerived{
		Name:                 to.Ptr("abc"),
		DerivedProp:          to.Ptr[float32](43.125),
		AdditionalProperties: map[string]*float32{"prop": to.Ptr[float32](43.125)},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadFloatDerived)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsDifferentSpreadModelClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsDifferentSpreadModelClient()
	body := addlpropsgroup.DifferentSpreadModelDerived{
		KnownProp:            to.Ptr("abc"),
		DerivedProp:          modelOK(),
		AdditionalProperties: map[string]*addlpropsgroup.ModelForRecord{"prop": modelOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadModelDerived)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesExtendsDifferentSpreadModelArrayClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesExtendsDifferentSpreadModelArrayClient()
	body := addlpropsgroup.DifferentSpreadModelArrayDerived{
		KnownProp:            to.Ptr("abc"),
		DerivedProp:          modelArrayOK(),
		AdditionalProperties: map[string][]*addlpropsgroup.ModelForRecord{"prop": modelArrayOK()},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.DifferentSpreadModelArrayDerived)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

// Multiple spread / unions

func TestAdditionalPropertiesMultipleSpreadClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesMultipleSpreadClient()
	body := addlpropsgroup.MultipleSpreadRecord{
		Flag: to.Ptr(true),
		AdditionalProperties: map[string]*addlpropsgroup.MultipleSpreadRecordAdditionalProperty{
			"prop1": {String: to.Ptr("abc")},
			"prop2": {Float32: to.Ptr[float32](43.125)},
		},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.MultipleSpreadRecord)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadRecordUnionClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadRecordUnionClient()
	body := addlpropsgroup.SpreadRecordForUnion{
		Flag: to.Ptr(true),
		AdditionalProperties: map[string]*addlpropsgroup.SpreadRecordForUnionAdditionalProperty{
			"prop1": {String: to.Ptr("abc")},
			"prop2": {Float32: to.Ptr[float32](43.125)},
		},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadRecordForUnion)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadRecordNonDiscriminatedUnionClient(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadRecordNonDiscriminatedUnionClient()
	start := time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2021, 1, 2, 0, 0, 0, 0, time.UTC)
	body := addlpropsgroup.SpreadRecordForNonDiscriminatedUnion{
		Name: to.Ptr("abc"),
		AdditionalProperties: map[string]*addlpropsgroup.SpreadRecordForNonDiscriminatedUnionAdditionalProperty{
			"prop1": {WidgetData0: &addlpropsgroup.WidgetData0{Kind: to.Ptr("kind0"), FooProp: to.Ptr("abc")}},
			"prop2": {WidgetData1: &addlpropsgroup.WidgetData1{Kind: to.Ptr("kind1"), Start: to.Ptr(start), End: to.Ptr(end)}},
		},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadRecordForNonDiscriminatedUnion)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadRecordNonDiscriminatedUnion2Client(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadRecordNonDiscriminatedUnion2Client()
	start := time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2021, 1, 2, 0, 0, 0, 0, time.UTC)
	body := addlpropsgroup.SpreadRecordForNonDiscriminatedUnion2{
		Name: to.Ptr("abc"),
		AdditionalProperties: map[string]*addlpropsgroup.SpreadRecordForNonDiscriminatedUnion2AdditionalProperty{
			"prop1": {WidgetData2: &addlpropsgroup.WidgetData2{Kind: to.Ptr("kind1"), Start: to.Ptr("2021-01-01T00:00:00Z")}},
			"prop2": {WidgetData1: &addlpropsgroup.WidgetData1{Kind: to.Ptr("kind1"), Start: to.Ptr(start), End: to.Ptr(end)}},
		},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadRecordForNonDiscriminatedUnion2)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}

func TestAdditionalPropertiesSpreadRecordNonDiscriminatedUnion3Client(t *testing.T) {
	client := newRootClient(t).NewAdditionalPropertiesSpreadRecordNonDiscriminatedUnion3Client()
	start := time.Date(2021, 1, 1, 0, 0, 0, 0, time.UTC)
	end := time.Date(2021, 1, 2, 0, 0, 0, 0, time.UTC)
	body := addlpropsgroup.SpreadRecordForNonDiscriminatedUnion3{
		Name: to.Ptr("abc"),
		AdditionalProperties: map[string]*addlpropsgroup.SpreadRecordForNonDiscriminatedUnion3AdditionalProperty{
			"prop1": {SliceOfWidgetData2: []*addlpropsgroup.WidgetData2{
				{Kind: to.Ptr("kind1"), Start: to.Ptr("2021-01-01T00:00:00Z")},
				{Kind: to.Ptr("kind1"), Start: to.Ptr("2021-01-01T00:00:00Z")},
			}},
			"prop2": {WidgetData1: &addlpropsgroup.WidgetData1{Kind: to.Ptr("kind1"), Start: to.Ptr(start), End: to.Ptr(end)}},
		},
	}
	getResp, err := client.Get(context.Background(), nil)
	require.NoError(t, err)
	require.Equal(t, body, getResp.SpreadRecordForNonDiscriminatedUnion3)
	_, err = client.Put(context.Background(), body, nil)
	require.NoError(t, err)
}
