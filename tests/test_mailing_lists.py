"""
Mailing Lists API Tests
Tests CRUD operations, subscriber management, import/export functionality
"""
import pytest
import requests
import os
import io
import csv

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fusion-crm-4.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "mel@a2gdesigns.com"
TEST_PASSWORD = "BigDaddy2016!!"


class TestMailingListsAPI:
    """Test suite for Mailing Lists feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login and get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        token = response.json().get("access_token")
        assert token, "No access token received"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_list_ids = []
        
        yield
        
        # Cleanup - delete test lists
        for list_id in self.created_list_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/mailing-lists/{list_id}")
            except:
                pass
    
    # ============ MAILING LIST CRUD TESTS ============
    
    def test_get_mailing_lists_empty_or_existing(self):
        """Test GET /api/mailing-lists returns list"""
        response = self.session.get(f"{BASE_URL}/api/mailing-lists")
        assert response.status_code == 200, f"Failed to get lists: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/mailing-lists - Found {len(data)} lists")
    
    def test_create_mailing_list(self):
        """Test POST /api/mailing-lists - Create new list"""
        payload = {
            "name": "TEST_VIP_Buyers_List",
            "description": "Test list for VIP buyers",
            "category": "vip"
        }
        
        response = self.session.post(f"{BASE_URL}/api/mailing-lists", json=payload)
        assert response.status_code == 200, f"Failed to create list: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["name"] == payload["name"], "Name mismatch"
        assert data["description"] == payload["description"], "Description mismatch"
        assert data["category"] == payload["category"], "Category mismatch"
        
        self.created_list_ids.append(data["id"])
        print(f"✓ POST /api/mailing-lists - Created list: {data['id']}")
        
        return data["id"]
    
    def test_create_list_with_minimal_data(self):
        """Test creating list with only required fields"""
        payload = {"name": "TEST_Minimal_List"}
        
        response = self.session.post(f"{BASE_URL}/api/mailing-lists", json=payload)
        assert response.status_code == 200, f"Failed to create minimal list: {response.text}"
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["category"] == "general", "Default category should be 'general'"
        
        self.created_list_ids.append(data["id"])
        print(f"✓ Created list with minimal data: {data['id']}")
    
    def test_get_single_mailing_list(self):
        """Test GET /api/mailing-lists/{id} - Get single list with subscribers"""
        # First create a list
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Single_List",
            "description": "Test single list retrieval",
            "category": "buyers"
        })
        assert create_response.status_code == 200
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Get the list
        response = self.session.get(f"{BASE_URL}/api/mailing-lists/{list_id}")
        assert response.status_code == 200, f"Failed to get list: {response.text}"
        
        data = response.json()
        assert data["id"] == list_id
        assert data["name"] == "TEST_Single_List"
        assert "subscribers" in data, "Response should include subscribers array"
        assert isinstance(data["subscribers"], list)
        
        print(f"✓ GET /api/mailing-lists/{list_id} - Retrieved list with {len(data['subscribers'])} subscribers")
    
    def test_update_mailing_list(self):
        """Test PUT /api/mailing-lists/{id} - Update list"""
        # Create a list first
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Update_List",
            "description": "Original description",
            "category": "general"
        })
        assert create_response.status_code == 200
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Update the list
        update_payload = {
            "name": "TEST_Updated_List_Name",
            "description": "Updated description",
            "category": "vip"
        }
        
        response = self.session.put(f"{BASE_URL}/api/mailing-lists/{list_id}", json=update_payload)
        assert response.status_code == 200, f"Failed to update list: {response.text}"
        
        data = response.json()
        assert data["name"] == update_payload["name"], "Name not updated"
        assert data["description"] == update_payload["description"], "Description not updated"
        assert data["category"] == update_payload["category"], "Category not updated"
        
        # Verify with GET
        verify_response = self.session.get(f"{BASE_URL}/api/mailing-lists/{list_id}")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["name"] == update_payload["name"]
        
        print(f"✓ PUT /api/mailing-lists/{list_id} - Updated list successfully")
    
    def test_delete_mailing_list(self):
        """Test DELETE /api/mailing-lists/{id} - Delete list"""
        # Create a list first
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Delete_List",
            "category": "general"
        })
        assert create_response.status_code == 200
        list_id = create_response.json()["id"]
        
        # Delete the list
        response = self.session.delete(f"{BASE_URL}/api/mailing-lists/{list_id}")
        assert response.status_code == 200, f"Failed to delete list: {response.text}"
        
        # Verify deletion
        verify_response = self.session.get(f"{BASE_URL}/api/mailing-lists/{list_id}")
        assert verify_response.status_code == 404, "List should not exist after deletion"
        
        print(f"✓ DELETE /api/mailing-lists/{list_id} - Deleted list successfully")
    
    def test_get_nonexistent_list(self):
        """Test GET /api/mailing-lists/{id} with invalid ID"""
        response = self.session.get(f"{BASE_URL}/api/mailing-lists/nonexistent-id-12345")
        assert response.status_code == 404, "Should return 404 for nonexistent list"
        print("✓ GET nonexistent list returns 404")
    
    # ============ SUBSCRIBER MANAGEMENT TESTS ============
    
    def test_add_subscriber_to_list(self):
        """Test POST /api/mailing-lists/{id}/subscribers - Add subscriber"""
        # Create a list first
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Subscriber_List",
            "category": "general"
        })
        assert create_response.status_code == 200
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Add subscriber
        subscriber_payload = {
            "email": "test_subscriber@example.com",
            "name": "Test Subscriber",
            "phone": "+1234567890"
        }
        
        response = self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers", json=subscriber_payload)
        assert response.status_code == 200, f"Failed to add subscriber: {response.text}"
        
        data = response.json()
        assert "id" in data, "Subscriber should have an ID"
        assert data["email"] == subscriber_payload["email"].lower(), "Email mismatch"
        assert data["name"] == subscriber_payload["name"], "Name mismatch"
        assert data["status"] == "active", "Default status should be 'active'"
        
        print(f"✓ POST /api/mailing-lists/{list_id}/subscribers - Added subscriber: {data['id']}")
        
        return list_id, data["id"]
    
    def test_add_duplicate_subscriber(self):
        """Test adding duplicate email to same list"""
        # Create a list
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Duplicate_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Add subscriber
        subscriber_payload = {"email": "duplicate@example.com", "name": "First Add"}
        response1 = self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers", json=subscriber_payload)
        assert response1.status_code == 200
        
        # Try to add same email again
        response2 = self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers", json=subscriber_payload)
        assert response2.status_code == 400, "Should reject duplicate email"
        
        print("✓ Duplicate subscriber correctly rejected")
    
    def test_remove_subscriber_from_list(self):
        """Test DELETE /api/mailing-lists/{id}/subscribers/{subscriber_id}"""
        # Create list and add subscriber
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Remove_Subscriber_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Add subscriber
        add_response = self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers", json={
            "email": "remove_me@example.com",
            "name": "To Be Removed"
        })
        subscriber_id = add_response.json()["id"]
        
        # Remove subscriber
        response = self.session.delete(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers/{subscriber_id}")
        assert response.status_code == 200, f"Failed to remove subscriber: {response.text}"
        
        # Verify removal
        list_response = self.session.get(f"{BASE_URL}/api/mailing-lists/{list_id}")
        subscribers = list_response.json().get("subscribers", [])
        subscriber_ids = [s["id"] for s in subscribers]
        assert subscriber_id not in subscriber_ids, "Subscriber should be removed"
        
        print(f"✓ DELETE /api/mailing-lists/{list_id}/subscribers/{subscriber_id} - Removed subscriber")
    
    # ============ IMPORT/EXPORT TESTS ============
    
    def test_export_csv(self):
        """Test GET /api/mailing-lists/{id}/export - Export to CSV"""
        # Create list with subscribers
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Export_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Add some subscribers
        for i in range(3):
            self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers", json={
                "email": f"export_test_{i}@example.com",
                "name": f"Export Test {i}"
            })
        
        # Export CSV
        response = self.session.get(f"{BASE_URL}/api/mailing-lists/{list_id}/export")
        assert response.status_code == 200, f"Failed to export: {response.text}"
        assert "text/csv" in response.headers.get("content-type", ""), "Should return CSV content type"
        
        # Verify CSV content
        csv_content = response.text
        assert "email" in csv_content.lower(), "CSV should contain email header"
        assert "export_test_0@example.com" in csv_content, "CSV should contain subscriber emails"
        
        print(f"✓ GET /api/mailing-lists/{list_id}/export - Exported CSV successfully")
    
    def test_import_csv(self):
        """Test POST /api/mailing-lists/{id}/import - Import from CSV"""
        # Create list
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Import_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Create CSV content
        csv_content = "email,name,phone\nimport1@example.com,Import User 1,+1111111111\nimport2@example.com,Import User 2,+2222222222\nimport3@example.com,Import User 3,+3333333333"
        
        # Create file-like object
        files = {
            'file': ('test_import.csv', csv_content, 'text/csv')
        }
        
        # Remove Content-Type header for multipart upload
        headers = {"Authorization": self.session.headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/mailing-lists/{list_id}/import",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to import CSV: {response.text}"
        
        data = response.json()
        assert "imported" in data, "Response should contain imported count"
        assert data["imported"] == 3, f"Should import 3 subscribers, got {data['imported']}"
        
        # Verify subscribers were added
        list_response = self.session.get(f"{BASE_URL}/api/mailing-lists/{list_id}")
        subscribers = list_response.json().get("subscribers", [])
        assert len(subscribers) == 3, f"List should have 3 subscribers, got {len(subscribers)}"
        
        print(f"✓ POST /api/mailing-lists/{list_id}/import - Imported {data['imported']} subscribers")
    
    def test_import_csv_with_duplicates(self):
        """Test CSV import handles duplicates correctly"""
        # Create list
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Import_Duplicates_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Add existing subscriber
        self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers", json={
            "email": "existing@example.com",
            "name": "Existing User"
        })
        
        # Import CSV with duplicate
        csv_content = "email,name\nexisting@example.com,Duplicate User\nnew@example.com,New User"
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        headers = {"Authorization": self.session.headers["Authorization"]}
        
        response = requests.post(
            f"{BASE_URL}/api/mailing-lists/{list_id}/import",
            files=files,
            headers=headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["imported"] == 1, "Should import only 1 new subscriber"
        assert data["duplicates"] == 1, "Should report 1 duplicate"
        
        print(f"✓ CSV import correctly handled duplicates: {data['imported']} imported, {data['duplicates']} duplicates")
    
    def test_import_from_contacts(self):
        """Test POST /api/mailing-lists/{id}/import-from-contacts"""
        # Create list
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Import_Contacts_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Import from contacts
        response = self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/import-from-contacts")
        assert response.status_code == 200, f"Failed to import from contacts: {response.text}"
        
        data = response.json()
        assert "imported" in data, "Response should contain imported count"
        assert "duplicates" in data, "Response should contain duplicates count"
        
        print(f"✓ POST /api/mailing-lists/{list_id}/import-from-contacts - Imported {data['imported']} from contacts")
    
    def test_import_from_leads(self):
        """Test POST /api/mailing-lists/{id}/import-from-leads"""
        # Create list
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Import_Leads_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Import from leads
        response = self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/import-from-leads")
        assert response.status_code == 200, f"Failed to import from leads: {response.text}"
        
        data = response.json()
        assert "imported" in data, "Response should contain imported count"
        
        print(f"✓ POST /api/mailing-lists/{list_id}/import-from-leads - Imported {data['imported']} from leads")
    
    # ============ STATS VERIFICATION TESTS ============
    
    def test_subscriber_count_updates(self):
        """Test that subscriber_count updates correctly after CRUD operations"""
        # Create list
        create_response = self.session.post(f"{BASE_URL}/api/mailing-lists", json={
            "name": "TEST_Count_List",
            "category": "general"
        })
        list_id = create_response.json()["id"]
        self.created_list_ids.append(list_id)
        
        # Initial count should be 0
        lists_response = self.session.get(f"{BASE_URL}/api/mailing-lists")
        test_list = next((l for l in lists_response.json() if l["id"] == list_id), None)
        assert test_list["subscriber_count"] == 0, "Initial count should be 0"
        
        # Add subscribers
        for i in range(3):
            self.session.post(f"{BASE_URL}/api/mailing-lists/{list_id}/subscribers", json={
                "email": f"count_test_{i}@example.com"
            })
        
        # Check count updated
        lists_response = self.session.get(f"{BASE_URL}/api/mailing-lists")
        test_list = next((l for l in lists_response.json() if l["id"] == list_id), None)
        assert test_list["subscriber_count"] == 3, f"Count should be 3, got {test_list['subscriber_count']}"
        
        print("✓ Subscriber count updates correctly after CRUD operations")
    
    # ============ AUTHORIZATION TESTS ============
    
    def test_unauthorized_access(self):
        """Test that unauthenticated requests are rejected"""
        # Create new session without auth
        unauth_session = requests.Session()
        
        response = unauth_session.get(f"{BASE_URL}/api/mailing-lists")
        # API returns 401 or 403 for unauthorized access
        assert response.status_code in [401, 403], f"Should reject unauthenticated request, got {response.status_code}"
        
        print("✓ Unauthorized access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
