"""
Tests for Super Admin Impersonation feature + related security fixes:
- POST /api/users/{user_id}/impersonate (superuser only)
- GET /api/auth/me while impersonating (role forced to superuser, _impersonating flags)
- GET /api/users no longer leaks password_hash
- Self-impersonation returns 400
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
SUPERUSER_EMAIL = "mel@a2gdesigns.com"
SUPERUSER_PASSWORD = "BigDaddy2016!!"


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    resp = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPERUSER_EMAIL,
        "password": SUPERUSER_PASSWORD
    })
    if resp.status_code != 200:
        pytest.skip(f"Login failed for superuser: {resp.status_code} {resp.text}")
    return resp.json().get("access_token")


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture(scope="module")
def admin_me(admin_client):
    resp = admin_client.get(f"{BASE_URL}/api/auth/me")
    assert resp.status_code == 200
    return resp.json()


@pytest.fixture(scope="module")
def all_users(admin_client):
    resp = admin_client.get(f"{BASE_URL}/api/users")
    assert resp.status_code == 200
    return resp.json()


class TestUsersListSecurity:
    def test_users_list_no_password_hash_leak(self, all_users):
        assert isinstance(all_users, list)
        assert len(all_users) > 0
        for u in all_users:
            assert "password_hash" not in u, f"password_hash leaked for user {u.get('email')}"
            assert "password" not in u, f"password leaked for user {u.get('email')}"
            assert "_id" not in u, "raw mongo _id should be excluded"

    def test_users_list_has_expected_fields(self, all_users):
        u = all_users[0]
        for field in ["id", "email", "name", "role"]:
            assert field in u


class TestImpersonationTargetDiscovery:
    def test_find_impersonation_target(self, admin_me, all_users):
        """Per task notes: duplicate Mel accounts exist; find a different user id
        with same/any email besides the one currently logged in."""
        others = [u for u in all_users if u["id"] != admin_me["id"]]
        assert len(others) > 0, "No other user account available to impersonate"


class TestImpersonationFlow:
    @pytest.fixture(scope="class")
    def target_user(self, admin_me, all_users):
        others = [u for u in all_users if u["id"] != admin_me["id"]]
        if not others:
            pytest.skip("No other user to impersonate")
        return others[0]

    def test_impersonate_returns_token_and_user(self, admin_client, target_user):
        resp = admin_client.post(f"{BASE_URL}/api/users/{target_user['id']}/impersonate")
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 0
        assert "user" in data
        assert data["user"]["id"] == target_user["id"]
        assert "password_hash" not in data["user"]

    def test_me_with_impersonated_token_shows_forced_role_and_flags(self, api_client, admin_client, admin_me, target_user):
        resp = admin_client.post(f"{BASE_URL}/api/users/{target_user['id']}/impersonate")
        assert resp.status_code == 200
        imp_token = resp.json()["access_token"]

        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {imp_token}"
        })
        assert me_resp.status_code == 200
        me = me_resp.json()

        # Identity fields should be target user's
        assert me["id"] == target_user["id"]
        assert me["email"] == target_user["email"]
        assert me["name"] == target_user["name"]

        # Role forced to superuser regardless of target's actual role
        assert me["role"] == "superuser"

        # Impersonation metadata
        assert me.get("_impersonating") is True
        assert me.get("_impersonator_id") == admin_me["id"]
        assert me.get("_impersonator_name") == admin_me["name"]

    def test_impersonated_token_can_access_superuser_only_endpoint(self, admin_client, target_user):
        """Even if target_user's real role is not superuser, impersonated session
        must retain full superadmin permissions (e.g. GET /api/users)."""
        resp = admin_client.post(f"{BASE_URL}/api/users/{target_user['id']}/impersonate")
        imp_token = resp.json()["access_token"]
        users_resp = requests.get(f"{BASE_URL}/api/users", headers={
            "Authorization": f"Bearer {imp_token}"
        })
        assert users_resp.status_code == 200
        assert isinstance(users_resp.json(), list)

    def test_self_impersonation_returns_400(self, admin_client, admin_me):
        resp = admin_client.post(f"{BASE_URL}/api/users/{admin_me['id']}/impersonate")
        assert resp.status_code == 400
        data = resp.json()
        assert "already this user" in data.get("detail", "").lower()

    def test_impersonate_nonexistent_user_404(self, admin_client):
        resp = admin_client.post(f"{BASE_URL}/api/users/nonexistent-id-xyz/impersonate")
        assert resp.status_code == 404


class TestImpersonationAuthGuard:
    def test_impersonate_without_token_401_or_403(self):
        resp = requests.post(f"{BASE_URL}/api/users/some-id/impersonate")
        assert resp.status_code in [401, 403]

    def test_impersonate_with_invalid_token_401(self):
        resp = requests.post(f"{BASE_URL}/api/users/some-id/impersonate", headers={
            "Authorization": "Bearer invalid.token.value"
        })
        assert resp.status_code == 401
