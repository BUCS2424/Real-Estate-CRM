#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class FusionBuilderAPITester:
    def __init__(self, base_url="https://realty-central-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (Expected: {expected_status})"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_seed_data(self):
        """Test seeding initial data"""
        print("\n🌱 Testing Data Seeding...")
        result = self.run_test("Seed Initial Data", "POST", "seed", 200)
        return result is not None

    def test_login(self):
        """Test login with superuser credentials"""
        print("\n🔐 Testing Authentication...")
        
        # Test login with superuser credentials
        login_data = {
            "email": "mel@a2gdesigns.com",
            "password": "BigDaddy2016!!"
        }
        
        result = self.run_test("Superuser Login", "POST", "auth/login", 200, login_data)
        
        if result and 'access_token' in result:
            self.token = result['access_token']
            self.user_id = result['user']['id']
            self.log_test("Token Extraction", True, f"User ID: {self.user_id}")
            return True
        else:
            self.log_test("Token Extraction", False, "No token received")
            return False

    def test_auth_me(self):
        """Test getting current user info"""
        result = self.run_test("Get Current User", "GET", "auth/me", 200)
        return result is not None

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard...")
        result = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        
        if result:
            expected_keys = ['contacts', 'deals', 'tasks', 'articles', 'pipeline_value', 'deals_by_stage']
            missing_keys = [key for key in expected_keys if key not in result]
            if missing_keys:
                self.log_test("Dashboard Stats Structure", False, f"Missing keys: {missing_keys}")
            else:
                self.log_test("Dashboard Stats Structure", True, "All required keys present")
        
        return result is not None

    def test_contacts_crud(self):
        """Test contacts CRUD operations"""
        print("\n👥 Testing Contacts...")
        
        # Create contact
        contact_data = {
            "name": "Test Contact",
            "email": "test@example.com",
            "phone": "(555) 123-4567",
            "company": "Test Company",
            "property_interest": "Luxury Condos",
            "budget": "$500K-$750K",
            "lead_score": 85,
            "status": "new",
            "notes": "Test contact for API testing",
            "tags": ["test", "api"]
        }
        
        create_result = self.run_test("Create Contact", "POST", "contacts", 200, contact_data)
        if not create_result:
            return False
        
        contact_id = create_result.get('id')
        if not contact_id:
            self.log_test("Contact ID Extraction", False, "No ID in response")
            return False
        
        # Get all contacts
        self.run_test("List Contacts", "GET", "contacts", 200)
        
        # Get specific contact
        self.run_test("Get Contact", "GET", f"contacts/{contact_id}", 200)
        
        # Update contact
        update_data = {**contact_data, "name": "Updated Test Contact", "lead_score": 90}
        self.run_test("Update Contact", "PUT", f"contacts/{contact_id}", 200, update_data)
        
        # Update lead score
        score_data = {"lead_score": 95}
        self.run_test("Update Lead Score", "PATCH", f"contacts/{contact_id}/score", 200, score_data)
        
        # Delete contact (admin only)
        self.run_test("Delete Contact", "DELETE", f"contacts/{contact_id}", 200)
        
        return True

    def test_deals_crud(self):
        """Test deals CRUD operations"""
        print("\n💼 Testing Deals...")
        
        # Create deal
        deal_data = {
            "title": "Test Deal",
            "value": 500000,
            "stage": "lead",
            "property_address": "123 Test St, Test City",
            "notes": "Test deal for API testing"
        }
        
        create_result = self.run_test("Create Deal", "POST", "deals", 200, deal_data)
        if not create_result:
            return False
        
        deal_id = create_result.get('id')
        if not deal_id:
            self.log_test("Deal ID Extraction", False, "No ID in response")
            return False
        
        # Get all deals
        self.run_test("List Deals", "GET", "deals", 200)
        
        # Get specific deal
        self.run_test("Get Deal", "GET", f"deals/{deal_id}", 200)
        
        # Update deal stage
        stage_data = {"stage": "qualified"}
        self.run_test("Update Deal Stage", "PATCH", f"deals/{deal_id}/stage", 200, stage_data)
        
        # Delete deal (admin only)
        self.run_test("Delete Deal", "DELETE", f"deals/{deal_id}", 200)
        
        return True

    def test_tasks_crud(self):
        """Test tasks CRUD operations"""
        print("\n✅ Testing Tasks...")
        
        # Create task
        task_data = {
            "title": "Test Task",
            "description": "Test task for API testing",
            "status": "todo",
            "priority": "high"
        }
        
        create_result = self.run_test("Create Task", "POST", "tasks", 200, task_data)
        if not create_result:
            return False
        
        task_id = create_result.get('id')
        if not task_id:
            self.log_test("Task ID Extraction", False, "No ID in response")
            return False
        
        # Get all tasks
        self.run_test("List Tasks", "GET", "tasks", 200)
        
        # Update task status
        status_data = {"status": "in_progress"}
        self.run_test("Update Task Status", "PATCH", f"tasks/{task_id}/status", 200, status_data)
        
        # Delete task
        self.run_test("Delete Task", "DELETE", f"tasks/{task_id}", 200)
        
        return True

    def test_articles_crud(self):
        """Test articles CRUD operations"""
        print("\n📝 Testing Articles...")
        
        # Create article
        article_data = {
            "title": "Test Article",
            "content": "This is a test article content for API testing.",
            "article_type": "email",
            "status": "draft"
        }
        
        create_result = self.run_test("Create Article", "POST", "articles", 200, article_data)
        if not create_result:
            return False
        
        article_id = create_result.get('id')
        if not article_id:
            self.log_test("Article ID Extraction", False, "No ID in response")
            return False
        
        # Get all articles
        self.run_test("List Articles", "GET", "articles", 200)
        
        # Update article
        update_data = {**article_data, "title": "Updated Test Article"}
        self.run_test("Update Article", "PUT", f"articles/{article_id}", 200, update_data)
        
        # Delete article
        self.run_test("Delete Article", "DELETE", f"articles/{article_id}", 200)
        
        return True

    def test_ai_generation(self):
        """Test AI content generation"""
        print("\n🤖 Testing AI Generation...")
        
        ai_data = {
            "prompt": "Write a short professional email to a real estate client",
            "article_type": "email"
        }
        
        result = self.run_test("AI Content Generation", "POST", "ai/generate", 200, ai_data)
        
        if result and 'content' in result:
            self.log_test("AI Content Structure", True, "Content generated successfully")
            return True
        else:
            self.log_test("AI Content Structure", False, "No content in response")
            return False

    def test_settings(self):
        """Test settings operations"""
        print("\n⚙️ Testing Settings...")
        
        # Get settings
        get_result = self.run_test("Get Settings", "GET", "settings", 200)
        if not get_result:
            return False
        
        # Update settings
        settings_data = {
            "theme": "dark",
            "notifications_enabled": False,
            "email_signature": "Test signature"
        }
        
        self.run_test("Update Settings", "PUT", "settings", 200, settings_data)
        
        return True

    def test_user_management(self):
        """Test user management (superuser only)"""
        print("\n👤 Testing User Management...")
        
        # Get all users (superuser only)
        result = self.run_test("List Users", "GET", "users", 200)
        
        if result and isinstance(result, list):
            self.log_test("Users List Structure", True, f"Found {len(result)} users")
        else:
            self.log_test("Users List Structure", False, "Invalid users list response")
        
        return result is not None

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Fusion Builder CRM API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity
        try:
            response = requests.get(f"{self.base_url}/api/", timeout=10)
            if response.status_code == 200:
                self.log_test("API Connectivity", True, "API is accessible")
            else:
                self.log_test("API Connectivity", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("API Connectivity", False, f"Connection failed: {str(e)}")
            return False
        
        # Seed data first
        if not self.test_seed_data():
            print("⚠️ Seeding failed, but continuing with tests...")
        
        # Authentication tests
        if not self.test_login():
            print("❌ Authentication failed - stopping tests")
            return False
        
        self.test_auth_me()
        
        # Core functionality tests
        self.test_dashboard_stats()
        self.test_contacts_crud()
        self.test_deals_crud()
        self.test_tasks_crud()
        self.test_articles_crud()
        self.test_ai_generation()
        self.test_settings()
        self.test_user_management()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("🎉 Backend API tests mostly successful!")
        elif success_rate >= 60:
            print("⚠️ Backend API has some issues but core functionality works")
        else:
            print("❌ Backend API has significant issues")
        
        return success_rate >= 60

def main():
    tester = FusionBuilderAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                'timestamp': datetime.now().isoformat()
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())