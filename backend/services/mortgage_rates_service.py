"""
Mortgage Rates Service - Fetches real-time mortgage rates from FRED API
Federal Reserve Economic Data (FRED) provides free, reliable mortgage rate data
"""
import os
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

# FRED Series IDs for different mortgage rates
FRED_SERIES = {
    "MORTGAGE30US": "conventional_30yr",  # 30-Year Fixed Rate
    "MORTGAGE15US": "conventional_15yr",  # 15-Year Fixed Rate
}

async def fetch_fred_rate(series_id: str, api_key: str) -> Optional[float]:
    """Fetch a single mortgage rate from FRED API"""
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": api_key,
        "file_type": "json",
        "sort_order": "desc",  # Most recent first
        "limit": 1  # Just get the latest observation
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            observations = data.get("observations", [])
            if observations and observations[0].get("value") != ".":
                rate = float(observations[0]["value"])
                date = observations[0].get("date", "Unknown")
                logger.info(f"FRED {series_id}: {rate}% (as of {date})")
                return rate
            else:
                logger.warning(f"No valid data for FRED series {series_id}")
                return None
    except Exception as e:
        logger.error(f"Error fetching FRED series {series_id}: {str(e)}")
        return None

async def fetch_all_rates(api_key: str) -> Dict[str, Any]:
    """Fetch all available mortgage rates from FRED"""
    rates = {}
    
    for series_id, rate_key in FRED_SERIES.items():
        rate = await fetch_fred_rate(series_id, api_key)
        if rate is not None:
            rates[rate_key] = rate
    
    # Estimate other rates based on 30-year rate if we got it
    # These are typical spreads in the mortgage market
    if "conventional_30yr" in rates:
        base_rate = rates["conventional_30yr"]
        
        # Estimate other conventional rates if not fetched directly
        if "conventional_20yr" not in rates:
            rates["conventional_20yr"] = round(base_rate - 0.25, 3)  # 20yr typically ~0.25% lower
        if "conventional_15yr" not in rates:
            # Use fetched value or estimate
            pass  # Already in FRED_SERIES
        if "conventional_10yr" not in rates:
            rates["conventional_10yr"] = round(base_rate - 1.0, 3)  # 10yr typically ~1% lower
        
        # Government loan estimates (typically slightly lower than conventional)
        if "fha_30yr" not in rates:
            rates["fha_30yr"] = round(base_rate - 0.375, 3)  # FHA typically ~0.375% lower
        if "fha_15yr" not in rates:
            rates["fha_15yr"] = round(base_rate - 1.0, 3)
        
        if "va_30yr" not in rates:
            rates["va_30yr"] = round(base_rate - 0.625, 3)  # VA typically ~0.625% lower
        if "va_15yr" not in rates:
            rates["va_15yr"] = round(base_rate - 1.125, 3)
        
        if "usda_30yr" not in rates:
            rates["usda_30yr"] = round(base_rate - 0.5, 3)  # USDA typically ~0.5% lower
    
    return rates

async def update_mortgage_rates_from_fred(db) -> Dict[str, Any]:
    """
    Main function to update mortgage rates from FRED API
    Called by the scheduler and can be called manually
    """
    api_key = os.environ.get("FRED_API_KEY")
    
    if not api_key:
        logger.error("FRED_API_KEY not configured. Cannot auto-update mortgage rates.")
        return {
            "success": False,
            "error": "FRED API key not configured",
            "message": "Please add FRED_API_KEY to your environment variables"
        }
    
    logger.info("Starting mortgage rate update from FRED API...")
    
    try:
        # Fetch current rates from FRED
        new_rates = await fetch_all_rates(api_key)
        
        if not new_rates:
            return {
                "success": False,
                "error": "No rates returned from FRED API",
                "message": "The FRED API did not return any valid data"
            }
        
        # Get current rates from database to preserve non-FRED values
        current = await db.mortgage_rates.find_one({}, {"_id": 0})
        
        # Merge new rates with existing settings (preserve user-configured values like tax rates)
        if current:
            # Only update the interest rates, preserve other settings
            for key in new_rates:
                current[key] = new_rates[key]
            updated_rates = current
        else:
            # No existing rates, create with defaults + FRED data
            updated_rates = {
                # FRED fetched rates
                **new_rates,
                # Default calculation rates (not from FRED)
                "property_tax_rate": 1.1,
                "insurance_rate": 0.35,
                "pmi_rate_under_10": 1.0,
                "pmi_rate_10_to_20": 0.5,
                "fha_mip_upfront": 1.75,
                "fha_mip_annual": 0.85,
                "va_funding_fee": 2.15,
                "usda_guarantee_fee": 1.0,
                "usda_annual_fee": 0.35
            }
        
        # Add metadata
        updated_rates["last_updated"] = datetime.now(timezone.utc).isoformat()
        updated_rates["updated_by"] = "FRED API (Automated)"
        updated_rates["data_source"] = "Federal Reserve Economic Data"
        updated_rates["auto_updated"] = True
        
        # Save to database
        await db.mortgage_rates.update_one(
            {},
            {"$set": updated_rates},
            upsert=True
        )
        
        logger.info(f"Mortgage rates updated successfully. 30yr: {new_rates.get('conventional_30yr')}%")
        
        return {
            "success": True,
            "message": "Mortgage rates updated from FRED API",
            "rates_updated": list(new_rates.keys()),
            "conventional_30yr": new_rates.get("conventional_30yr"),
            "last_updated": updated_rates["last_updated"]
        }
        
    except Exception as e:
        logger.error(f"Error updating mortgage rates: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to update mortgage rates from FRED API"
        }

def get_next_update_time(scheduler) -> Optional[str]:
    """Get the next scheduled update time"""
    try:
        job = scheduler.get_job("mortgage_rate_update")
        if job and job.next_run_time:
            return job.next_run_time.isoformat()
    except:
        pass
    return None
