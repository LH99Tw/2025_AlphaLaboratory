from __future__ import annotations

import inspect
from typing import List

from backend_module.Alphas import Alphas as WorldQuantAlphas

from ..base import AlphaDefinition, AlphaDataset
from ..registry import AlphaRegistry


def _collect_method_names() -> List[str]:
    methods = []
    for name, member in inspect.getmembers(WorldQuantAlphas, predicate=inspect.isfunction):
        if name.startswith("alpha"):
            methods.append(name)
    return sorted(methods)


def register_worldquant101(registry: AlphaRegistry):
    """
    제공된 레지스트리에 클래식 WorldQuant 101 알파 공식을 등록합니다.
    """

    def make_compute(method_name: str):
        def _compute(dataset: AlphaDataset):
            engine = dataset.worldquant_engine()
            method = getattr(engine, method_name)
            return method()

        return _compute

    definitions = [
        AlphaDefinition(
            name=method_name,
            compute=make_compute(method_name),
            source="shared",
            provider="worldquant101",
            description="WorldQuant 101 alpha formula",
            metadata={
                "origin": "backend_module.Alphas",
                "method": method_name,
            },
        )
        for method_name in _collect_method_names()
    ]

    registry.extend(definitions, overwrite=True)
