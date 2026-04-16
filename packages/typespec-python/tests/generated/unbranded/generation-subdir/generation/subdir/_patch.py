# coding=utf-8

"""Customize generated code here.

Follow our quickstart for examples: https://aka.ms/azsdk/python/dpcodegen/python/customize
"""
from ._generated import RecursiveClient
from ._generated.models import Extension


class CustomizedClient(RecursiveClient):
    def customized_get(self):
        return self.get()


__all__: list[str] = [
    "CustomizedClient",
    "Extension",
]


def patch_sdk():
    """Do not remove from this file.

    `patch_sdk` is a last resort escape hatch that allows you to do customizations
    you can't accomplish using the techniques described in
    https://aka.ms/azsdk/python/dpcodegen/python/customize
    """
