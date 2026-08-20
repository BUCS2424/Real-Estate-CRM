"""
Tests for Database Backup feature (superuser only):
- POST /api/admin/backup/create   (runs mongodump, zips, stores metadata)
- GET  /api/admin/backup/list
- GET  /api/admin/backup/{id}/download  (real zip with .bson files)
- DELETE /api/admin/backup/{id}
- Auth enforcement (401/403 unauthenticated)
"""
import io
import os
import zipfile

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")

SUPERUSER_EMAIL = "mel@a2gdesigns.com"
SUPERUSER_PASSWORD = "BigDaddy2016!!"


@pytest.fixture(scope="module")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_client(anon_client):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    resp = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERUSER_EMAIL, "password": SUPERUSER_PASSWORD})
    if resp.status_code != 200:
        pytest.fail(f"Superuser login failed: {resp.status_code} {resp.text[:300]}")
    token = resp.json().get("access_token")
    assert token, f"No access_token in login response: {resp.json()}"
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    return []


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_client, created_ids):
    yield
    for bid in created_ids:
        admin_client.delete(f"{BASE_URL}/api/admin/backup/{bid}")


# --- Auth enforcement ---
class TestBackupAuth:
    def test_list_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/admin/backup/list")
        assert r.status_code in (401, 403), r.text[:300]

    def test_create_requires_auth(self, anon_client):
        r = anon_client.post(f"{BASE_URL}/api/admin/backup/create")
        assert r.status_code in (401, 403), r.text[:300]

    def test_download_requires_auth(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/admin/backup/fake-id/download")
        assert r.status_code in (401, 403), r.text[:300]

    def test_delete_requires_auth(self, anon_client):
        r = anon_client.delete(f"{BASE_URL}/api/admin/backup/fake-id")
        assert r.status_code in (401, 403), r.text[:300]

    def test_bad_token_rejected(self, anon_client):
        r = anon_client.get(f"{BASE_URL}/api/admin/backup/list",
                            headers={"Authorization": "Bearer garbage"})
        assert r.status_code in (401, 403), r.text[:300]


# --- Core flow ---
class TestBackupFlow:
    def test_list_initial(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/backup/list")
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert isinstance(data, list)
        for b in data:
            assert "_id" not in b

    def test_create_backup(self, admin_client, created_ids):
        r = admin_client.post(f"{BASE_URL}/api/admin/backup/create", timeout=180)
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        for k in ("id", "filename", "size_bytes", "collection_count", "status", "created_at", "created_by"):
            assert k in d, f"missing key {k} in {d}"
        assert "_id" not in d
        created_ids.append(d["id"])
        assert d["filename"].startswith("backup_") and d["filename"].endswith(".zip")
        assert isinstance(d["size_bytes"], int) and d["size_bytes"] > 1000, d
        assert d["collection_count"] >= 20, f"collection_count too low: {d['collection_count']}"
        assert d["status"] == "completed"

    def test_created_backup_in_list(self, admin_client, created_ids):
        assert created_ids, "no backup created"
        r = admin_client.get(f"{BASE_URL}/api/admin/backup/list")
        assert r.status_code == 200
        ids = [b["id"] for b in r.json()]
        assert created_ids[0] in ids

    def test_download_is_real_mongodump_zip(self, admin_client, created_ids):
        bid = created_ids[0]
        r = admin_client.get(f"{BASE_URL}/api/admin/backup/{bid}/download", timeout=180)
        assert r.status_code == 200, r.text[:300]
        assert "zip" in r.headers.get("content-type", "").lower(), r.headers
        assert len(r.content) > 1000, f"tiny file: {len(r.content)}"
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = zf.namelist()
        bson = [n for n in names if n.endswith(".bson")]
        meta = [n for n in names if n.endswith(".metadata.json")]
        assert len(bson) >= 20, f"only {len(bson)} bson files: {names[:10]}"
        assert len(meta) >= 20, f"only {len(meta)} metadata files"
        lowered = {n.lower() for n in names}
        for expected in ("users.bson", "contacts.bson", "properties.bson"):
            assert expected in lowered, f"{expected} missing from backup: {sorted(lowered)[:40]}"
        # verify a bson file has real content
        sizes = [zf.getinfo(n).file_size for n in bson]
        assert max(sizes) > 100, "all bson files are empty"

    def test_download_nonexistent_returns_404(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/backup/does-not-exist/download")
        assert r.status_code == 404, r.status_code

    def test_delete_nonexistent_returns_404(self, admin_client):
        r = admin_client.delete(f"{BASE_URL}/api/admin/backup/does-not-exist")
        assert r.status_code == 404, r.status_code

    def test_delete_backup_removes_it(self, admin_client, created_ids):
        bid = created_ids[0]
        r = admin_client.delete(f"{BASE_URL}/api/admin/backup/{bid}")
        assert r.status_code == 200, r.text[:300]
        r2 = admin_client.get(f"{BASE_URL}/api/admin/backup/list")
        assert bid not in [b["id"] for b in r2.json()]
        r3 = admin_client.get(f"{BASE_URL}/api/admin/backup/{bid}/download")
        assert r3.status_code == 404
        created_ids.remove(bid)
