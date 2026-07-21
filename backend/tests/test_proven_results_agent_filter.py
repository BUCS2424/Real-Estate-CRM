"""
Regression tests for Hidden Haven Realty agent-filtering bug fix + Proven Results feature.

Covers:
- /api/public/listings -> Sheila's own active/pending MLS listings only (no other agents)
- /api/public/proven-results -> Sheila's sold listings
- /api/public/property/by-slug/{slug} -> active + sold detail lookups
- /api/neighborhoods/public/{slug} -> Sheila-only Active/Pending listings, never Sold
- /api/public/portfolio-stats -> sane aggregate numbers
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')


@pytest.fixture(scope="module")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPublicListings:
    """Listing Showcase (active/pending only, Sheila-only)"""

    def test_public_listings_status_ok(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/listings?limit=200")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_public_listings_only_active_or_pending(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/listings?limit=200")
        data = resp.json()
        statuses = {d.get("status") for d in data}
        assert statuses.issubset({"active", "pending"}), f"Unexpected statuses in showcase: {statuses}"

    def test_public_listings_all_belong_to_sheila(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/listings?limit=200")
        data = resp.json()
        for d in data:
            agent = (d.get("listing_agent") or "").lower()
            assert "desautels" in agent, f"Non-Sheila/Desautels agent found in showcase: {d.get('listing_agent')} ({d.get('address')})"

    def test_public_listings_source_is_mls_auto_sync(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/listings?limit=200")
        data = resp.json()
        for d in data:
            assert d.get("source") == "mls_auto_sync"


class TestProvenResults:
    """Proven Results (sold listings)"""

    def test_proven_results_status_ok(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/proven-results?limit=200")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 50  # ~129 expected

    def test_proven_results_all_sold(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/proven-results?limit=200")
        data = resp.json()
        for d in data:
            assert d.get("status") == "sold"

    def test_proven_results_all_belong_to_sheila(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/proven-results?limit=200")
        data = resp.json()
        for d in data:
            agent = (d.get("listing_agent") or "").lower()
            assert "desautels" in agent, f"Non-Sheila agent found in proven-results: {d.get('listing_agent')}"

    def test_proven_results_have_slug_for_detail_page(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/proven-results?limit=200")
        data = resp.json()
        with_slug = [d for d in data if d.get("slug")]
        assert len(with_slug) > 0


class TestPropertyBySlug:
    """Property detail lookups (active + sold)"""

    def test_active_property_by_slug(self, api_client):
        listings = api_client.get(f"{BASE_URL}/api/public/listings?limit=200").json()
        active = [d for d in listings if d.get("status") == "active" and d.get("slug")]
        assert len(active) > 0, "No active listing with slug found to test"
        slug = active[0]["slug"]
        resp = api_client.get(f"{BASE_URL}/api/public/property/by-slug/{slug}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "active"

    def test_sold_property_by_slug(self, api_client):
        sold = api_client.get(f"{BASE_URL}/api/public/proven-results?limit=200").json()
        sold_with_slug = [d for d in sold if d.get("slug")]
        assert len(sold_with_slug) > 0
        slug = sold_with_slug[0]["slug"]
        resp = api_client.get(f"{BASE_URL}/api/public/property/by-slug/{slug}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "sold"
        assert "close_price" in data

    def test_invalid_slug_returns_404(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/property/by-slug/does-not-exist-slug-xyz")
        assert resp.status_code == 404


class TestNeighborhoods:
    """Neighborhoods: Sheila-only Active/Pending, never Sold"""

    def test_neighborhoods_list(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/neighborhoods/public/list")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_happy_in_the_heights_only_sheila_active_pending(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/neighborhoods/public/happy-in-the-heights")
        assert resp.status_code == 200
        data = resp.json()
        assert "listings" in data
        for l in data["listings"]:
            assert l.get("status") in ("Active", "Pending"), f"Unexpected status in neighborhood: {l.get('status')}"
            agent = (l.get("listing_agent") or "").lower()
            assert "desautels" in agent, f"Non-Sheila agent found in neighborhood: {l.get('listing_agent')}"

    def test_neighborhood_not_found(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/neighborhoods/public/does-not-exist-neighborhood")
        assert resp.status_code == 404


class TestPortfolioStats:
    """Homepage portfolio stats"""

    def test_portfolio_stats_ok(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/public/portfolio-stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["active_listings"] >= 0
        assert data["sold_listings"] >= 0
        assert "portfolio_value" in data


class TestDataQuality:
    """Known data-quality regression checks"""

    def test_proven_results_no_lease_priced_sold_homes(self, api_client):
        """
        Sold homes should reflect actual sale prices. Any 'sold' listing with
        close_price under $10,000 strongly suggests a leased/rental record
        (StandardStatus=Closed lease) leaking into the Proven Results sold
        feed, since the sync doesn't filter out Residential Lease property
        types the way neighborhoods.py does.
        """
        resp = api_client.get(f"{BASE_URL}/api/public/proven-results?limit=200")
        data = resp.json()
        suspect = [d for d in data if d.get("close_price") and d.get("close_price") < 10000]
        assert len(suspect) == 0, (
            f"{len(suspect)} 'sold' listings have suspiciously low close_price "
            f"(likely lease records, not home sales): "
            f"{[(d['address'], d['close_price']) for d in suspect]}"
        )
