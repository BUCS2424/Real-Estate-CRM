"""
Jacquie Lawson Card Sending Service
Uses browser automation to send cards through jacquielawson.com
"""
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from playwright.async_api import async_playwright, Browser, Page
import logging

logger = logging.getLogger(__name__)


class JacquieLawsonService:
    """Service for automating Jacquie Lawson card sending"""
    
    def __init__(self):
        self.base_url = "https://www.jacquielawson.com"
        self.browser: Optional[Browser] = None
    
    async def _get_browser(self):
        """Get or create browser instance"""
        if not self.browser:
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
        return self.browser
    
    async def test_login(self, email: str, password: str) -> Dict[str, Any]:
        """Test if login credentials are valid"""
        try:
            browser = await self._get_browser()
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()
            
            # Go to login page
            await page.goto(f"{self.base_url}/signin", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            # Fill login form
            await page.fill('input[name="email"], input[type="email"], #email', email)
            await page.fill('input[name="password"], input[type="password"], #password', password)
            
            # Submit
            await page.click('button[type="submit"], input[type="submit"], .signin-button, #signin-button')
            await page.wait_for_timeout(5000)
            
            # Check if login was successful by looking for account indicators
            current_url = page.url
            page_content = await page.content()
            
            # Check for success indicators
            is_logged_in = (
                "signin" not in current_url.lower() and
                "login" not in current_url.lower() and
                ("account" in current_url.lower() or 
                 "my cards" in page_content.lower() or
                 "sign out" in page_content.lower() or
                 "log out" in page_content.lower())
            )
            
            await context.close()
            
            if is_logged_in:
                return {"success": True, "message": "Login successful"}
            else:
                # Check for error messages
                if "incorrect" in page_content.lower() or "invalid" in page_content.lower():
                    return {"success": False, "error": "Invalid email or password"}
                return {"success": False, "error": "Could not verify login - please check credentials"}
                
        except Exception as e:
            logger.error(f"Login test failed: {str(e)}")
            return {"success": False, "error": f"Connection error: {str(e)}"}
    
    async def send_card(
        self,
        queue_id: str,
        jl_email: str,
        jl_password: str,
        recipient_email: str,
        card_url: str,
        message: str,
        sender_name: str
    ) -> Dict[str, Any]:
        """Send a card to a recipient"""
        from database import db
        
        try:
            browser = await self._get_browser()
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()
            
            # Step 1: Login
            await page.goto(f"{self.base_url}/signin", wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(2000)
            
            await page.fill('input[name="email"], input[type="email"], #email', jl_email)
            await page.fill('input[name="password"], input[type="password"], #password', jl_password)
            await page.click('button[type="submit"], input[type="submit"], .signin-button')
            await page.wait_for_timeout(5000)
            
            # Step 2: Go to the card
            await page.goto(card_url, wait_until="networkidle", timeout=30000)
            await page.wait_for_timeout(3000)
            
            # Step 3: Click "Send this card" or similar button
            send_buttons = [
                'text="Send this card"',
                'text="Send card"',
                'text="Send"',
                '.send-card-button',
                '#send-card',
                'a[href*="send"]',
                'button:has-text("Send")'
            ]
            
            for selector in send_buttons:
                try:
                    if await page.locator(selector).count() > 0:
                        await page.click(selector, timeout=5000)
                        break
                except:
                    continue
            
            await page.wait_for_timeout(3000)
            
            # Step 4: Fill in the personalization form
            # Try to find and fill the message field
            message_selectors = [
                'textarea[name="message"]',
                '#message',
                '.message-input',
                'textarea'
            ]
            
            full_message = message
            if sender_name:
                full_message = f"{message}\n\n- {sender_name}" if message else f"With warm wishes,\n\n- {sender_name}"
            
            for selector in message_selectors:
                try:
                    if await page.locator(selector).count() > 0:
                        await page.fill(selector, full_message)
                        break
                except:
                    continue
            
            await page.wait_for_timeout(1000)
            
            # Step 5: Click to proceed to send/share page
            next_buttons = [
                'text="Next"',
                'text="Continue"',
                'text="Send or Share"',
                '.next-button',
                '#next'
            ]
            
            for selector in next_buttons:
                try:
                    if await page.locator(selector).count() > 0:
                        await page.click(selector, timeout=5000)
                        break
                except:
                    continue
            
            await page.wait_for_timeout(3000)
            
            # Step 6: Enter recipient email
            email_selectors = [
                'input[name="recipient_email"]',
                'input[name="to"]',
                'input[type="email"]:not([name="email"])',
                '#recipient-email',
                '.recipient-input'
            ]
            
            for selector in email_selectors:
                try:
                    if await page.locator(selector).count() > 0:
                        await page.fill(selector, recipient_email)
                        break
                except:
                    continue
            
            await page.wait_for_timeout(1000)
            
            # Step 7: Click final send button
            final_send_buttons = [
                'text="Send now"',
                'text="Send card"',
                'text="Send"',
                '.send-button',
                '#send-button',
                'button[type="submit"]:has-text("Send")'
            ]
            
            for selector in final_send_buttons:
                try:
                    if await page.locator(selector).count() > 0:
                        await page.click(selector, timeout=5000)
                        break
                except:
                    continue
            
            await page.wait_for_timeout(5000)
            
            # Check for success
            page_content = await page.content()
            success = (
                "sent" in page_content.lower() or
                "success" in page_content.lower() or
                "delivered" in page_content.lower() or
                "confirmation" in page_content.lower()
            )
            
            await context.close()
            
            # Update queue and history
            if success:
                await db.card_queue.update_one(
                    {"id": queue_id},
                    {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
                )
                
                # Move to history
                queue_entry = await db.card_queue.find_one({"id": queue_id})
                if queue_entry:
                    history_entry = {
                        **{k: v for k, v in queue_entry.items() if k != "_id"},
                        "status": "sent",
                        "sent_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.card_history.insert_one(history_entry)
                    await db.card_queue.delete_one({"id": queue_id})
                
                return {"success": True, "message": "Card sent successfully"}
            else:
                await db.card_queue.update_one(
                    {"id": queue_id},
                    {"$set": {"status": "failed", "error": "Could not confirm card was sent"}}
                )
                return {"success": False, "error": "Could not confirm card was sent"}
                
        except Exception as e:
            logger.error(f"Failed to send card: {str(e)}")
            
            # Update queue with error
            await db.card_queue.update_one(
                {"id": queue_id},
                {"$set": {"status": "failed", "error": str(e)}}
            )
            
            return {"success": False, "error": str(e)}
    
    async def get_card_categories(self) -> Dict[str, Any]:
        """Get available card categories from the website"""
        try:
            browser = await self._get_browser()
            context = await browser.new_context()
            page = await context.new_page()
            
            await page.goto(f"{self.base_url}/cards", wait_until="networkidle", timeout=30000)
            
            # Extract category links
            categories = await page.evaluate('''
                () => {
                    const links = document.querySelectorAll('a[href*="/cards/"]');
                    const cats = [];
                    links.forEach(link => {
                        const text = link.textContent?.trim();
                        const href = link.href;
                        if (text && href && !cats.some(c => c.name === text)) {
                            cats.push({ name: text, url: href });
                        }
                    });
                    return cats.slice(0, 20);
                }
            ''')
            
            await context.close()
            return {"categories": categories}
            
        except Exception as e:
            logger.error(f"Failed to get categories: {str(e)}")
            return {"categories": [], "error": str(e)}


# Singleton instance
jl_service = JacquieLawsonService()
