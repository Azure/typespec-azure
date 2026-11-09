# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
import pytest
import pytest_asyncio

from specs.azure.clientgenerator.core.lro.result.aio import ResultClient
from specs.azure.clientgenerator.core.lro.result.models import Job, JobResult


@pytest_asyncio.fixture
async def client():
    async with ResultClient() as client:
        yield client


@pytest.mark.asyncio
async def test_default_lro_result(client):
    poller = await client.begin_create_default(
        id="default",
        resource=Job(status="Running"),
        polling_interval=0,
    )
    result = await poller.result()

    assert result == Job(
        {
            "id": "default",
            "status": "Succeeded",
            "result": {"value": "completed"},
        }
    )


@pytest.mark.asyncio
async def test_client_lro_result(client):
    poller = await client.begin_create_with_client_lro_result(
        id="client-result",
        resource=Job(status="Running"),
        polling_interval=0,
    )
    result = await poller.result()

    assert result == JobResult(value="completed")
