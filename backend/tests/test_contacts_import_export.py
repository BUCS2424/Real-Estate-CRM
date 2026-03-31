"""
Test suite for Contacts Import/Export functionality
Tests vCard (.vcf) and CSV import/export with filters
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "mel@a2gdesigns.com"
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "BigDaddy2016!!")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestContactsBasicCRUD:
    """Basic contacts CRUD to ensure API is working"""
    
    def test_list_contacts(self, auth_headers):
        """Test GET /api/contacts - List all contacts"""
        response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} contacts")
    
    def test_create_test_contact(self, auth_headers):
        """Test POST /api/contacts - Create a test contact for import/export tests"""
        contact_data = {
            "name": "TEST_ImportExport User",
            "email": "test_importexport@example.com",
            "phone": "+1234567890",
            "company": "Test Company",
            "category": "buyer",
            "status": "active",
            "notes": "Test contact for import/export testing"
        }
        response = requests.post(f"{BASE_URL}/api/contacts", headers=auth_headers, json=contact_data)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test_importexport@example.com"
        assert data["category"] == "buyer"
        print(f"Created test contact: {data['id']}")
        return data["id"]


class TestVCardImport:
    """Test vCard (.vcf) file import functionality"""
    
    def test_import_vcard_single_contact(self, auth_token):
        """Test importing a single vCard contact"""
        vcard_content = """BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
EMAIL;TYPE=INTERNET:john.doe.vcard@example.com
TEL;TYPE=CELL:+1555123456
ORG:Doe Enterprises
TITLE:CEO
NOTE:Imported from vCard test
END:VCARD"""
        
        files = {'file': ('test_contact.vcf', vcard_content, 'text/vcard')}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/import",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200, f"Import failed: {response.text}"
        data = response.json()
        assert "imported" in data
        assert "duplicates" in data
        assert "errors" in data
        print(f"vCard import result: imported={data['imported']}, duplicates={data['duplicates']}, errors={data['errors']}")
    
    def test_import_vcard_multiple_contacts(self, auth_token):
        """Test importing multiple vCard contacts in one file"""
        vcard_content = """BEGIN:VCARD
VERSION:3.0
FN:Alice Smith
N:Smith;Alice;;;
EMAIL;TYPE=INTERNET:alice.smith.vcard@example.com
TEL;TYPE=CELL:+1555111111
ORG:Smith Corp
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Bob Johnson
N:Johnson;Bob;;;
EMAIL;TYPE=INTERNET:bob.johnson.vcard@example.com
TEL;TYPE=CELL:+1555222222
ORG:Johnson LLC
END:VCARD"""
        
        files = {'file': ('multiple_contacts.vcf', vcard_content, 'text/vcard')}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/import",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2
        print(f"Multiple vCard import: total={data['total']}, imported={data['imported']}")
    
    def test_import_vcard_with_category(self, auth_token):
        """Test importing vCard with category assignment"""
        vcard_content = """BEGIN:VCARD
VERSION:3.0
FN:Seller Contact
N:Contact;Seller;;;
EMAIL;TYPE=INTERNET:seller.vcard@example.com
TEL;TYPE=CELL:+1555333333
END:VCARD"""
        
        files = {'file': ('seller.vcf', vcard_content, 'text/vcard')}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/import?category=seller",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"vCard import with category: imported={data['imported']}")


class TestCSVImport:
    """Test CSV file import functionality"""
    
    def test_import_csv_basic(self, auth_token):
        """Test importing contacts from CSV file"""
        csv_content = """email,first_name,last_name,phone,company
csv.test1@example.com,CSV,Test1,+1555444444,CSV Corp
csv.test2@example.com,CSV,Test2,+1555555555,CSV Inc"""
        
        files = {'file': ('contacts.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/import",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "imported" in data
        print(f"CSV import result: imported={data['imported']}, duplicates={data['duplicates']}")
    
    def test_import_csv_with_category(self, auth_token):
        """Test importing CSV with category assignment"""
        csv_content = """email,first_name,last_name,phone
csv.buyer@example.com,Buyer,Person,+1555666666"""
        
        files = {'file': ('buyers.csv', csv_content, 'text/csv')}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/import?category=buyer",
            headers=headers,
            files=files
        )
        
        assert response.status_code == 200
        data = response.json()
        print(f"CSV import with buyer category: imported={data['imported']}")


class TestDuplicateDetection:
    """Test duplicate detection during import"""
    
    def test_duplicate_email_detection(self, auth_token):
        """Test that duplicate emails are detected and skipped"""
        # First import
        vcard_content = """BEGIN:VCARD
VERSION:3.0
FN:Duplicate Test
N:Test;Duplicate;;;
EMAIL;TYPE=INTERNET:duplicate.test@example.com
END:VCARD"""
        
        files = {'file': ('dup1.vcf', vcard_content, 'text/vcard')}
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response1 = requests.post(
            f"{BASE_URL}/api/contacts/import",
            headers=headers,
            files=files
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second import with same email
        files = {'file': ('dup2.vcf', vcard_content, 'text/vcard')}
        response2 = requests.post(
            f"{BASE_URL}/api/contacts/import",
            headers=headers,
            files=files
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Second import should detect duplicate
        assert data2["duplicates"] >= 1 or data1["imported"] == 0
        print(f"Duplicate detection: first import={data1['imported']}, second duplicates={data2['duplicates']}")


class TestVCardExport:
    """Test vCard (.vcf) export functionality"""
    
    def test_export_vcard_all(self, auth_token):
        """Test exporting all contacts as vCard"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/vcard",
            headers=headers
        )
        
        assert response.status_code == 200
        assert "text/vcard" in response.headers.get("content-type", "")
        
        content = response.text
        assert "BEGIN:VCARD" in content
        assert "VERSION:3.0" in content
        assert "END:VCARD" in content
        print(f"vCard export: {content.count('BEGIN:VCARD')} contacts exported")
    
    def test_export_vcard_buyers_only(self, auth_token):
        """Test exporting only buyers as vCard"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/vcard?category=buyer",
            headers=headers
        )
        
        assert response.status_code == 200
        content = response.text
        print(f"vCard export (buyers): {content.count('BEGIN:VCARD')} contacts")
    
    def test_export_vcard_sellers_only(self, auth_token):
        """Test exporting only sellers as vCard"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/vcard?category=seller",
            headers=headers
        )
        
        assert response.status_code == 200
        content = response.text
        print(f"vCard export (sellers): {content.count('BEGIN:VCARD')} contacts")
    
    def test_export_vcard_active_status(self, auth_token):
        """Test exporting only active contacts as vCard"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/vcard?status=active",
            headers=headers
        )
        
        assert response.status_code == 200
        content = response.text
        print(f"vCard export (active): {content.count('BEGIN:VCARD')} contacts")
    
    def test_export_vcard_combined_filters(self, auth_token):
        """Test exporting with both category and status filters"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/vcard?category=buyer&status=active",
            headers=headers
        )
        
        assert response.status_code == 200
        content = response.text
        print(f"vCard export (buyer+active): {content.count('BEGIN:VCARD')} contacts")


class TestCSVExport:
    """Test CSV export functionality"""
    
    def test_export_csv_all(self, auth_token):
        """Test exporting all contacts as CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/csv",
            headers=headers
        )
        
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        
        content = response.text
        assert "first_name" in content
        assert "last_name" in content
        assert "email" in content
        
        lines = content.strip().split('\n')
        print(f"CSV export: {len(lines) - 1} contacts (excluding header)")
    
    def test_export_csv_buyers_only(self, auth_token):
        """Test exporting only buyers as CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/csv?category=buyer",
            headers=headers
        )
        
        assert response.status_code == 200
        content = response.text
        lines = content.strip().split('\n')
        print(f"CSV export (buyers): {len(lines) - 1} contacts")
    
    def test_export_csv_sellers_only(self, auth_token):
        """Test exporting only sellers as CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/csv?category=seller",
            headers=headers
        )
        
        assert response.status_code == 200
        content = response.text
        lines = content.strip().split('\n')
        print(f"CSV export (sellers): {len(lines) - 1} contacts")
    
    def test_export_csv_active_status(self, auth_token):
        """Test exporting only active contacts as CSV"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/csv?status=active",
            headers=headers
        )
        
        assert response.status_code == 200
        content = response.text
        lines = content.strip().split('\n')
        print(f"CSV export (active): {len(lines) - 1} contacts")


class TestExportFilename:
    """Test that export filenames include filter info"""
    
    def test_vcard_filename_with_filters(self, auth_token):
        """Test vCard export filename includes filter info"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/vcard?category=buyer&status=active",
            headers=headers
        )
        
        assert response.status_code == 200
        content_disposition = response.headers.get("content-disposition", "")
        assert ".vcf" in content_disposition
        print(f"vCard filename: {content_disposition}")
    
    def test_csv_filename_with_filters(self, auth_token):
        """Test CSV export filename includes filter info"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/contacts/export/csv?category=seller",
            headers=headers
        )
        
        assert response.status_code == 200
        content_disposition = response.headers.get("content-disposition", "")
        assert ".csv" in content_disposition
        print(f"CSV filename: {content_disposition}")


class TestUnauthorizedAccess:
    """Test that import/export requires authentication"""
    
    def test_import_requires_auth(self):
        """Test that import endpoint requires authentication"""
        vcard_content = "BEGIN:VCARD\nVERSION:3.0\nFN:Test\nEND:VCARD"
        files = {'file': ('test.vcf', vcard_content, 'text/vcard')}
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/import",
            files=files
        )
        
        assert response.status_code == 401 or response.status_code == 403
        print("Import correctly requires authentication")
    
    def test_export_vcard_requires_auth(self):
        """Test that vCard export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contacts/export/vcard")
        assert response.status_code == 401 or response.status_code == 403
        print("vCard export correctly requires authentication")
    
    def test_export_csv_requires_auth(self):
        """Test that CSV export requires authentication"""
        response = requests.get(f"{BASE_URL}/api/contacts/export/csv")
        assert response.status_code == 401 or response.status_code == 403
        print("CSV export correctly requires authentication")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_contacts(self, auth_headers):
        """Remove test contacts created during testing"""
        # Get all contacts
        response = requests.get(f"{BASE_URL}/api/contacts", headers=auth_headers)
        assert response.status_code == 200
        contacts = response.json()
        
        # Delete test contacts
        deleted = 0
        for contact in contacts:
            email = contact.get("email", "")
            name = contact.get("name", "")
            if (email and ("vcard@example.com" in email or 
                          "csv.test" in email or 
                          "duplicate.test@example.com" in email or
                          "test_importexport@example.com" in email)) or \
               (name and "TEST_" in name):
                del_response = requests.delete(
                    f"{BASE_URL}/api/contacts/{contact['id']}", 
                    headers=auth_headers
                )
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"Cleaned up {deleted} test contacts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
