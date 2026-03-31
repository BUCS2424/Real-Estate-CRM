"""
Landing Pages API Tests
Tests for Property Landing Page Generator feature:
- GET /api/landing-pages/available-listings - returns listings without landing pages
- POST /api/landing-pages - create landing page from listing
- GET /api/landing-pages - list all landing pages
- GET /api/landing-pages/{id} - get specific landing page
- PUT /api/landing-pages/{id} - update landing page
- DELETE /api/landing-pages/{id} - delete landing page
- POST /api/landing-pages/{id}/publish - publish page
- POST /api/landing-pages/{id}/unpublish - unpublish page
- GET /api/landing-pages/public/{slug} - get published page by slug (no auth)
- POST /api/landing-pages/public/{slug}/contact - submit contact form creates lead
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "mel@a2gdesigns.com"
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "BigDaddy2016!!")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def test_listing(auth_headers):
    """Get or create a test listing for landing page tests"""
    # First try to get available listings
    response = requests.get(f"{BASE_URL}/api/landing-pages/available-listings", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]
    
    # If no available listings, get all listings
    response = requests.get(f"{BASE_URL}/api/listings", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]
    
    pytest.skip("No listings available for testing")


class TestLandingPagesAuth:
    """Test authentication requirements"""
    
    def test_get_landing_pages_requires_auth(self):
        """GET /api/landing-pages requires authentication"""
        response = requests.get(f"{BASE_URL}/api/landing-pages")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/landing-pages requires authentication")
    
    def test_get_available_listings_requires_auth(self):
        """GET /api/landing-pages/available-listings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/landing-pages/available-listings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ GET /api/landing-pages/available-listings requires authentication")
    
    def test_create_landing_page_requires_auth(self):
        """POST /api/landing-pages requires authentication"""
        response = requests.post(f"{BASE_URL}/api/landing-pages", json={"listing_id": "test"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ POST /api/landing-pages requires authentication")


class TestAvailableListings:
    """Test available listings endpoint"""
    
    def test_get_available_listings(self, auth_headers):
        """GET /api/landing-pages/available-listings returns listings without landing pages"""
        response = requests.get(f"{BASE_URL}/api/landing-pages/available-listings", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/landing-pages/available-listings returned {len(data)} listings")
        
        # Verify listing structure if any exist
        if len(data) > 0:
            listing = data[0]
            assert "id" in listing, "Listing should have id"
            assert "address" in listing, "Listing should have address"
            print(f"  Sample listing: {listing.get('address', 'N/A')}")


class TestLandingPageCRUD:
    """Test CRUD operations for landing pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_headers, test_listing):
        """Setup for each test"""
        self.auth_headers = auth_headers
        self.test_listing = test_listing
        self.created_page_ids = []
    
    def teardown_method(self, method):
        """Cleanup created landing pages"""
        for page_id in self.created_page_ids:
            try:
                requests.delete(f"{BASE_URL}/api/landing-pages/{page_id}", headers=self.auth_headers)
            except:
                pass
    
    def test_create_landing_page(self, auth_headers, test_listing):
        """POST /api/landing-pages creates a new landing page"""
        # First check if this listing already has a landing page
        response = requests.get(f"{BASE_URL}/api/landing-pages/available-listings", headers=auth_headers)
        available = response.json()
        
        if len(available) == 0:
            pytest.skip("No available listings without landing pages")
        
        listing = available[0]
        
        page_data = {
            "listing_id": listing["id"],
            "custom_headline": "TEST_Beautiful Property",
            "custom_description": "TEST_This is a test description",
            "theme": "auto",
            "show_map": True,
            "show_contact_form": True,
            "agent_name": "Test Agent",
            "agent_phone": "555-123-4567",
            "agent_email": "test@example.com",
            "videos": [],
            "additional_images": []
        }
        
        response = requests.post(f"{BASE_URL}/api/landing-pages", json=page_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have id"
        assert "slug" in data, "Response should have slug"
        assert "preview_url" in data, "Response should have preview_url"
        assert data["status"] == "draft", "New page should be draft"
        
        # Verify theme auto-selection
        price = listing.get("price", 0)
        expected_theme = "luxury" if price >= 1000000 else "modern"
        assert data["theme"] == expected_theme, f"Theme should be {expected_theme} for price {price}"
        
        # Verify preview URL format
        assert "hiddenhavenrealty.com" in data["preview_url"], "Preview URL should contain domain"
        assert data["slug"] in data["preview_url"], "Preview URL should contain slug"
        
        print(f"✓ Created landing page: {data['id']}")
        print(f"  Slug: {data['slug']}")
        print(f"  Theme: {data['theme']} (price: ${price:,})")
        print(f"  Preview URL: {data['preview_url']}")
        
        # Store for cleanup
        self.created_page_ids.append(data["id"])
        
        return data
    
    def test_get_all_landing_pages(self, auth_headers):
        """GET /api/landing-pages returns all landing pages"""
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/landing-pages returned {len(data)} pages")
        
        # Verify structure if any exist
        if len(data) > 0:
            page = data[0]
            assert "id" in page, "Page should have id"
            assert "slug" in page, "Page should have slug"
            assert "status" in page, "Page should have status"
            assert "listing" in page, "Page should have populated listing"
    
    def test_get_single_landing_page(self, auth_headers):
        """GET /api/landing-pages/{id} returns specific landing page"""
        # First get all pages
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page_id = pages[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/landing-pages/{page_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == page_id, "Should return correct page"
        assert "listing" in data, "Should have populated listing"
        print(f"✓ GET /api/landing-pages/{page_id} returned page details")
    
    def test_get_nonexistent_landing_page(self, auth_headers):
        """GET /api/landing-pages/{id} returns 404 for nonexistent page"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/landing-pages/{fake_id}", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET nonexistent landing page returns 404")
    
    def test_update_landing_page(self, auth_headers):
        """PUT /api/landing-pages/{id} updates landing page"""
        # Get existing page
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page_id = pages[0]["id"]
        
        update_data = {
            "custom_headline": "TEST_Updated Headline",
            "custom_description": "TEST_Updated description",
            "agent_name": "Updated Agent"
        }
        
        response = requests.put(f"{BASE_URL}/api/landing-pages/{page_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["custom_headline"] == "TEST_Updated Headline", "Headline should be updated"
        assert data["agent_name"] == "Updated Agent", "Agent name should be updated"
        print(f"✓ PUT /api/landing-pages/{page_id} updated successfully")


class TestPublishUnpublish:
    """Test publish/unpublish functionality"""
    
    def test_publish_landing_page(self, auth_headers):
        """POST /api/landing-pages/{id}/publish publishes the page"""
        # Get existing page
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page_id = pages[0]["id"]
        
        response = requests.post(f"{BASE_URL}/api/landing-pages/{page_id}/publish", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Should have message"
        assert "url" in data, "Should have url"
        print(f"✓ Published landing page: {data.get('url')}")
        
        # Verify status changed
        response = requests.get(f"{BASE_URL}/api/landing-pages/{page_id}", headers=auth_headers)
        page = response.json()
        assert page["status"] == "published", "Status should be published"
    
    def test_unpublish_landing_page(self, auth_headers):
        """POST /api/landing-pages/{id}/unpublish unpublishes the page"""
        # Get existing page
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page_id = pages[0]["id"]
        
        # First publish it
        requests.post(f"{BASE_URL}/api/landing-pages/{page_id}/publish", headers=auth_headers)
        
        # Then unpublish
        response = requests.post(f"{BASE_URL}/api/landing-pages/{page_id}/unpublish", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify status changed
        response = requests.get(f"{BASE_URL}/api/landing-pages/{page_id}", headers=auth_headers)
        page = response.json()
        assert page["status"] == "draft", "Status should be draft after unpublish"
        print("✓ Unpublished landing page successfully")


class TestPublicEndpoints:
    """Test public endpoints (no auth required)"""
    
    def test_get_public_page_not_found(self):
        """GET /api/landing-pages/public/{slug} returns 404 for nonexistent slug"""
        response = requests.get(f"{BASE_URL}/api/landing-pages/public/nonexistent-slug-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET public page with invalid slug returns 404")
    
    def test_get_public_page_unpublished(self, auth_headers):
        """GET /api/landing-pages/public/{slug} returns 404 for unpublished page"""
        # Get existing page
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page = pages[0]
        
        # Make sure it's unpublished
        requests.post(f"{BASE_URL}/api/landing-pages/{page['id']}/unpublish", headers=auth_headers)
        
        # Try to access public endpoint
        response = requests.get(f"{BASE_URL}/api/landing-pages/public/{page['slug']}")
        assert response.status_code == 404, f"Expected 404 for unpublished page, got {response.status_code}"
        print("✓ GET public page for unpublished page returns 404")
    
    def test_get_public_page_published(self, auth_headers):
        """GET /api/landing-pages/public/{slug} returns page data for published page"""
        # Get existing page
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page = pages[0]
        
        # Publish it
        requests.post(f"{BASE_URL}/api/landing-pages/{page['id']}/publish", headers=auth_headers)
        
        # Access public endpoint (no auth)
        response = requests.get(f"{BASE_URL}/api/landing-pages/public/{page['slug']}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "listing" in data, "Should have listing data"
        assert "theme" in data, "Should have theme"
        assert data["slug"] == page["slug"], "Should have correct slug"
        print(f"✓ GET public page returned data for slug: {page['slug']}")
        print(f"  Theme: {data['theme']}")


class TestContactFormSubmission:
    """Test contact form submission creates lead"""
    
    def test_submit_contact_form_creates_lead(self, auth_headers):
        """POST /api/landing-pages/public/{slug}/contact creates a lead"""
        # Get existing page and publish it
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page = pages[0]
        
        # Publish it
        requests.post(f"{BASE_URL}/api/landing-pages/{page['id']}/publish", headers=auth_headers)
        
        # Submit contact form (no auth required)
        contact_data = {
            "name": f"TEST_Lead_{uuid.uuid4().hex[:8]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "phone": "555-987-6543",
            "message": "I'm interested in this property"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/landing-pages/public/{page['slug']}/contact",
            json=contact_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Should have success message"
        print(f"✓ Contact form submitted successfully")
        print(f"  Response: {data['message']}")
        
        # Verify lead was created by checking leads endpoint
        response = requests.get(f"{BASE_URL}/api/leads", headers=auth_headers)
        if response.status_code == 200:
            leads = response.json()
            # Find the lead we just created
            matching_leads = [l for l in leads if l.get("email") == contact_data["email"]]
            if matching_leads:
                lead = matching_leads[0]
                assert lead["source"] == "landing_page", "Lead source should be landing_page"
                print(f"  Lead created with ID: {lead['id']}")
                print(f"  Lead source: {lead['source']}")
    
    def test_submit_contact_form_unpublished_page(self, auth_headers):
        """POST /api/landing-pages/public/{slug}/contact returns 404 for unpublished page"""
        # Get existing page
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to test")
        
        page = pages[0]
        
        # Unpublish it
        requests.post(f"{BASE_URL}/api/landing-pages/{page['id']}/unpublish", headers=auth_headers)
        
        # Try to submit contact form
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "message": "Test message"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/landing-pages/public/{page['slug']}/contact",
            json=contact_data
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Contact form submission to unpublished page returns 404")


class TestThemeAutoSelection:
    """Test theme auto-selection based on price"""
    
    def test_luxury_theme_for_million_plus(self, auth_headers):
        """Theme should be 'luxury' for properties >= $1M"""
        # Get available listings
        response = requests.get(f"{BASE_URL}/api/landing-pages/available-listings", headers=auth_headers)
        listings = response.json()
        
        # Find a listing >= $1M
        luxury_listing = next((l for l in listings if l.get("price", 0) >= 1000000), None)
        
        if not luxury_listing:
            pytest.skip("No luxury listings available for testing")
        
        page_data = {
            "listing_id": luxury_listing["id"],
            "theme": "auto"
        }
        
        response = requests.post(f"{BASE_URL}/api/landing-pages", json=page_data, headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data["theme"] == "luxury", f"Theme should be luxury for ${luxury_listing['price']:,}"
            print(f"✓ Luxury theme auto-selected for ${luxury_listing['price']:,} property")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/landing-pages/{data['id']}", headers=auth_headers)
        elif response.status_code == 400 and "already exists" in response.text:
            print("✓ Luxury listing already has landing page (theme test skipped)")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")
    
    def test_modern_theme_for_under_million(self, auth_headers):
        """Theme should be 'modern' for properties < $1M"""
        # Get available listings
        response = requests.get(f"{BASE_URL}/api/landing-pages/available-listings", headers=auth_headers)
        listings = response.json()
        
        # Find a listing < $1M
        modern_listing = next((l for l in listings if l.get("price", 0) < 1000000), None)
        
        if not modern_listing:
            pytest.skip("No modern-priced listings available for testing")
        
        page_data = {
            "listing_id": modern_listing["id"],
            "theme": "auto"
        }
        
        response = requests.post(f"{BASE_URL}/api/landing-pages", json=page_data, headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data["theme"] == "modern", f"Theme should be modern for ${modern_listing['price']:,}"
            print(f"✓ Modern theme auto-selected for ${modern_listing['price']:,} property")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/landing-pages/{data['id']}", headers=auth_headers)
        elif response.status_code == 400 and "already exists" in response.text:
            print("✓ Modern listing already has landing page (theme test skipped)")
        else:
            pytest.fail(f"Unexpected response: {response.status_code} - {response.text}")


class TestSlugGeneration:
    """Test slug generation from address"""
    
    def test_slug_format(self, auth_headers):
        """Slug should be generated from address-city-state"""
        # Get existing pages to check slug format
        response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
        pages = response.json()
        
        if len(pages) == 0:
            pytest.skip("No landing pages to verify slug format")
        
        page = pages[0]
        listing = page.get("listing", {})
        
        # Verify slug contains address components
        slug = page["slug"]
        assert "-" in slug, "Slug should use hyphens"
        assert slug == slug.lower(), "Slug should be lowercase"
        
        # Check preview URL format
        assert page["preview_url"].startswith("https://hiddenhavenrealty.com/"), \
            f"Preview URL should start with domain: {page['preview_url']}"
        assert slug in page["preview_url"], "Preview URL should contain slug"
        
        print(f"✓ Slug format verified: {slug}")
        print(f"  Preview URL: {page['preview_url']}")


class TestDeleteLandingPage:
    """Test delete functionality"""
    
    def test_delete_landing_page(self, auth_headers):
        """DELETE /api/landing-pages/{id} deletes the page"""
        # First create a page to delete
        response = requests.get(f"{BASE_URL}/api/landing-pages/available-listings", headers=auth_headers)
        available = response.json()
        
        if len(available) == 0:
            # Try to delete an existing page instead
            response = requests.get(f"{BASE_URL}/api/landing-pages", headers=auth_headers)
            pages = response.json()
            
            if len(pages) == 0:
                pytest.skip("No landing pages to delete")
            
            page_id = pages[0]["id"]
        else:
            # Create a new page
            page_data = {
                "listing_id": available[0]["id"],
                "custom_headline": "TEST_To Be Deleted"
            }
            response = requests.post(f"{BASE_URL}/api/landing-pages", json=page_data, headers=auth_headers)
            if response.status_code != 200:
                pytest.skip("Could not create page to delete")
            page_id = response.json()["id"]
        
        # Delete the page
        response = requests.delete(f"{BASE_URL}/api/landing-pages/{page_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify it's deleted
        response = requests.get(f"{BASE_URL}/api/landing-pages/{page_id}", headers=auth_headers)
        assert response.status_code == 404, "Deleted page should return 404"
        print(f"✓ Deleted landing page {page_id}")
    
    def test_delete_nonexistent_page(self, auth_headers):
        """DELETE /api/landing-pages/{id} returns 404 for nonexistent page"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/landing-pages/{fake_id}", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ DELETE nonexistent page returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
