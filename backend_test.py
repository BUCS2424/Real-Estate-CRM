#!/usr/bin/env python3
"""
Backend Testing Script for SEO/Security/Audit Changes
Tests the following endpoints:
1. GET /api/seo/sitemap.xml - Returns HTTP 200 and XML body with public routes
2. GET /api/seo/robots.txt - Returns HTTP 200 and contains sitemap URL
3. GET /health - Confirms backend health endpoint still works
4. Verify monthly audit report file exists at /app/memory/monthly_audit_report.md
5. GET /api/mls/my-listings - Quick regression test with auth token
"""

import asyncio
import aiohttp
import json
import os
import sys
import subprocess
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://haven-realty-admin-1.preview.emergentagent.com/api"

# Test credentials from previous testing
TEST_EMAIL = "mel@a2gdesigns.com"
TEST_PASSWORD = "BigDaddy2016!!"

class BackendTester:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.results = []
        
    async def setup(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            
    def log_result(self, test_name, success, details, response_code=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_code": response_code,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status} - {test_name}: {details}")
        
    async def authenticate(self):
        """Authenticate and get auth token"""
        try:
            login_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            async with self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data.get("access_token")
                    if self.auth_token:
                        self.log_result("Authentication", True, f"Successfully authenticated as {TEST_EMAIL}")
                        return True
                    else:
                        self.log_result("Authentication", False, "No access token in response")
                        return False
                else:
                    text = await response.text()
                    self.log_result("Authentication", False, f"Login failed: {response.status} - {text}")
                    return False
                    
        except Exception as e:
            self.log_result("Authentication", False, f"Authentication error: {str(e)}")
            return False
            
    async def test_sitemap_xml(self):
        """Test GET /api/seo/sitemap.xml"""
        try:
            async with self.session.get(f"{BACKEND_URL}/seo/sitemap.xml") as response:
                if response.status == 200:
                    content = await response.text()
                    content_type = response.headers.get('content-type', '')
                    
                    # Check if it's XML
                    if 'xml' in content_type.lower() or content.strip().startswith('<?xml'):
                        # Check for required public routes
                        required_routes = [
                            "/",
                            "/showcase", 
                            "/about",
                            "/mortgage-calculator",
                            "/newsletter-archive",
                            "/write-review"
                        ]
                        
                        missing_routes = []
                        for route in required_routes:
                            if route not in content:
                                missing_routes.append(route)
                                
                        if not missing_routes:
                            self.log_result(
                                "Sitemap XML", 
                                True, 
                                f"Returns HTTP 200 with XML content containing all required public routes",
                                response.status
                            )
                        else:
                            self.log_result(
                                "Sitemap XML", 
                                False, 
                                f"Missing routes in sitemap: {missing_routes}",
                                response.status
                            )
                    else:
                        self.log_result(
                            "Sitemap XML", 
                            False, 
                            f"Response is not XML format. Content-Type: {content_type}",
                            response.status
                        )
                else:
                    text = await response.text()
                    self.log_result(
                        "Sitemap XML", 
                        False, 
                        f"HTTP {response.status} - {text}",
                        response.status
                    )
                    
        except Exception as e:
            self.log_result("Sitemap XML", False, f"Request error: {str(e)}")
            
    async def test_robots_txt(self):
        """Test GET /api/seo/robots.txt"""
        try:
            async with self.session.get(f"{BACKEND_URL}/seo/robots.txt") as response:
                if response.status == 200:
                    content = await response.text()
                    content_type = response.headers.get('content-type', '')
                    
                    # Check if it's plain text
                    if 'text/plain' in content_type.lower():
                        # Check for sitemap URL
                        if 'sitemap.xml' in content.lower():
                            self.log_result(
                                "Robots.txt", 
                                True, 
                                f"Returns HTTP 200 with text/plain content containing sitemap URL",
                                response.status
                            )
                        else:
                            self.log_result(
                                "Robots.txt", 
                                False, 
                                f"Content does not contain sitemap URL reference",
                                response.status
                            )
                    else:
                        self.log_result(
                            "Robots.txt", 
                            False, 
                            f"Response is not text/plain format. Content-Type: {content_type}",
                            response.status
                        )
                else:
                    text = await response.text()
                    self.log_result(
                        "Robots.txt", 
                        False, 
                        f"HTTP {response.status} - {text}",
                        response.status
                    )
                    
        except Exception as e:
            self.log_result("Robots.txt", False, f"Request error: {str(e)}")
            
    async def test_health_endpoint(self):
        """Test GET /health"""
        try:
            # Health endpoint is at root level, not under /api
            health_url = BACKEND_URL.replace("/api", "/health")
            async with self.session.get(health_url) as response:
                if response.status == 200:
                    content_type = response.headers.get('content-type', '')
                    if 'application/json' in content_type:
                        data = await response.json()
                        if data.get("status") == "healthy":
                            self.log_result(
                                "Health Endpoint", 
                                True, 
                                f"Returns HTTP 200 with healthy status",
                                response.status
                            )
                        else:
                            self.log_result(
                                "Health Endpoint", 
                                False, 
                                f"Status is not 'healthy': {data}",
                                response.status
                            )
                    else:
                        # External health endpoint returns HTML (routed to frontend)
                        # Test internal backend health endpoint instead
                        try:
                            result = subprocess.run(['curl', '-s', 'http://localhost:8001/health'], 
                                                  capture_output=True, text=True, timeout=10)
                            if result.returncode == 0:
                                health_data = json.loads(result.stdout)
                                if health_data.get("status") == "healthy":
                                    self.log_result(
                                        "Health Endpoint", 
                                        True, 
                                        f"Internal backend health endpoint working (external routed to frontend)",
                                        200
                                    )
                                else:
                                    self.log_result(
                                        "Health Endpoint", 
                                        False, 
                                        f"Internal health status not healthy: {health_data}",
                                        200
                                    )
                            else:
                                self.log_result(
                                    "Health Endpoint", 
                                    False, 
                                    f"Internal health check failed: {result.stderr}",
                                    response.status
                                )
                        except Exception as e:
                            self.log_result(
                                "Health Endpoint", 
                                False, 
                                f"External returns HTML, internal check failed: {str(e)}",
                                response.status
                            )
                else:
                    text = await response.text()
                    self.log_result(
                        "Health Endpoint", 
                        False, 
                        f"HTTP {response.status} - {text}",
                        response.status
                    )
                    
        except Exception as e:
            self.log_result("Health Endpoint", False, f"Request error: {str(e)}")
            
    def test_monthly_audit_report(self):
        """Test that monthly audit report file exists"""
        try:
            audit_file_path = "/app/memory/monthly_audit_report.md"
            if os.path.exists(audit_file_path):
                # Check if file has content
                with open(audit_file_path, 'r') as f:
                    content = f.read().strip()
                    
                if content and "Monthly Agent Compliance Audit" in content:
                    self.log_result(
                        "Monthly Audit Report", 
                        True, 
                        f"File exists at {audit_file_path} with valid audit content"
                    )
                else:
                    self.log_result(
                        "Monthly Audit Report", 
                        False, 
                        f"File exists but content is invalid or empty"
                    )
            else:
                self.log_result(
                    "Monthly Audit Report", 
                    False, 
                    f"File does not exist at {audit_file_path}"
                )
                
        except Exception as e:
            self.log_result("Monthly Audit Report", False, f"File check error: {str(e)}")
            
    async def test_mls_my_listings(self):
        """Test GET /api/mls/my-listings with auth token (regression test)"""
        if not self.auth_token:
            self.log_result("MLS My Listings", False, "No auth token available")
            return
            
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            async with self.session.get(f"{BACKEND_URL}/mls/my-listings", headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    # Check for expected response structure
                    if isinstance(data, dict) and ("listings" in data or "configured" in data):
                        self.log_result(
                            "MLS My Listings", 
                            True, 
                            f"Returns HTTP 200 with valid response structure",
                            response.status
                        )
                    else:
                        self.log_result(
                            "MLS My Listings", 
                            False, 
                            f"Response structure is invalid: {data}",
                            response.status
                        )
                else:
                    text = await response.text()
                    self.log_result(
                        "MLS My Listings", 
                        False, 
                        f"HTTP {response.status} - {text}",
                        response.status
                    )
                    
        except Exception as e:
            self.log_result("MLS My Listings", False, f"Request error: {str(e)}")
            
    async def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend SEO/Security/Audit Testing")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        await self.setup()
        
        try:
            # Test 1: Health endpoint (no auth required)
            await self.test_health_endpoint()
            
            # Test 2: Sitemap XML (no auth required)
            await self.test_sitemap_xml()
            
            # Test 3: Robots.txt (no auth required)
            await self.test_robots_txt()
            
            # Test 4: Monthly audit report file (local file check)
            self.test_monthly_audit_report()
            
            # Test 5: Authenticate for protected endpoints
            auth_success = await self.authenticate()
            
            # Test 6: MLS My Listings (requires auth)
            if auth_success:
                await self.test_mls_my_listings()
            else:
                self.log_result("MLS My Listings", False, "Skipped due to authentication failure")
                
        finally:
            await self.cleanup()
            
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r["success"])
        total = len(self.results)
        
        for result in self.results:
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            code_info = f" (HTTP {result['response_code']})" if result.get('response_code') else ""
            print(f"{status} - {result['test']}{code_info}")
            
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) failed")
            return False

async def main():
    """Main test runner"""
    tester = BackendTester()
    success = await tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())