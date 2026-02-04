"""
Test suite for Deals API endpoints
Tests CRUD operations, stage updates, and deal pipeline functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "mel@a2gdesigns.com"
TEST_PASSWORD = "BigDaddy2016!!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDealsAPI:
    """Test Deals CRUD operations"""
    
    created_deal_id = None
    
    def test_01_list_deals(self, auth_headers):
        """GET /api/deals - List all deals"""
        response = requests.get(f"{BASE_URL}/api/deals", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} deals in database")
    
    def test_02_create_deal(self, auth_headers):
        """POST /api/deals - Create a new deal"""
        payload = {
            "title": "TEST_New Property Deal",
            "value": 500000,
            "stage": "lead",
            "property_address": "123 Test Street, Test City",
            "notes": "Test deal for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/deals", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["value"] == payload["value"]
        assert data["stage"] == payload["stage"]
        assert data["property_address"] == payload["property_address"]
        assert "id" in data
        assert "created_at" in data
        
        TestDealsAPI.created_deal_id = data["id"]
        print(f"Created deal with ID: {data['id']}")
    
    def test_03_get_deal_by_id(self, auth_headers):
        """GET /api/deals/{id} - Get single deal"""
        deal_id = TestDealsAPI.created_deal_id
        assert deal_id is not None, "No deal ID from previous test"
        
        response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == deal_id
        assert data["title"] == "TEST_New Property Deal"
    
    def test_04_update_deal_stage(self, auth_headers):
        """PATCH /api/deals/{id}/stage - Update deal stage"""
        deal_id = TestDealsAPI.created_deal_id
        assert deal_id is not None, "No deal ID from previous test"
        
        # Update to qualified stage
        response = requests.patch(
            f"{BASE_URL}/api/deals/{deal_id}/stage",
            json={"stage": "qualified"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["stage"] == "qualified"
        print(f"Updated deal stage to: {data['stage']}")
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)
        assert verify_response.status_code == 200
        assert verify_response.json()["stage"] == "qualified"
    
    def test_05_update_deal_stage_to_proposal(self, auth_headers):
        """PATCH /api/deals/{id}/stage - Update to proposal stage"""
        deal_id = TestDealsAPI.created_deal_id
        
        response = requests.patch(
            f"{BASE_URL}/api/deals/{deal_id}/stage",
            json={"stage": "proposal"},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["stage"] == "proposal"
    
    def test_06_update_deal_stage_to_negotiation(self, auth_headers):
        """PATCH /api/deals/{id}/stage - Update to negotiation stage"""
        deal_id = TestDealsAPI.created_deal_id
        
        response = requests.patch(
            f"{BASE_URL}/api/deals/{deal_id}/stage",
            json={"stage": "negotiation"},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["stage"] == "negotiation"
    
    def test_07_update_deal_stage_to_closed(self, auth_headers):
        """PATCH /api/deals/{id}/stage - Update to closed stage"""
        deal_id = TestDealsAPI.created_deal_id
        
        response = requests.patch(
            f"{BASE_URL}/api/deals/{deal_id}/stage",
            json={"stage": "closed"},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["stage"] == "closed"
    
    def test_08_update_deal_full(self, auth_headers):
        """PUT /api/deals/{id} - Full deal update"""
        deal_id = TestDealsAPI.created_deal_id
        
        payload = {
            "title": "TEST_Updated Property Deal",
            "value": 750000,
            "stage": "proposal",
            "property_address": "456 Updated Street, New City",
            "notes": "Updated notes for testing"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/deals/{deal_id}",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        assert data["value"] == payload["value"]
        assert data["stage"] == payload["stage"]
        assert data["property_address"] == payload["property_address"]
        assert "updated_at" in data
        
        # Verify with GET
        verify_response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)
        assert verify_response.status_code == 200
        fetched = verify_response.json()
        assert fetched["title"] == payload["title"]
        assert fetched["value"] == payload["value"]
    
    def test_09_create_deal_with_contact(self, auth_headers):
        """POST /api/deals - Create deal with contact_id"""
        # First get a contact
        contacts_response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        contacts = contacts_response.json()
        contact_id = contacts[0]["id"] if contacts else None
        
        payload = {
            "title": "TEST_Deal With Contact",
            "value": 300000,
            "stage": "lead",
            "contact_id": contact_id,
            "property_address": "789 Contact Street"
        }
        
        response = requests.post(f"{BASE_URL}/api/deals", json=payload, headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["title"] == payload["title"]
        if contact_id:
            assert data["contact_id"] == contact_id
        
        # Clean up - delete this deal
        requests.delete(f"{BASE_URL}/api/deals/{data['id']}", headers=auth_headers)
    
    def test_10_delete_deal(self, auth_headers):
        """DELETE /api/deals/{id} - Delete deal"""
        deal_id = TestDealsAPI.created_deal_id
        
        response = requests.delete(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)
        assert verify_response.status_code == 404
        print(f"Successfully deleted deal: {deal_id}")


class TestDealsValidation:
    """Test validation and error handling"""
    
    def test_get_nonexistent_deal(self, auth_headers):
        """GET /api/deals/{id} - 404 for nonexistent deal"""
        response = requests.get(
            f"{BASE_URL}/api/deals/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_update_nonexistent_deal_stage(self, auth_headers):
        """PATCH /api/deals/{id}/stage - 404 for nonexistent deal"""
        response = requests.patch(
            f"{BASE_URL}/api/deals/nonexistent-id-12345/stage",
            json={"stage": "qualified"},
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_delete_nonexistent_deal(self, auth_headers):
        """DELETE /api/deals/{id} - 404 for nonexistent deal"""
        response = requests.delete(
            f"{BASE_URL}/api/deals/nonexistent-id-12345",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_unauthenticated_access(self):
        """GET /api/deals - 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/deals")
        assert response.status_code in [401, 403]


class TestDealsStages:
    """Test all valid stage transitions"""
    
    def test_all_stages_valid(self, auth_headers):
        """Verify all 5 stages are valid"""
        valid_stages = ["lead", "qualified", "proposal", "negotiation", "closed"]
        
        # Create a test deal
        payload = {
            "title": "TEST_Stage Validation Deal",
            "value": 100000,
            "stage": "lead"
        }
        create_response = requests.post(f"{BASE_URL}/api/deals", json=payload, headers=auth_headers)
        assert create_response.status_code == 200
        deal_id = create_response.json()["id"]
        
        # Test each stage
        for stage in valid_stages:
            response = requests.patch(
                f"{BASE_URL}/api/deals/{deal_id}/stage",
                json={"stage": stage},
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed to set stage to {stage}"
            assert response.json()["stage"] == stage
            print(f"Stage '{stage}' validated successfully")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/deals/{deal_id}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
