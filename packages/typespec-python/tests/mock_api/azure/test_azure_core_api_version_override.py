# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
import pytest
from specs.azure.core.apiversionoverride import ApiVersionOverrideClient


@pytest.fixture
def client():
    with ApiVersionOverrideClient() as client:
        yield client


def test_legacy_client_get(client: ApiVersionOverrideClient):
    client.legacy_client.get()
