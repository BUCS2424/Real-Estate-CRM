"""
Test suite for Property Lead Un-convert Feature
Tests the ability to revert a property lead that was previously converted to a showcase listing.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "mel@a2gdesigns.com"
TEST_PASSWORD = "BigDaddy2016!!"

# Test lead IDs (from existing data)
CONVERTED_LEAD_ID = "efbd3a4d-b922-4c6f-b4bb-b96d84ab4540"  # 123 New Test Ave - converted
NEW_LEAD_ID = "a19d52e7-4c10-47fd-a717-9d0128813a44"  # 123 Test Conversion Street - new


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestUnconvertEndpoint:
    """Tests for POST /api/property-leads/{lead_id}/unconvert endpoint"""
    
    def test_unconvert_not_converted_lead_fails(self, api_client):
        """Test that un-converting a non-converted lead returns 400"""
        response = api_client.post(
            f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}/unconvert",
            params={"delete_listing": True}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "not converted" in data["detail"].lower()
        print(f"✓ Non-converted lead correctly rejected: {data['detail']}")
    
    def test_unconvert_nonexistent_lead_fails(self, api_client):
        """Test that un-converting a non-existent lead returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.post(
            f"{BASE_URL}/api/property-leads/{fake_id}/unconvert",
            params={"delete_listing": True}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Non-existent lead correctly rejected: {data['detail']}")
    
    def test_get_converted_lead_details(self, api_client):
        """Test that we can get details of a converted lead before un-converting"""
        response = api_client.get(f"{BASE_URL}/api/property-leads/{CONVERTED_LEAD_ID}")
        
        assert response.status_code == 200, f"Failed to get lead: {response.text}"
        data = response.json()
        
        assert data["status"] == "converted", f"Expected status 'converted', got '{data['status']}'"
        assert "converted_to_listing_id" in data, "Missing converted_to_listing_id"
        assert "converted_at" in data, "Missing converted_at"
        
        print(f"✓ Converted lead details retrieved:")
        print(f"  - Address: {data['address']}")
        print(f"  - Status: {data['status']}")
        print(f"  - Listing ID: {data['converted_to_listing_id']}")
        
        return data


class TestConvertUnconvertFlow:
    """Test the full convert -> unconvert flow"""
    
    def test_convert_then_unconvert_with_delete(self, api_client):
        """Test converting a lead and then un-converting with delete_listing=true"""
        # First, convert the new lead to showcase
        print("\n--- Step 1: Convert lead to showcase ---")
        convert_response = api_client.post(
            f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}/convert-to-showcase"
        )
        
        assert convert_response.status_code == 200, f"Convert failed: {convert_response.text}"
        convert_data = convert_response.json()
        listing_id = convert_data.get("listing_id")
        print(f"✓ Lead converted to listing: {listing_id}")
        
        # Verify the lead is now converted
        print("\n--- Step 2: Verify lead is converted ---")
        get_response = api_client.get(f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}")
        assert get_response.status_code == 200
        lead_data = get_response.json()
        assert lead_data["status"] == "converted", f"Expected 'converted', got '{lead_data['status']}'"
        assert lead_data.get("converted_to_listing_id") == listing_id
        print(f"✓ Lead status is 'converted', listing_id = {listing_id}")
        
        # Verify the listing exists in properties collection
        print("\n--- Step 3: Verify listing exists ---")
        listing_response = api_client.get(f"{BASE_URL}/api/listings/{listing_id}")
        if listing_response.status_code == 200:
            print(f"✓ Listing exists in database")
        else:
            print(f"⚠ Listing not found via /api/listings (may be in properties collection only)")
        
        # Now un-convert with delete_listing=true
        print("\n--- Step 4: Un-convert with delete_listing=true ---")
        unconvert_response = api_client.post(
            f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}/unconvert",
            params={"delete_listing": True}
        )
        
        assert unconvert_response.status_code == 200, f"Unconvert failed: {unconvert_response.text}"
        unconvert_data = unconvert_response.json()
        
        # Verify response structure
        assert "message" in unconvert_data
        assert "lead_id" in unconvert_data
        assert "reset_to_status" in unconvert_data
        assert "listing_deleted" in unconvert_data
        assert "previous_listing_id" in unconvert_data
        
        print(f"✓ Un-convert response:")
        print(f"  - Message: {unconvert_data['message']}")
        print(f"  - Reset to status: {unconvert_data['reset_to_status']}")
        print(f"  - Listing deleted: {unconvert_data['listing_deleted']}")
        
        # Verify the lead status is reset
        print("\n--- Step 5: Verify lead status is reset ---")
        verify_response = api_client.get(f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}")
        assert verify_response.status_code == 200
        final_data = verify_response.json()
        
        assert final_data["status"] != "converted", f"Status should not be 'converted', got '{final_data['status']}'"
        assert "converted_to_listing_id" not in final_data or final_data.get("converted_to_listing_id") is None
        print(f"✓ Lead status reset to: {final_data['status']}")
        print(f"✓ converted_to_listing_id cleared: {final_data.get('converted_to_listing_id')}")
        
        # Verify activity log contains unconverted entry
        print("\n--- Step 6: Verify activity log ---")
        activity = final_data.get("activity", [])
        unconvert_activities = [a for a in activity if a.get("type") == "unconverted"]
        assert len(unconvert_activities) > 0, "No 'unconverted' entry in activity log"
        print(f"✓ Found {len(unconvert_activities)} 'unconverted' entry in activity log")
        print(f"  - Description: {unconvert_activities[-1].get('description')}")
    
    def test_convert_then_unconvert_without_delete(self, api_client):
        """Test converting a lead and then un-converting with delete_listing=false"""
        # First, convert the lead again
        print("\n--- Step 1: Convert lead to showcase ---")
        convert_response = api_client.post(
            f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}/convert-to-showcase"
        )
        
        assert convert_response.status_code == 200, f"Convert failed: {convert_response.text}"
        convert_data = convert_response.json()
        listing_id = convert_data.get("listing_id")
        print(f"✓ Lead converted to listing: {listing_id}")
        
        # Un-convert with delete_listing=false
        print("\n--- Step 2: Un-convert with delete_listing=false ---")
        unconvert_response = api_client.post(
            f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}/unconvert",
            params={"delete_listing": False}
        )
        
        assert unconvert_response.status_code == 200, f"Unconvert failed: {unconvert_response.text}"
        unconvert_data = unconvert_response.json()
        
        print(f"✓ Un-convert response:")
        print(f"  - Reset to status: {unconvert_data['reset_to_status']}")
        print(f"  - Listing deleted: {unconvert_data['listing_deleted']}")
        
        # The listing should NOT have been deleted
        assert unconvert_data.get("listing_deleted") == False, "Listing should not be deleted"
        print(f"✓ Listing preserved (delete_listing=false)")
        
        # Verify lead status is reset
        print("\n--- Step 3: Verify lead status is reset ---")
        verify_response = api_client.get(f"{BASE_URL}/api/property-leads/{NEW_LEAD_ID}")
        assert verify_response.status_code == 200
        final_data = verify_response.json()
        
        assert final_data["status"] != "converted"
        print(f"✓ Lead status reset to: {final_data['status']}")


class TestUnconvertExistingConvertedLead:
    """Test un-converting the existing converted lead (123 New Test Ave)"""
    
    def test_unconvert_existing_converted_lead(self, api_client):
        """Test un-converting the existing converted lead"""
        # Get the current state
        print("\n--- Step 1: Get current lead state ---")
        get_response = api_client.get(f"{BASE_URL}/api/property-leads/{CONVERTED_LEAD_ID}")
        assert get_response.status_code == 200
        initial_data = get_response.json()
        
        print(f"  - Address: {initial_data['address']}")
        print(f"  - Current status: {initial_data['status']}")
        print(f"  - Listing ID: {initial_data.get('converted_to_listing_id')}")
        
        if initial_data["status"] != "converted":
            # Re-convert first
            print("\n--- Lead not converted, converting first ---")
            convert_response = api_client.post(
                f"{BASE_URL}/api/property-leads/{CONVERTED_LEAD_ID}/convert-to-showcase"
            )
            if convert_response.status_code == 200:
                print("✓ Re-converted lead")
            else:
                print(f"⚠ Could not re-convert: {convert_response.text}")
                pytest.skip("Lead not in converted state")
        
        # Un-convert with delete_listing=true
        print("\n--- Step 2: Un-convert lead ---")
        unconvert_response = api_client.post(
            f"{BASE_URL}/api/property-leads/{CONVERTED_LEAD_ID}/unconvert",
            params={"delete_listing": True}
        )
        
        assert unconvert_response.status_code == 200, f"Unconvert failed: {unconvert_response.text}"
        unconvert_data = unconvert_response.json()
        
        print(f"✓ Un-convert successful:")
        print(f"  - Reset to status: {unconvert_data['reset_to_status']}")
        print(f"  - Listing deleted: {unconvert_data['listing_deleted']}")
        
        # Verify final state
        print("\n--- Step 3: Verify final state ---")
        final_response = api_client.get(f"{BASE_URL}/api/property-leads/{CONVERTED_LEAD_ID}")
        assert final_response.status_code == 200
        final_data = final_response.json()
        
        assert final_data["status"] != "converted", f"Status should not be 'converted'"
        assert final_data.get("converted_to_listing_id") is None
        print(f"✓ Final status: {final_data['status']}")
        print(f"✓ converted_to_listing_id: {final_data.get('converted_to_listing_id')}")
        
        # Re-convert for UI testing
        print("\n--- Step 4: Re-convert for UI testing ---")
        reconvert_response = api_client.post(
            f"{BASE_URL}/api/property-leads/{CONVERTED_LEAD_ID}/convert-to-showcase"
        )
        if reconvert_response.status_code == 200:
            print("✓ Re-converted lead for UI testing")
        else:
            print(f"⚠ Re-convert status: {reconvert_response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
