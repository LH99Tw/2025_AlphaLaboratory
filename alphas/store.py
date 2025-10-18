from __future__ import annotations

import json
import os
import secrets
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from .base import AlphaDefinition
from .transpiler import TranspiledAlpha, compile_expression


def _utc_now() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


@dataclass
class StoredAlpha:
    """지속된 알파 사양."""

    id: str
    name: str
    expression: str
    source: str
    provider: str
    owner: Optional[str]
    created_at: str
    updated_at: str
    description: str = ""
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, payload: Dict[str, Any], *, source: str, owner: Optional[str]) -> "StoredAlpha":
        expression = payload.get("expression") or payload.get("alpha_expression")
        if not expression:
            raise ValueError("Alpha expression is required")
        return cls(
            id=payload.get("id") or payload.get("alpha_id") or cls._generate_id(),
            name=payload.get("name") or payload.get("alpha_name") or payload.get("id"),
            expression=expression,
            source=source,
            provider=payload.get("provider", "shared-library" if source == "shared" else "user-defined"),
            owner=owner,
            created_at=payload.get("created_at") or _utc_now(),
            updated_at=payload.get("updated_at") or payload.get("created_at") or _utc_now(),
            description=payload.get("description", ""),
            tags=list(payload.get("tags", [])),
            metadata=dict(payload.get("metadata", {})),
        )

    @staticmethod
    def _generate_id() -> str:
        return f"alpha_{int(datetime.utcnow().timestamp())}_{secrets.token_hex(4)}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "expression": self.expression,
            "source": self.source,
            "provider": self.provider,
            "owner": self.owner,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "description": self.description,
            "tags": self.tags,
            "metadata": self.metadata,
        }

    def to_definition(self) -> AlphaDefinition:
        transpiled: TranspiledAlpha = compile_expression(self.expression, name=self.name)
        metadata = {
            **self.metadata,
            "id": self.id,
            "expression": self.expression,
            "transpiler_version": transpiled.version,
            "python_source": transpiled.python_source,
        }
        return AlphaDefinition(
            name=self.name,
            compute=transpiled.callable,
            source=self.source,
            provider=self.provider,
            owner=self.owner,
            description=self.description,
            tags=self.tags,
            metadata=metadata,
        )


class AlphaStore:
    """공유 및 개인 범위를 지원하는 파일시스템 기반 알파 저장소."""

    def __init__(self, root_dir: str, legacy_user_file: Optional[str] = None):
        self.root_dir = root_dir
        self.shared_file = os.path.join(root_dir, "shared.json")
        self.private_dir = os.path.join(root_dir, "private")
        self.legacy_user_file = legacy_user_file
        self._migration_marker = os.path.join(root_dir, ".migration_done")

        os.makedirs(self.root_dir, exist_ok=True)
        os.makedirs(self.private_dir, exist_ok=True)

        if not os.path.exists(self.shared_file):
            self._write_json(self.shared_file, {"alphas": []})

        if legacy_user_file:
            self._maybe_migrate_legacy()

    # ------------------------------------------------------------------ #
    # 파일 입출력 헬퍼
    # ------------------------------------------------------------------ #
    def _read_json(self, path: str, default: Dict[str, Any]) -> Dict[str, Any]:
        try:
            with open(path, "r", encoding="utf-8") as handle:
                return json.load(handle)
        except FileNotFoundError:
            return default
        except json.JSONDecodeError:
            return default

    def _write_json(self, path: str, payload: Dict[str, Any]):
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)

    def _maybe_migrate_legacy(self):
        if os.path.exists(self._migration_marker):
            return
        if not self.legacy_user_file or not os.path.exists(self.legacy_user_file):
            return

        legacy_data = self._read_json(self.legacy_user_file, {"users": []})
        migrated_any = False

        for entry in legacy_data.get("users", []):
            username = entry.get("username")
            if not username:
                continue
            private_path = self._private_path(username)
            if os.path.exists(private_path):
                continue  # already has data
            alphas = entry.get("alphas", [])
            if not alphas:
                continue
            stored = [
                StoredAlpha.from_dict(alpha, source="private", owner=username).to_dict()
                for alpha in alphas
            ]
            self._write_json(private_path, {"alphas": stored})
            migrated_any = True

        if migrated_any:
            with open(self._migration_marker, "w", encoding="utf-8") as marker:
                marker.write(_utc_now())

    def _private_path(self, username: str) -> str:
        sanitized = username.replace("/", "_")
        return os.path.join(self.private_dir, f"{sanitized}.json")

    # ------------------------------------------------------------------ #
    # 공유 작업
    # ------------------------------------------------------------------ #
    def list_shared(self) -> List[StoredAlpha]:
        data = self._read_json(self.shared_file, {"alphas": []})
        return [
            StoredAlpha.from_dict(item, source="shared", owner=None)
            for item in data.get("alphas", [])
        ]

    def upsert_shared(self, records: Iterable[Dict[str, Any]]):
        entries = [stored.to_dict() for stored in self.list_shared()]
        name_to_index = {entry["name"]: idx for idx, entry in enumerate(entries)}

        for record in records:
            stored = StoredAlpha.from_dict(record, source="shared", owner=None)
            stored.updated_at = _utc_now()
            if stored.name in name_to_index:
                entries[name_to_index[stored.name]].update(stored.to_dict())
            else:
                entries.append(stored.to_dict())

        self._write_json(self.shared_file, {"alphas": entries})

    # ------------------------------------------------------------------ #
    # 개인 작업
    # ------------------------------------------------------------------ #
    def list_private(self, username: str) -> List[StoredAlpha]:
        data = self._read_json(self._private_path(username), {"alphas": []})
        return [
            StoredAlpha.from_dict(item, source="private", owner=username)
            for item in data.get("alphas", [])
        ]

    def add_private(self, username: str, records: Iterable[Dict[str, Any]]) -> List[StoredAlpha]:
        private_path = self._private_path(username)
        existing_payload = self._read_json(private_path, {"alphas": []})
        entries = existing_payload.get("alphas", [])

        new_items: List[StoredAlpha] = []
        for record in records:
            stored = StoredAlpha.from_dict(record, source="private", owner=username)
            stored.created_at = _utc_now()
            stored.updated_at = stored.created_at
            entries.append(stored.to_dict())
            new_items.append(stored)

        self._write_json(private_path, {"alphas": entries})
        return new_items

    def delete_private(self, username: str, alpha_id: str) -> bool:
        private_path = self._private_path(username)
        payload = self._read_json(private_path, {"alphas": []})
        entries = payload.get("alphas", [])
        new_entries = [entry for entry in entries if entry.get("id") != alpha_id]
        if len(new_entries) == len(entries):
            return False
        self._write_json(private_path, {"alphas": new_entries})
        return True

    # ------------------------------------------------------------------ #
    # 레지스트리 프로젝션
    # ------------------------------------------------------------------ #
    def load_shared_definitions(self) -> List[AlphaDefinition]:
        return [stored.to_definition() for stored in self.list_shared()]

    def load_private_definitions(self, username: str) -> List[AlphaDefinition]:
        return [stored.to_definition() for stored in self.list_private(username)]
