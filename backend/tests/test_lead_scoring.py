"""
Lead Scoring API Tests
Tests for CRUD operations on scoring rules and scoring endpoints
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
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestLeadScoringRulesGet:
    """Test GET endpoints for scoring rules"""
    
    def test_get_all_rules(self, auth_headers):
        """Test GET /api/lead-scoring/rules returns rules list"""
        response = requests.get(f"{BASE_URL}/api/lead-scoring/rules", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get rules: {response.text}"
        data = response.json()
        assert "rules" in data
        assert isinstance(data["rules"], list)
        print(f"Found {len(data['rules'])} total rules")
    
    def test_get_rules_by_lead_type_property_seller(self, auth_headers):
        """Test GET /api/lead-scoring/rules?lead_type=property_seller"""
        response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules?lead_type=property_seller", 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "rules" in data
        # All returned rules should be property_seller type
        for rule in data["rules"]:
            assert rule["lead_type"] == "property_seller"
        print(f"Found {len(data['rules'])} property_seller rules")
    
    def test_get_rules_by_lead_type_buyer(self, auth_headers):
        """Test GET /api/lead-scoring/rules?lead_type=buyer"""
        response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules?lead_type=buyer", 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "rules" in data
        for rule in data["rules"]:
            assert rule["lead_type"] == "buyer"
        print(f"Found {len(data['rules'])} buyer rules")
    
    def test_get_rules_by_category(self, auth_headers):
        """Test GET /api/lead-scoring/rules?category=contact_info"""
        response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules?category=contact_info", 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "rules" in data
        for rule in data["rules"]:
            assert rule["category"] == "contact_info"
        print(f"Found {len(data['rules'])} contact_info rules")


class TestLeadScoringRulesCRUD:
    """Test CRUD operations for scoring rules"""
    
    def test_create_rule(self, auth_headers):
        """Test POST /api/lead-scoring/rules creates new rule"""
        rule_data = {
            "name": "TEST_High Equity Property",
            "description": "Property has high equity value",
            "lead_type": "property_seller",
            "category": "value_info",
            "conditions": [
                {"field": "estimated_value", "operator": "greater_than", "value": "750000"}
            ],
            "points": 25,
            "is_active": True,
            "ai_verified": False,
            "priority": 7
        }
        
        response = requests.post(
            f"{BASE_URL}/api/lead-scoring/rules", 
            json=rule_data, 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to create rule: {response.text}"
        data = response.json()
        assert "rule" in data
        assert data["rule"]["name"] == rule_data["name"]
        assert data["rule"]["points"] == rule_data["points"]
        assert "id" in data["rule"]
        
        # Store rule ID for later tests
        TestLeadScoringRulesCRUD.created_rule_id = data["rule"]["id"]
        print(f"Created rule with ID: {data['rule']['id']}")
    
    def test_get_single_rule(self, auth_headers):
        """Test GET /api/lead-scoring/rules/{id} returns single rule"""
        rule_id = getattr(TestLeadScoringRulesCRUD, 'created_rule_id', None)
        if not rule_id:
            pytest.skip("No rule ID from create test")
        
        response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}", 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == rule_id
        assert data["name"] == "TEST_High Equity Property"
        print(f"Retrieved rule: {data['name']}")
    
    def test_update_rule(self, auth_headers):
        """Test PUT /api/lead-scoring/rules/{id} updates rule"""
        rule_id = getattr(TestLeadScoringRulesCRUD, 'created_rule_id', None)
        if not rule_id:
            pytest.skip("No rule ID from create test")
        
        update_data = {
            "name": "TEST_Updated High Equity Property",
            "points": 30,
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}", 
            json=update_data, 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to update rule: {response.text}"
        data = response.json()
        assert data["rule"]["name"] == update_data["name"]
        assert data["rule"]["points"] == update_data["points"]
        
        # Verify update persisted with GET
        get_response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}", 
            headers=auth_headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == update_data["name"]
        assert get_data["points"] == update_data["points"]
        print(f"Updated rule: {get_data['name']} with {get_data['points']} points")
    
    def test_toggle_rule(self, auth_headers):
        """Test POST /api/lead-scoring/rules/{id}/toggle toggles active status"""
        rule_id = getattr(TestLeadScoringRulesCRUD, 'created_rule_id', None)
        if not rule_id:
            pytest.skip("No rule ID from create test")
        
        # Get current status
        get_response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}", 
            headers=auth_headers
        )
        original_status = get_response.json()["is_active"]
        
        # Toggle
        response = requests.post(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}/toggle", 
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] != original_status
        
        # Toggle back
        response2 = requests.post(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}/toggle", 
            headers=auth_headers
        )
        assert response2.status_code == 200
        assert response2.json()["is_active"] == original_status
        print(f"Toggle test passed - status toggled from {original_status} and back")
    
    def test_delete_rule(self, auth_headers):
        """Test DELETE /api/lead-scoring/rules/{id} deletes rule"""
        rule_id = getattr(TestLeadScoringRulesCRUD, 'created_rule_id', None)
        if not rule_id:
            pytest.skip("No rule ID from create test")
        
        response = requests.delete(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}", 
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Verify deletion with GET
        get_response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules/{rule_id}", 
            headers=auth_headers
        )
        assert get_response.status_code == 404
        print(f"Deleted rule {rule_id} successfully")


class TestLeadScoringMetadata:
    """Test metadata endpoints for scoring rules"""
    
    def test_get_fields(self, auth_headers):
        """Test GET /api/lead-scoring/fields returns field definitions"""
        response = requests.get(f"{BASE_URL}/api/lead-scoring/fields", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have property_seller and buyer field definitions
        assert "property_seller" in data
        assert "buyer" in data
        
        # Check property_seller has expected categories
        assert "contact_info" in data["property_seller"]
        assert "property_details" in data["property_seller"]
        assert "value_info" in data["property_seller"]
        
        # Check buyer has expected categories
        assert "contact_info" in data["buyer"]
        assert "preferences" in data["buyer"]
        assert "qualification" in data["buyer"]
        
        print(f"Fields endpoint returned definitions for property_seller and buyer")
    
    def test_get_operators(self, auth_headers):
        """Test GET /api/lead-scoring/operators returns operator definitions"""
        response = requests.get(f"{BASE_URL}/api/lead-scoring/operators", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check for expected operators
        operator_values = [op["value"] for op in data]
        assert "exists" in operator_values
        assert "equals" in operator_values
        assert "greater_than" in operator_values
        assert "is_true" in operator_values
        
        print(f"Operators endpoint returned {len(data)} operators")
    
    def test_get_stats(self, auth_headers):
        """Test GET /api/lead-scoring/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/lead-scoring/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "rules" in data
        assert "scored_leads" in data
        
        # Check rules stats
        assert "total" in data["rules"]
        assert "property_seller" in data["rules"]
        assert "buyer" in data["rules"]
        assert "active" in data["rules"]
        
        # Check scored leads stats
        assert "property_seller" in data["scored_leads"]
        assert "buyer" in data["scored_leads"]
        
        print(f"Stats: {data['rules']['total']} total rules, {data['rules']['active']} active")


class TestLeadScoringValidation:
    """Test validation and error handling"""
    
    def test_get_invalid_rule_id(self, auth_headers):
        """Test GET with invalid rule ID returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules/invalid-id", 
            headers=auth_headers
        )
        assert response.status_code == 400
        print("Invalid rule ID correctly returns 400")
    
    def test_get_nonexistent_rule(self, auth_headers):
        """Test GET with nonexistent rule ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/lead-scoring/rules/507f1f77bcf86cd799439011", 
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Nonexistent rule correctly returns 404")
    
    def test_create_rule_missing_name(self, auth_headers):
        """Test POST without name returns validation error"""
        rule_data = {
            "lead_type": "property_seller",
            "category": "value_info",
            "conditions": [{"field": "estimated_value", "operator": "exists"}],
            "points": 10
        }
        
        response = requests.post(
            f"{BASE_URL}/api/lead-scoring/rules", 
            json=rule_data, 
            headers=auth_headers
        )
        # Should fail validation (422) because name is required
        assert response.status_code == 422
        print("Missing name correctly returns 422 validation error")
    
    def test_delete_nonexistent_rule(self, auth_headers):
        """Test DELETE with nonexistent rule ID returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/lead-scoring/rules/507f1f77bcf86cd799439011", 
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Delete nonexistent rule correctly returns 404")


class TestLeadScoringAuth:
    """Test authentication requirements"""
    
    def test_get_rules_without_auth(self):
        """Test GET /api/lead-scoring/rules without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/lead-scoring/rules")
        assert response.status_code == 401
        print("Unauthenticated request correctly returns 401")
    
    def test_create_rule_without_auth(self):
        """Test POST /api/lead-scoring/rules without auth returns 401"""
        rule_data = {
            "name": "Test Rule",
            "lead_type": "property_seller",
            "category": "value_info",
            "conditions": [{"field": "estimated_value", "operator": "exists"}],
            "points": 10
        }
        response = requests.post(f"{BASE_URL}/api/lead-scoring/rules", json=rule_data)
        assert response.status_code == 401
        print("Unauthenticated create correctly returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
