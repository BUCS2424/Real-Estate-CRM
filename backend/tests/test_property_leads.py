"""
Property Leads API Tests
Tests CRUD operations, CSV import, notes, and pull-owner-info functionality
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fusion-crm-4.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "mel@a2gdesigns.com"
TEST_PASSWORD = "BigDaddy2016!!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestPropertyLeadsStats:
    """Test property leads statistics endpoint"""
    
    def test_get_stats(self, api_client):
        """GET /api/property-leads/stats returns statistics"""
        response = api_client.get(f"{BASE_URL}/api/property-leads/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "by_status" in data
        assert "by_priority" in data
        assert "with_owner_info" in data
        assert "with_value_estimate" in data
        
        # Verify status breakdown has all expected statuses
        expected_statuses = ["new", "contacted", "qualified", "nurturing", "not_interested", "converted"]
        for status in expected_statuses:
            assert status in data["by_status"]
        
        # Verify priority breakdown
        expected_priorities = ["low", "medium", "high", "urgent"]
        for priority in expected_priorities:
            assert priority in data["by_priority"]
        
        print(f"Stats: Total={data['total']}, New={data['by_status']['new']}")


class TestPropertyLeadsCRUD:
    """Test CRUD operations for property leads"""
    
    def test_get_all_leads(self, api_client):
        """GET /api/property-leads returns list of leads"""
        response = api_client.get(f"{BASE_URL}/api/property-leads")
        assert response.status_code == 200
        
        data = response.json()
        assert "leads" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert isinstance(data["leads"], list)
        print(f"Found {data['total']} property leads")
    
    def test_get_leads_with_status_filter(self, api_client):
        """GET /api/property-leads?status=new filters by status"""
        response = api_client.get(f"{BASE_URL}/api/property-leads?status=new")
        assert response.status_code == 200
        
        data = response.json()
        for lead in data["leads"]:
            assert lead["status"] == "new"
        print(f"Found {len(data['leads'])} leads with status=new")
    
    def test_get_leads_with_priority_filter(self, api_client):
        """GET /api/property-leads?priority=medium filters by priority"""
        response = api_client.get(f"{BASE_URL}/api/property-leads?priority=medium")
        assert response.status_code == 200
        
        data = response.json()
        for lead in data["leads"]:
            assert lead["priority"] == "medium"
        print(f"Found {len(data['leads'])} leads with priority=medium")
    
    def test_create_property_lead(self, api_client):
        """POST /api/property-leads creates a new lead"""
        payload = {
            "address": "TEST_456 Oak Avenue",
            "city": "Tampa",
            "state": "FL",
            "zip_code": "33607",
            "county": "Hillsborough",
            "property_type": "single_family",
            "bedrooms": 4,
            "bathrooms": 2.5,
            "sqft": 2200,
            "estimated_value": 550000,
            "status": "new",
            "priority": "high"
        }
        
        response = api_client.post(f"{BASE_URL}/api/property-leads", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "lead" in data
        lead = data["lead"]
        
        # Verify created data
        assert lead["address"] == payload["address"]
        assert lead["city"] == payload["city"]
        assert lead["state"] == payload["state"]
        assert lead["zip_code"] == payload["zip_code"]
        assert lead["bedrooms"] == payload["bedrooms"]
        assert lead["bathrooms"] == payload["bathrooms"]
        assert lead["estimated_value"] == payload["estimated_value"]
        assert lead["status"] == payload["status"]
        assert lead["priority"] == payload["priority"]
        assert "id" in lead
        assert "activity" in lead
        assert len(lead["activity"]) > 0
        
        print(f"Created lead: {lead['id']}")
        
        # Store for cleanup
        return lead["id"]
    
    def test_get_single_lead(self, api_client):
        """GET /api/property-leads/{id} returns single lead"""
        # First get list to find an existing lead
        list_response = api_client.get(f"{BASE_URL}/api/property-leads")
        leads = list_response.json()["leads"]
        
        if not leads:
            pytest.skip("No leads available to test")
        
        lead_id = leads[0]["id"]
        response = api_client.get(f"{BASE_URL}/api/property-leads/{lead_id}")
        assert response.status_code == 200
        
        lead = response.json()
        assert lead["id"] == lead_id
        assert "address" in lead
        assert "city" in lead
        assert "status" in lead
        print(f"Retrieved lead: {lead['address']}, {lead['city']}")
    
    def test_get_nonexistent_lead_returns_404(self, api_client):
        """GET /api/property-leads/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/property-leads/nonexistent-id-12345")
        assert response.status_code == 404
    
    def test_update_property_lead(self, api_client):
        """PUT /api/property-leads/{id} updates a lead"""
        # First create a lead to update
        create_payload = {
            "address": "TEST_789 Update Street",
            "city": "Tampa",
            "state": "FL",
            "zip_code": "33609",
            "status": "new",
            "priority": "low"
        }
        create_response = api_client.post(f"{BASE_URL}/api/property-leads", json=create_payload)
        lead_id = create_response.json()["lead"]["id"]
        
        # Update the lead
        update_payload = {
            "status": "contacted",
            "priority": "high",
            "estimated_value": 475000,
            "owner_name": "John Doe"
        }
        
        response = api_client.put(f"{BASE_URL}/api/property-leads/{lead_id}", json=update_payload)
        assert response.status_code == 200
        
        data = response.json()
        lead = data["lead"]
        
        # Verify updates
        assert lead["status"] == "contacted"
        assert lead["priority"] == "high"
        assert lead["estimated_value"] == 475000
        assert lead["owner_name"] == "John Doe"
        
        # Verify activity log was updated
        assert len(lead["activity"]) >= 2  # Created + Updated
        
        print(f"Updated lead {lead_id}: status={lead['status']}, priority={lead['priority']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/property-leads/{lead_id}")
    
    def test_delete_property_lead(self, api_client):
        """DELETE /api/property-leads/{id} deletes a lead"""
        # First create a lead to delete
        create_payload = {
            "address": "TEST_Delete Me Street",
            "city": "Tampa",
            "state": "FL",
            "zip_code": "33610"
        }
        create_response = api_client.post(f"{BASE_URL}/api/property-leads", json=create_payload)
        lead_id = create_response.json()["lead"]["id"]
        
        # Delete the lead
        response = api_client.delete(f"{BASE_URL}/api/property-leads/{lead_id}")
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = api_client.get(f"{BASE_URL}/api/property-leads/{lead_id}")
        assert get_response.status_code == 404
        
        print(f"Deleted lead {lead_id}")


class TestPropertyLeadNotes:
    """Test notes functionality for property leads"""
    
    def test_add_note_to_lead(self, api_client):
        """POST /api/property-leads/{id}/notes adds a note"""
        # First create a lead
        create_payload = {
            "address": "TEST_Note Test Street",
            "city": "Tampa",
            "state": "FL",
            "zip_code": "33611"
        }
        create_response = api_client.post(f"{BASE_URL}/api/property-leads", json=create_payload)
        lead_id = create_response.json()["lead"]["id"]
        
        # Add a note
        note_payload = {
            "text": "This is a test note for the property lead",
            "pinned": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/property-leads/{lead_id}/notes", json=note_payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "note" in data
        note = data["note"]
        assert note["text"] == note_payload["text"]
        assert "id" in note
        assert "created_at" in note
        
        print(f"Added note to lead {lead_id}: {note['id']}")
        
        # Verify note appears in lead
        lead_response = api_client.get(f"{BASE_URL}/api/property-leads/{lead_id}")
        lead = lead_response.json()
        assert len(lead["notes"]) > 0
        assert lead["notes"][0]["text"] == note_payload["text"]
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/property-leads/{lead_id}")
    
    def test_delete_note_from_lead(self, api_client):
        """DELETE /api/property-leads/{id}/notes/{note_id} deletes a note"""
        # Create a lead with a note
        create_payload = {
            "address": "TEST_Note Delete Street",
            "city": "Tampa",
            "state": "FL",
            "zip_code": "33612"
        }
        create_response = api_client.post(f"{BASE_URL}/api/property-leads", json=create_payload)
        lead_id = create_response.json()["lead"]["id"]
        
        # Add a note
        note_response = api_client.post(
            f"{BASE_URL}/api/property-leads/{lead_id}/notes",
            json={"text": "Note to be deleted", "pinned": False}
        )
        note_id = note_response.json()["note"]["id"]
        
        # Delete the note
        response = api_client.delete(f"{BASE_URL}/api/property-leads/{lead_id}/notes/{note_id}")
        assert response.status_code == 200
        
        # Verify note is deleted
        lead_response = api_client.get(f"{BASE_URL}/api/property-leads/{lead_id}")
        lead = lead_response.json()
        note_ids = [n["id"] for n in lead["notes"]]
        assert note_id not in note_ids
        
        print(f"Deleted note {note_id} from lead {lead_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/property-leads/{lead_id}")


class TestPullOwnerInfo:
    """Test pull owner info functionality"""
    
    def test_pull_owner_info(self, api_client):
        """POST /api/property-leads/{id}/pull-owner-info fetches tax records"""
        # Get existing lead or create one
        list_response = api_client.get(f"{BASE_URL}/api/property-leads")
        leads = list_response.json()["leads"]
        
        if not leads:
            # Create a test lead
            create_payload = {
                "address": "123 Main Street",
                "city": "Tampa",
                "state": "FL",
                "zip_code": "33602",
                "county": "Hillsborough"
            }
            create_response = api_client.post(f"{BASE_URL}/api/property-leads", json=create_payload)
            lead_id = create_response.json()["lead"]["id"]
        else:
            lead_id = leads[0]["id"]
        
        # Pull owner info
        response = api_client.post(f"{BASE_URL}/api/property-leads/{lead_id}/pull-owner-info")
        assert response.status_code == 200
        
        data = response.json()
        # The response may or may not find records depending on the address
        assert "message" in data
        assert "success" in data
        
        print(f"Pull owner info result: {data['message']}, success={data['success']}")
    
    def test_pull_owner_info_nonexistent_lead(self, api_client):
        """POST /api/property-leads/{invalid_id}/pull-owner-info returns 404"""
        response = api_client.post(f"{BASE_URL}/api/property-leads/nonexistent-id/pull-owner-info")
        assert response.status_code == 404


class TestCSVImport:
    """Test CSV import functionality"""
    
    def test_import_csv(self, api_client, auth_token):
        """POST /api/property-leads/import-csv imports properties from CSV"""
        # Create a simple CSV content
        csv_content = """address,city,state,zip,beds,baths,sqft,value
TEST_100 Import Street,Tampa,FL,33613,3,2,1500,350000
TEST_200 Import Avenue,Tampa,FL,33614,4,3,2000,450000
TEST_300 Import Lane,Tampa,FL,33615,2,1,1000,250000"""
        
        # Create file-like object
        files = {
            'file': ('test_import.csv', csv_content, 'text/csv')
        }
        
        # Need to use requests directly for multipart form
        response = requests.post(
            f"{BASE_URL}/api/property-leads/import-csv",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "imported" in data
        assert "skipped" in data
        assert "message" in data
        
        print(f"CSV Import: {data['imported']} imported, {data['skipped']} skipped")
        
        # Cleanup - delete imported leads
        list_response = api_client.get(f"{BASE_URL}/api/property-leads")
        for lead in list_response.json()["leads"]:
            if lead["address"].startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/property-leads/{lead['id']}")
    
    def test_import_csv_invalid_file(self, auth_token):
        """POST /api/property-leads/import-csv rejects non-CSV files"""
        files = {
            'file': ('test.txt', 'not a csv file', 'text/plain')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/property-leads/import-csv",
            headers={"Authorization": f"Bearer {auth_token}"},
            files=files
        )
        
        assert response.status_code == 400


class TestCSVExport:
    """Test CSV export functionality"""
    
    def test_export_csv(self, api_client):
        """GET /api/property-leads/export/csv exports leads to CSV"""
        response = api_client.get(f"{BASE_URL}/api/property-leads/export/csv")
        
        # May return 404 if no leads, or 200 with CSV data
        if response.status_code == 200:
            data = response.json()
            assert "csv" in data
            assert "count" in data
            print(f"Exported {data['count']} leads to CSV")
        elif response.status_code == 404:
            print("No leads to export (expected if database is empty)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_leads(self, api_client):
        """Delete all TEST_ prefixed leads"""
        list_response = api_client.get(f"{BASE_URL}/api/property-leads?limit=100")
        leads = list_response.json()["leads"]
        
        deleted_count = 0
        for lead in leads:
            if lead["address"].startswith("TEST_"):
                api_client.delete(f"{BASE_URL}/api/property-leads/{lead['id']}")
                deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test leads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
