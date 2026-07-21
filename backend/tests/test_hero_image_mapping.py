"""
Test Hero Image Mapping - Verifies that lead primary_photo/background_image_url
becomes the first hero image on landing pages when creating listings from leads.

Key test: listing.images[0].url should match lead.primary_photo
"""
import pytest
import requests
import os
import uuid

# Load environment
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ.setdefault(key, value.strip('"'))

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://realty-showcase-fix.preview.emergentagent.com').rstrip('/')


class TestHeroImageMapping:
    """Tests for ensuring lead main photo maps to listing hero image"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mel@a2gdesigns.com",
            "password": "BigDaddy2016!!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with authentication"""
        return {"Authorization": f"Bearer {auth_token}"}

    def test_existing_lead_first_image_matches_primary_photo(self, auth_headers):
        """Test that existing lead's listing.images[0] matches lead.primary_photo"""
        lead_id = "2b2a3bd5-a28d-43c1-9650-7ca09f73b202"
        
        # Get the lead
        lead_response = requests.get(f"{BASE_URL}/api/property-leads/{lead_id}", headers=auth_headers)
        assert lead_response.status_code == 200, f"Lead not found: {lead_response.text}"
        lead = lead_response.json()
        
        lead_primary_photo = lead.get("primary_photo")
        listing_id = lead.get("listing_id")
        
        assert lead_primary_photo, "Lead should have primary_photo"
        assert listing_id, "Lead should have listing_id"
        
        print(f"Lead primary_photo: {lead_primary_photo}")
        
        # Get the listing
        listing_response = requests.get(f"{BASE_URL}/api/properties/{listing_id}", headers=auth_headers)
        assert listing_response.status_code == 200, f"Listing not found: {listing_response.text}"
        listing = listing_response.json()
        
        # Verify first image matches lead primary_photo (KEY TEST)
        images = listing.get("images", [])
        assert len(images) > 0, "Listing should have images"
        first_image_url = images[0].get("url") if isinstance(images[0], dict) else images[0]
        assert first_image_url == lead_primary_photo, \
            f"First image URL mismatch!\n  Expected: {lead_primary_photo}\n  Got: {first_image_url}"
        
        # Verify is_primary flag
        if isinstance(images[0], dict):
            assert images[0].get("is_primary") == True, "First image should have is_primary=True"
        
        print(f"SUCCESS: listing.images[0].url matches lead.primary_photo")
        print(f"  URL: {first_image_url}")

    def test_public_landing_page_returns_correct_hero(self, auth_headers):
        """Test GET /api/landing-pages/public/{slug} returns listing with correct first image"""
        slug = "2913-n-shoreview-place-tampa-fl"
        
        # Get lead to verify expected value
        lead_response = requests.get(
            f"{BASE_URL}/api/property-leads/2b2a3bd5-a28d-43c1-9650-7ca09f73b202",
            headers=auth_headers
        )
        assert lead_response.status_code == 200
        lead = lead_response.json()
        expected_hero_url = lead.get("primary_photo")
        
        # Call public endpoint (no auth needed)
        public_response = requests.get(f"{BASE_URL}/api/landing-pages/public/{slug}")
        assert public_response.status_code == 200, f"Public page failed: {public_response.text}"
        
        page_data = public_response.json()
        listing = page_data.get("listing", {})
        images = listing.get("images", [])
        
        assert len(images) > 0, "Public landing page should have images"
        
        # Verify first image matches lead primary_photo (KEY TEST)
        first_image_url = images[0].get("url") if isinstance(images[0], dict) else images[0]
        assert first_image_url == expected_hero_url, \
            f"Public page first image mismatch!\n  Expected: {expected_hero_url}\n  Got: {first_image_url}"
        
        # Also verify hero_image_url (set by landing page endpoint)
        assert listing.get("hero_image_url") == expected_hero_url, \
            f"Public page hero_image_url should match first image"
        
        print(f"SUCCESS: Public landing page returns correct hero image")
        print(f"  - First image URL: {first_image_url}")
        print(f"  - hero_image_url: {listing.get('hero_image_url')}")

    def test_create_listing_regression_preserves_first_image(self, auth_headers):
        """Test that calling create-listing again preserves first image correctly"""
        lead_id = "2b2a3bd5-a28d-43c1-9650-7ca09f73b202"
        
        # Get lead's primary_photo
        lead_response = requests.get(f"{BASE_URL}/api/property-leads/{lead_id}", headers=auth_headers)
        lead = lead_response.json()
        expected_hero_url = lead.get("primary_photo")
        
        # Call create-listing (should update existing)
        response = requests.post(
            f"{BASE_URL}/api/property-leads/{lead_id}/create-listing",
            json={"create_landing_page": True, "theme": "luxury"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Create listing failed: {response.text}"
        
        result = response.json()
        listing = result.get("listing", {})
        
        # Verify images[0] is correct (KEY TEST)
        images = listing.get("images", [])
        assert len(images) > 0, "Listing should have images"
        first_url = images[0].get("url") if isinstance(images[0], dict) else images[0]
        assert first_url == expected_hero_url, \
            f"First image not preserved!\n  Expected: {expected_hero_url}\n  Got: {first_url}"
        
        # Verify hero_image_url from create-listing response
        assert listing.get("hero_image_url") == expected_hero_url, \
            f"hero_image_url should match first image in create-listing response"
        
        print(f"SUCCESS: Regression test passed - first image correctly maintained")
        print(f"  First image URL: {first_url}")

    def test_url_exact_equality_in_public_endpoint(self, auth_headers):
        """Test that URL equality holds: lead.primary_photo == public.images[0].url"""
        lead_id = "2b2a3bd5-a28d-43c1-9650-7ca09f73b202"
        slug = "2913-n-shoreview-place-tampa-fl"
        
        # Get lead
        lead_response = requests.get(f"{BASE_URL}/api/property-leads/{lead_id}", headers=auth_headers)
        lead = lead_response.json()
        lead_primary = lead.get("primary_photo")
        
        # Get public landing page
        public_response = requests.get(f"{BASE_URL}/api/landing-pages/public/{slug}")
        public_data = public_response.json()
        public_listing = public_data.get("listing", {})
        public_images = public_listing.get("images", [])
        public_first_image = public_images[0].get("url") if public_images else None
        public_hero = public_listing.get("hero_image_url")
        
        # Verify URL equality (KEY TEST for user requirement)
        assert lead_primary == public_first_image, \
            f"URL mismatch: lead.primary_photo != public.images[0].url\n  Lead: {lead_primary}\n  Public: {public_first_image}"
        
        assert lead_primary == public_hero, \
            f"URL mismatch: lead.primary_photo != public.hero_image_url\n  Lead: {lead_primary}\n  Public: {public_hero}"
        
        print(f"SUCCESS: URL exact equality verified")
        print(f"  URL: {lead_primary}")


class TestImageOrderPreservation:
    """Test that image ordering is correct with lead's main photo first"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mel@a2gdesigns.com",
            "password": "BigDaddy2016!!"
        })
        assert response.status_code == 200
        return response.json().get("access_token")

    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}

    def test_images_have_correct_order_attribute(self, auth_headers):
        """Test that images have order attribute with first image at order=0"""
        lead_id = "2b2a3bd5-a28d-43c1-9650-7ca09f73b202"
        
        lead_response = requests.get(f"{BASE_URL}/api/property-leads/{lead_id}", headers=auth_headers)
        lead = lead_response.json()
        listing_id = lead.get("listing_id")
        
        listing_response = requests.get(f"{BASE_URL}/api/properties/{listing_id}", headers=auth_headers)
        listing = listing_response.json()
        images = listing.get("images", [])
        
        assert len(images) > 0, "Should have images"
        
        # Check first image has order=0
        if isinstance(images[0], dict):
            assert images[0].get("order", 0) == 0, "First image should have order=0"
            print(f"SUCCESS: First image has order=0")
            print(f"  Image: {images[0]}")

    def test_public_endpoint_normalizes_images(self, auth_headers):
        """Test that public endpoint returns properly normalized images"""
        slug = "2913-n-shoreview-place-tampa-fl"
        
        public_response = requests.get(f"{BASE_URL}/api/landing-pages/public/{slug}")
        public_data = public_response.json()
        listing = public_data.get("listing", {})
        images = listing.get("images", [])
        
        assert len(images) > 0, "Should have images"
        
        # Verify all images are dicts with proper structure
        for i, img in enumerate(images):
            assert isinstance(img, dict), f"Image {i} should be a dict"
            assert "url" in img, f"Image {i} should have 'url' field"
            assert img.get("url"), f"Image {i} should have non-empty url"
        
        # Verify first image has is_primary=True
        assert images[0].get("is_primary") == True, "First image should have is_primary=True"
        
        print(f"SUCCESS: Public endpoint returns normalized images")
        print(f"  First image: {images[0]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
