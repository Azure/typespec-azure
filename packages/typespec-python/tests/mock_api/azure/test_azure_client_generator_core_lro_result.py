# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
import pytest

from specs.azure.clientgenerator.core.lro.result import ResultClient
from specs.azure.clientgenerator.core.lro.result.models import Job, JobResult


@pytest.fixture
def client():
    with ResultClient() as client:
        yield client


def test_default_lro_result(client):
    result = client.begin_create_default(
        id="default",
        resource=Job(status="Running"),
        polling_interval=0,
    ).result()

    assert result == Job(
        {
            "id": "default",
            "status": "Succeeded",
            "result": {"value": "completed"},
        }
    )


def test_client_lro_result(client):
    result = client.begin_create_with_client_lro_result(
        id="client-result",
        resource=Job(status="Running"),
        polling_interval=0,
    ).result()

    assert result == JobResult(value="completed")
