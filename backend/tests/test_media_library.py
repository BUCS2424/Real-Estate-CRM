"""
Media Library API Tests - Site Images 3-dot dropdown menu functionality
Tests for: Preview, Rename, Get URL, Delete operations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSiteImagesAPI:
    """Test Site Images API endpoints for 3-dot dropdown menu functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "mel@a2gdesigns.com", "password": "BigDaddy2016!!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_site_images(self):
        """Test GET /api/site-images - List all site images"""
        response = requests.get(
            f"{BASE_URL}/api/site-images",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to list site images: {response.text}"
        
        data = response.json()
        assert "images" in data, "Response should contain 'images' key"
        assert "count" in data, "Response should contain 'count' key"
        assert isinstance(data["images"], list), "Images should be a list"
        
        # Verify image structure
        if len(data["images"]) > 0:
            img = data["images"][0]
            assert "filename" in img, "Image should have 'filename'"
            assert "url" in img, "Image should have 'url'"
            assert "size" in img, "Image should have 'size'"
        
        print(f"Found {data['count']} site images")
    
    def test_rename_site_image_nonexistent(self):
        """Test PUT /api/site-images/{filename}/rename - Nonexistent file returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/site-images/nonexistent-file.png/rename",
            headers=self.headers,
            json={"new_name": "test.png"}
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent file: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        print("Rename nonexistent file correctly returns 404")
    
    def test_rename_site_image_invalid_name(self):
        """Test PUT /api/site-images/{filename}/rename - Invalid new name with path traversal"""
        # First get a valid filename
        list_response = requests.get(
            f"{BASE_URL}/api/site-images",
            headers=self.headers
        )
        if list_response.status_code == 200 and len(list_response.json().get("images", [])) > 0:
            filename = list_response.json()["images"][0]["filename"]
            
            # Try path traversal attack
            response = requests.put(
                f"{BASE_URL}/api/site-images/{filename}/rename",
                headers=self.headers,
                json={"new_name": "../../../etc/passwd"}
            )
            assert response.status_code == 400, f"Expected 400 for path traversal: {response.text}"
            print("Path traversal attack correctly blocked")
    
    def test_rename_site_image_success(self):
        """Test PUT /api/site-images/{filename}/rename - Successful rename"""
        # First get a valid filename
        list_response = requests.get(
            f"{BASE_URL}/api/site-images",
            headers=self.headers
        )
        assert list_response.status_code == 200
        
        images = list_response.json().get("images", [])
        if len(images) == 0:
            pytest.skip("No site images available for rename test")
        
        original_filename = images[0]["filename"]
        new_filename = f"test-renamed-{original_filename}"
        
        # Rename the file
        response = requests.put(
            f"{BASE_URL}/api/site-images/{original_filename}/rename",
            headers=self.headers,
            json={"new_name": new_filename}
        )
        assert response.status_code == 200, f"Rename failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Rename should return success=True"
        assert "new_url" in data, "Response should contain new_url"
        print(f"Successfully renamed {original_filename} to {new_filename}")
        
        # Verify the rename by listing images
        verify_response = requests.get(
            f"{BASE_URL}/api/site-images",
            headers=self.headers
        )
        assert verify_response.status_code == 200
        
        filenames = [img["filename"] for img in verify_response.json().get("images", [])]
        assert new_filename in filenames, "New filename should appear in list"
        assert original_filename not in filenames, "Original filename should not appear in list"
        
        # Rename back to original
        restore_response = requests.put(
            f"{BASE_URL}/api/site-images/{new_filename}/rename",
            headers=self.headers,
            json={"new_name": original_filename}
        )
        assert restore_response.status_code == 200, f"Restore failed: {restore_response.text}"
        print(f"Successfully restored filename to {original_filename}")
    
    def test_delete_site_image_nonexistent(self):
        """Test DELETE /api/site-images/{filename} - Nonexistent file returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/site-images/nonexistent-file.png",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent file: {response.text}"
        print("Delete nonexistent file correctly returns 404")
    
    def test_site_images_require_auth(self):
        """Test that site images endpoints require authentication"""
        # Test without auth header
        response = requests.get(f"{BASE_URL}/api/site-images")
        assert response.status_code in [401, 403], f"Expected 401 or 403 without auth: {response.text}"
        print("Site images endpoints correctly require authentication")


class TestMediaFolders:
    """Test Media Folders API for property files"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "mel@a2gdesigns.com", "password": "BigDaddy2016!!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_list_folders(self):
        """Test GET /api/media/folders - List property folders"""
        response = requests.get(
            f"{BASE_URL}/api/media/folders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to list folders: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of folders"
        
        if len(data) > 0:
            folder = data[0]
            assert "id" in folder, "Folder should have 'id'"
            assert "name" in folder, "Folder should have 'name'"
            print(f"Found {len(data)} property folders")
        else:
            print("No property folders found")
    
    def test_get_folder_contents(self):
        """Test GET /api/media/folders/{propertyId} - Get folder contents"""
        # First get a folder ID
        folders_response = requests.get(
            f"{BASE_URL}/api/media/folders",
            headers=self.headers
        )
        assert folders_response.status_code == 200
        
        folders = folders_response.json()
        if len(folders) == 0:
            pytest.skip("No property folders available")
        
        folder_id = folders[0]["id"]
        
        # Get folder contents
        response = requests.get(
            f"{BASE_URL}/api/media/folders/{folder_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get folder contents: {response.text}"
        
        data = response.json()
        assert "files" in data, "Response should contain 'files'"
        assert "subfolders" in data, "Response should contain 'subfolders'"
        print(f"Folder {folder_id} has {len(data['files'])} files and {len(data['subfolders'])} subfolders")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
