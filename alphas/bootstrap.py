from __future__ import annotations

from typing import Optional

from .registry import AlphaRegistry
from .store import AlphaStore
from .providers import register_worldquant101


def build_shared_registry(alpha_store: Optional[AlphaStore] = None) -> AlphaRegistry:
    """
    WorldQuant 공식과 지속된 공유 사용자 정의 알파로 미리 채워진
    공유 레지스트리를 생성합니다.
    """
    registry = AlphaRegistry()
    register_worldquant101(registry)

    if alpha_store:
        registry.extend(alpha_store.load_shared_definitions(), overwrite=True)

    return registry
