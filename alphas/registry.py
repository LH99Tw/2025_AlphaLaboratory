from __future__ import annotations

from typing import Dict, Iterable, Iterator, List, Optional

import pandas as pd

from .base import AlphaDataset, AlphaDefinition, AlphaExecutionError


class AlphaRegistry:
    """
    알파 정의를 위한 중앙 레지스트리.

    클로닝을 통해 공유(전역) 및 개인(사용자별) 정의를 지원합니다.
    """

    def __init__(self):
        self._definitions: Dict[str, AlphaDefinition] = {}

    def register(self, definition: AlphaDefinition, *, overwrite: bool = False):
        """알파 정의를 등록합니다."""
        if definition.name in self._definitions and not overwrite:
            raise ValueError(f"Alpha '{definition.name}' already registered")
        self._definitions[definition.name] = definition

    def extend(self, definitions: Iterable[AlphaDefinition], *, overwrite: bool = False):
        """여러 정의를 대량 등록합니다."""
        for definition in definitions:
            self.register(definition, overwrite=overwrite)

    def clone(self) -> "AlphaRegistry":
        """요청별 보강을 위한 레지스트리를 얕은 복제합니다."""
        clone = AlphaRegistry()
        clone._definitions = dict(self._definitions)
        return clone

    def __contains__(self, name: str) -> bool:
        return name in self._definitions

    def __len__(self) -> int:
        return len(self._definitions)

    def get(self, name: str) -> AlphaDefinition:
        try:
            return self._definitions[name]
        except KeyError as exc:
            raise KeyError(f"Alpha '{name}' is not registered") from exc

    def list(
        self,
        *,
        source: Optional[str] = None,
        provider: Optional[str] = None,
        owner: Optional[str] = None,
    ) -> List[AlphaDefinition]:
        """메타데이터로 필터링된 정의를 반환합니다."""
        result: List[AlphaDefinition] = []
        for definition in self._definitions.values():
            if source and definition.source != source:
                continue
            if provider and definition.provider != provider:
                continue
            if owner and definition.owner != owner:
                continue
            result.append(definition)
        return result

    def iter_definitions(self) -> Iterator[AlphaDefinition]:
        return iter(self._definitions.values())

    def compute(self, name: str, dataset: AlphaDataset) -> pd.Series:
        """알파 공식을 실행합니다."""
        definition = self.get(name)
        try:
            return definition.compute(dataset)
        except Exception as exc:
            raise AlphaExecutionError(f"Alpha '{name}' execution failed: {exc}") from exc
