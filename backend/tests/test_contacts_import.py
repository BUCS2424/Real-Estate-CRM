"""
Test suite for Contacts Import API with dry_run and duplicate_mode features
Tests: CSV import, dry-run mode, duplicate handling (skip/update/create)
"""
import pytest
import requests
import os
import io

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
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ============ DRY RUN TESTS ============

class TestDryRunMode:
    """Test dry_run=true does NOT write to database"""
    
    def test_dry_run_returns_would_import_count(self, api_client):
        """Dry run should return would_import count without writing"""
        # Create a simple CSV
        csv_content = "first_name,last_name,email,phone\nTest,DryRun,testdryrun_unique123@example.com,5551234567"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        response = api_client.post(
            f"{BASE_URL}/api/contacts/import?dry_run=true&duplicate_mode=skip",
            files=files
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Verify dry_run response structure
        assert data.get("dry_run") == True, "dry_run flag should be True"
        assert "would_import" in data, "Response should have would_import field"
        assert "would_update" in data, "Response should have would_update field"
        assert data.get("imported") == 0, "imported should be 0 in dry run"
        assert data.get("updated") == 0, "updated should be 0 in dry run"
        print(f"✓ Dry run returned: would_import={data.get('would_import')}, would_update={data.get('would_update')}")
    
    def test_dry_run_does_not_persist_contacts(self, api_client):
        """Verify dry run does NOT create contacts in database"""
        unique_email = "dryrun_nopersist_test_xyz789@example.com"
        csv_content = f"first_name,last_name,email\nNoPersist,Test,{unique_email}"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        # Run dry import
        response = api_client.post(
            f"{BASE_URL}/api/contacts/import?dry_run=true&duplicate_mode=skip",
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("dry_run") == True
        assert data.get("would_import", 0) >= 1 or data.get("duplicates", 0) >= 0
        
        # Verify contact was NOT created by searching
        search_response = api_client.get(f"{BASE_URL}/api/contacts?search={unique_email}")
        assert search_response.status_code == 200
        contacts = search_response.json()
        
        # Filter for exact match
        matching = [c for c in contacts if c.get("email") == unique_email]
        assert len(matching) == 0, f"Dry run should NOT persist contacts, but found: {matching}"
        print("✓ Dry run did NOT persist contact to database")


# ============ DUPLICATE MODE TESTS ============

class TestDuplicateModeUpdate:
    """Test duplicate_mode=update updates existing contacts"""
    
    def test_update_mode_updates_existing_by_email(self, api_client):
        """Update mode should update existing contact matched by email"""
        # First create a contact
        unique_email = f"update_test_{os.urandom(4).hex()}@example.com"
        create_response = api_client.post(f"{BASE_URL}/api/contacts", json={
            "first_name": "Original",
            "last_name": "Name",
            "email": unique_email,
            "company": "Original Company"
        })
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created_contact = create_response.json()
        contact_id = created_contact.get("id")
        
        try:
            # Now import CSV with same email but different data
            csv_content = f"first_name,last_name,email,company\nUpdated,Person,{unique_email},New Company"
            files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
            
            response = api_client.post(
                f"{BASE_URL}/api/contacts/import?dry_run=false&duplicate_mode=update",
                files=files
            )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            
            assert data.get("updated", 0) >= 1, f"Expected at least 1 update, got: {data}"
            print(f"✓ Update mode: updated={data.get('updated')}, imported={data.get('imported')}")
            
            # Verify the contact was updated
            get_response = api_client.get(f"{BASE_URL}/api/contacts/{contact_id}")
            assert get_response.status_code == 200
            updated_contact = get_response.json()
            
            assert updated_contact.get("first_name") == "Updated", f"First name not updated: {updated_contact}"
            assert updated_contact.get("company") == "New Company", f"Company not updated: {updated_contact}"
            print(f"✓ Contact updated: first_name={updated_contact.get('first_name')}, company={updated_contact.get('company')}")
            
        finally:
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/contacts/{contact_id}")
    
    def test_update_mode_creates_new_if_no_match(self, api_client):
        """Update mode should create new contact if no duplicate found"""
        unique_email = f"newcontact_update_{os.urandom(4).hex()}@example.com"
        csv_content = f"first_name,last_name,email\nBrandNew,Contact,{unique_email}"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        response = api_client.post(
            f"{BASE_URL}/api/contacts/import?dry_run=false&duplicate_mode=update",
            files=files
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        assert data.get("imported", 0) >= 1, f"Expected at least 1 import for new contact: {data}"
        print(f"✓ Update mode created new contact: imported={data.get('imported')}")
        
        # Cleanup - find and delete
        search_response = api_client.get(f"{BASE_URL}/api/contacts?search={unique_email}")
        if search_response.status_code == 200:
            contacts = search_response.json()
            for c in contacts:
                if c.get("email") == unique_email:
                    api_client.delete(f"{BASE_URL}/api/contacts/{c.get('id')}")


class TestDuplicateModeSkip:
    """Test duplicate_mode=skip skips existing contacts"""
    
    def test_skip_mode_skips_duplicates(self, api_client):
        """Skip mode should skip contacts that already exist"""
        # First create a contact
        unique_email = f"skip_test_{os.urandom(4).hex()}@example.com"
        create_response = api_client.post(f"{BASE_URL}/api/contacts", json={
            "first_name": "Existing",
            "last_name": "Contact",
            "email": unique_email
        })
        assert create_response.status_code == 200
        contact_id = create_response.json().get("id")
        
        try:
            # Import CSV with same email
            csv_content = f"first_name,last_name,email\nDifferent,Name,{unique_email}"
            files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
            
            response = api_client.post(
                f"{BASE_URL}/api/contacts/import?dry_run=false&duplicate_mode=skip",
                files=files
            )
            
            assert response.status_code == 200, f"Import failed: {response.text}"
            data = response.json()
            
            assert data.get("duplicates", 0) >= 1, f"Expected at least 1 duplicate skipped: {data}"
            assert data.get("imported", 0) == 0, f"Should not import duplicates in skip mode: {data}"
            print(f"✓ Skip mode: duplicates={data.get('duplicates')}, imported={data.get('imported')}")
            
            # Verify original contact unchanged
            get_response = api_client.get(f"{BASE_URL}/api/contacts/{contact_id}")
            assert get_response.status_code == 200
            contact = get_response.json()
            assert contact.get("first_name") == "Existing", "Contact should not be modified in skip mode"
            
        finally:
            api_client.delete(f"{BASE_URL}/api/contacts/{contact_id}")


# ============ CR-SEPARATED CSV TESTS ============

class TestResilientCSVParser:
    """Test CSV parser handles CR-separated values (unusual format)"""
    
    def test_parse_cr_separated_csv(self, api_client):
        """Parser should handle CR-separated CSV format"""
        # Create CR-separated CSV (headers and values on separate lines with \r)
        cr_csv = "first_name\rlast_name\remail\rmobile_phone\rcompany\rTest\rUser\rtestcr@example.com\r5551234567\rTest Company"
        files = {'file': ('test.csv', io.BytesIO(cr_csv.encode()), 'text/csv')}
        
        response = api_client.post(
            f"{BASE_URL}/api/contacts/import?dry_run=true&duplicate_mode=skip",
            files=files
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        # Should parse at least 1 valid row
        total_processed = data.get("would_import", 0) + data.get("would_update", 0) + data.get("duplicates", 0)
        assert total_processed >= 1 or data.get("valid_rows", 0) >= 1, f"CR-separated CSV not parsed correctly: {data}"
        print(f"✓ CR-separated CSV parsed: valid_rows={data.get('valid_rows')}, would_import={data.get('would_import')}")


# ============ REAL CSV FILE TEST ============

class TestRealCSVFile:
    """Test with the actual CSV file from the user"""
    
    def test_import_real_csv_dry_run(self, api_client):
        """Test dry run with the actual CSV file"""
        csv_path = "/tmp/test_contacts.csv"
        
        if not os.path.exists(csv_path):
            pytest.skip("Test CSV file not found at /tmp/test_contacts.csv")
        
        with open(csv_path, 'rb') as f:
            files = {'file': ('contacts.csv', f, 'text/csv')}
            
            response = api_client.post(
                f"{BASE_URL}/api/contacts/import?dry_run=true&duplicate_mode=update",
                files=files
            )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        assert data.get("dry_run") == True, "Should be dry run"
        assert "would_import" in data, "Should have would_import"
        assert "would_update" in data, "Should have would_update"
        assert data.get("total_in_file", 0) > 0, f"Should have parsed contacts from file: {data}"
        
        print(f"✓ Real CSV dry run results:")
        print(f"  - Total in file: {data.get('total_in_file')}")
        print(f"  - Valid rows: {data.get('valid_rows')}")
        print(f"  - Would import: {data.get('would_import')}")
        print(f"  - Would update: {data.get('would_update')}")
        print(f"  - Duplicates: {data.get('duplicates')}")
        print(f"  - Skipped (no data): {data.get('skipped_no_data')}")
        
        # Verify preview examples if present
        if data.get("preview_examples"):
            print(f"  - Preview examples: {len(data.get('preview_examples'))}")
            for ex in data.get("preview_examples", [])[:3]:
                print(f"    - {ex.get('action')}: {ex.get('name')} ({ex.get('email')})")


# ============ API PARAMETER VALIDATION ============

class TestAPIParameters:
    """Test API query parameter handling"""
    
    def test_invalid_duplicate_mode_rejected(self, api_client):
        """Invalid duplicate_mode should return 400"""
        csv_content = "first_name,last_name,email\nTest,User,test@example.com"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        response = api_client.post(
            f"{BASE_URL}/api/contacts/import?dry_run=true&duplicate_mode=invalid_mode",
            files=files
        )
        
        assert response.status_code == 400, f"Should reject invalid duplicate_mode: {response.status_code}"
        print("✓ Invalid duplicate_mode correctly rejected with 400")
    
    def test_dry_run_false_actually_imports(self, api_client):
        """dry_run=false should actually import contacts"""
        unique_email = f"realimport_{os.urandom(4).hex()}@example.com"
        csv_content = f"first_name,last_name,email\nReal,Import,{unique_email}"
        files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        
        response = api_client.post(
            f"{BASE_URL}/api/contacts/import?dry_run=false&duplicate_mode=skip",
            files=files
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        
        assert data.get("dry_run") == False, "dry_run should be False"
        assert data.get("imported", 0) >= 1, f"Should have imported at least 1 contact: {data}"
        
        # Verify contact exists
        search_response = api_client.get(f"{BASE_URL}/api/contacts?search={unique_email}")
        assert search_response.status_code == 200
        contacts = search_response.json()
        matching = [c for c in contacts if c.get("email") == unique_email]
        assert len(matching) >= 1, f"Contact should exist after real import: {contacts}"
        print(f"✓ Real import created contact: {matching[0].get('first_name')} {matching[0].get('last_name')}")
        
        # Cleanup
        for c in matching:
            api_client.delete(f"{BASE_URL}/api/contacts/{c.get('id')}")


# ============ DUPLICATE MATCHING TESTS ============

class TestDuplicateMatching:
    """Test duplicate detection by email, phone, and name"""
    
    def test_duplicate_match_by_phone(self, api_client):
        """Should detect duplicate by phone number - using 'phone' field"""
        # Phone must be at least 10 digits for normalization
        import random
        unique_phone = f"813555{random.randint(1000, 9999)}"  # e.g., 8135551234 (10 digits)
        
        # Create contact with phone (using 'phone' field which is in ContactCreate)
        create_response = api_client.post(f"{BASE_URL}/api/contacts", json={
            "first_name": "Phone",
            "last_name": "Match",
            "phone": unique_phone  # Use 'phone' not 'mobile_phone'
        })
        assert create_response.status_code == 200
        contact_id = create_response.json().get("id")
        
        try:
            # Import with same phone in 'phone' field
            csv_content = f"first_name,last_name,phone\nDifferent,Name,{unique_phone}"
            files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
            
            response = api_client.post(
                f"{BASE_URL}/api/contacts/import?dry_run=true&duplicate_mode=update",
                files=files
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Should detect as update (duplicate by phone)
            assert data.get("would_update", 0) >= 1 or data.get("duplicates", 0) >= 1, \
                f"Should detect phone duplicate: {data}"
            print(f"✓ Phone duplicate detected: would_update={data.get('would_update')}")
            
        finally:
            api_client.delete(f"{BASE_URL}/api/contacts/{contact_id}")
    
    def test_duplicate_match_by_name(self, api_client):
        """Should detect duplicate by first+last name"""
        unique_suffix = os.urandom(4).hex()
        first_name = f"NameMatch{unique_suffix}"
        last_name = f"Test{unique_suffix}"
        
        # Create contact with unique name
        create_response = api_client.post(f"{BASE_URL}/api/contacts", json={
            "first_name": first_name,
            "last_name": last_name
        })
        assert create_response.status_code == 200
        contact_id = create_response.json().get("id")
        
        try:
            # Import with same name
            csv_content = f"first_name,last_name,company\n{first_name},{last_name},New Company"
            files = {'file': ('test.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
            
            response = api_client.post(
                f"{BASE_URL}/api/contacts/import?dry_run=true&duplicate_mode=update",
                files=files
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Should detect as update (duplicate by name)
            assert data.get("would_update", 0) >= 1 or data.get("duplicates", 0) >= 1, \
                f"Should detect name duplicate: {data}"
            print(f"✓ Name duplicate detected: would_update={data.get('would_update')}")
            
        finally:
            api_client.delete(f"{BASE_URL}/api/contacts/{contact_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
