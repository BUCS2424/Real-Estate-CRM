"""
Automated Mortgage Rate Fetcher
Fetches current mortgage rates from FRED (Federal Reserve Economic Data) API
and updates the database.

FRED Series IDs:
- MORTGAGE30US: 30-Year Fixed Rate Mortgage Average
- MORTGAGE15US: 15-Year Fixed Rate Mortgage Average
- MORTGAGE5US: 5/1-Year Adjustable Rate Mortgage Average
"""

import asyncio
import httpx
from datetime import datetime, timezone
from database import db
import os

# FRED API configuration
FRED_API_BASE = "https://api.stlouisfed.org/fred/series/observations"

# FRED Series IDs for mortgage rates
FRED_SERIES = {
    "MORTGAGE30US": "30yr_fixed",
    "MORTGAGE15US": "15yr_fixed",
    # Note: FHA/VA/USDA rates are not directly available from FRED
    # We'll estimate them based on conventional rates
}

# Typical spreads from conventional rates (approximate)
RATE_SPREADS = {
    "fha_spread": -0.375,      # FHA typically slightly lower than conventional
    "va_spread": -0.625,       # VA typically lower than conventional
    "usda_spread": -0.50,      # USDA typically lower than conventional
    "20yr_spread": -0.25,      # 20-year typically between 30 and 15
    "10yr_spread": -0.25,      # 10-year typically lower than 15-year
}


async def fetch_fred_rate(series_id: str, api_key: str) -> float | None:
    """Fetch the latest rate for a FRED series"""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                FRED_API_BASE,
                params={
                    "series_id": series_id,
                    "api_key": api_key,
                    "file_type": "json",
                    "limit": 1,
                    "sort_order": "desc"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                observations = data.get("observations", [])
                if observations:
                    value = observations[0].get("value")
                    if value and value != ".":
                        return float(value)
            else:
                print(f"[RATE FETCH] Error fetching {series_id}: HTTP {response.status_code}")
                
    except Exception as e:
        print(f"[RATE FETCH] Exception fetching {series_id}: {str(e)}")
    
    return None


async def fetch_and_update_rates(api_key: str = None) -> dict:
    """
    Fetch current mortgage rates from FRED and update the database.
    Returns the updated rates.
    """
    # Get API key from parameter, database, or environment
    if not api_key:
        settings = await db.rate_fetch_settings.find_one({}, {"_id": 0})
        api_key = settings.get("fred_api_key") if settings else None
    
    if not api_key:
        api_key = os.environ.get("FRED_API_KEY")
    
    if not api_key:
        return {"error": "No FRED API key configured"}
    
    print(f"[RATE FETCH] Starting rate fetch at {datetime.now(timezone.utc).isoformat()}")
    
    # Fetch rates from FRED
    rates = {}
    
    # Get 30-year fixed rate
    rate_30yr = await fetch_fred_rate("MORTGAGE30US", api_key)
    if rate_30yr:
        rates["conventional_30yr"] = round(rate_30yr, 3)
        print(f"[RATE FETCH] 30-Year Fixed: {rate_30yr}%")
    
    # Get 15-year fixed rate
    rate_15yr = await fetch_fred_rate("MORTGAGE15US", api_key)
    if rate_15yr:
        rates["conventional_15yr"] = round(rate_15yr, 3)
        print(f"[RATE FETCH] 15-Year Fixed: {rate_15yr}%")
    
    # Calculate derived rates if we have base rates
    if rate_30yr:
        # 20-year is typically between 30 and 15
        if rate_15yr:
            rates["conventional_20yr"] = round((rate_30yr + rate_15yr) / 2, 3)
        else:
            rates["conventional_20yr"] = round(rate_30yr + RATE_SPREADS["20yr_spread"], 3)
        
        # FHA rates
        rates["fha_30yr"] = round(rate_30yr + RATE_SPREADS["fha_spread"], 3)
        
        # VA rates
        rates["va_30yr"] = round(rate_30yr + RATE_SPREADS["va_spread"], 3)
        
        # USDA rates
        rates["usda_30yr"] = round(rate_30yr + RATE_SPREADS["usda_spread"], 3)
    
    if rate_15yr:
        # 10-year
        rates["conventional_10yr"] = round(rate_15yr + RATE_SPREADS["10yr_spread"], 3)
        
        # FHA 15-year
        rates["fha_15yr"] = round(rate_15yr + RATE_SPREADS["fha_spread"], 3)
        
        # VA 15-year
        rates["va_15yr"] = round(rate_15yr + RATE_SPREADS["va_spread"], 3)
    
    if rates:
        # Add metadata
        rates["last_updated"] = datetime.now(timezone.utc).isoformat()
        rates["updated_by"] = "FRED API (Automated)"
        rates["data_source"] = "Federal Reserve Economic Data (FRED)"
        
        # Update database
        await db.mortgage_rates.update_one(
            {},
            {"$set": rates},
            upsert=True
        )
        
        print(f"[RATE FETCH] Successfully updated {len(rates)} rates")
        return {"success": True, "rates": rates}
    else:
        print("[RATE FETCH] No rates fetched")
        return {"error": "Failed to fetch rates from FRED"}


async def schedule_rate_updates(interval_days: int = 7):
    """
    Background task to periodically update mortgage rates.
    Default: every 7 days (weekly, matching FRED's update schedule)
    """
    while True:
        try:
            result = await fetch_and_update_rates()
            print(f"[RATE FETCH] Scheduled update result: {result}")
        except Exception as e:
            print(f"[RATE FETCH] Scheduled update error: {str(e)}")
        
        # Wait for next update
        await asyncio.sleep(interval_days * 24 * 60 * 60)


# For manual testing
if __name__ == "__main__":
    import sys
    
    async def test():
        api_key = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("FRED_API_KEY")
        if not api_key:
            print("Usage: python rate_fetcher.py <FRED_API_KEY>")
            print("Or set FRED_API_KEY environment variable")
            return
        
        result = await fetch_and_update_rates(api_key)
        print(f"Result: {result}")
    
    asyncio.run(test())
