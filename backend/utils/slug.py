"""
Utility functions for generating URL-friendly slugs
"""
import re
import unicodedata


def generate_property_slug(address: str, city: str, state: str, zip_code: str) -> str:
    """
    Generate a URL-friendly slug for a property from its address components.
    
    Example: "804 S Davis Blvd", "Tampa", "FL", "33606" 
             -> "804-s-davis-blvd-tampa-fl-33606"
    """
    # Combine address parts
    parts = [address, city, state, zip_code]
    full_address = " ".join(p for p in parts if p)
    
    # Normalize unicode characters
    slug = unicodedata.normalize('NFKD', full_address)
    slug = slug.encode('ascii', 'ignore').decode('ascii')
    
    # Convert to lowercase
    slug = slug.lower()
    
    # Replace common abbreviations to make cleaner URLs
    replacements = {
        ' boulevard': ' blvd',
        ' street': ' st',
        ' avenue': ' ave',
        ' drive': ' dr',
        ' road': ' rd',
        ' lane': ' ln',
        ' court': ' ct',
        ' place': ' pl',
        ' circle': ' cir',
        ' highway': ' hwy',
        ' parkway': ' pkwy',
        ' terrace': ' ter',
        ' north': ' n',
        ' south': ' s',
        ' east': ' e',
        ' west': ' w',
        ' apartment': ' apt',
        ' suite': ' ste',
        ' unit': ' unit',
        '#': '',
    }
    for old, new in replacements.items():
        slug = slug.replace(old, new)
    
    # Remove special characters, keep alphanumeric and spaces
    slug = re.sub(r'[^\w\s-]', '', slug)
    
    # Replace spaces and multiple dashes with single dash
    slug = re.sub(r'[-\s]+', '-', slug)
    
    # Remove leading/trailing dashes
    slug = slug.strip('-')
    
    return slug


def ensure_unique_slug(base_slug: str, existing_slugs: list) -> str:
    """
    Ensure the slug is unique by appending a number if necessary.
    
    Example: If "804-s-davis-blvd-tampa-fl-33606" exists,
             returns "804-s-davis-blvd-tampa-fl-33606-2"
    """
    if base_slug not in existing_slugs:
        return base_slug
    
    counter = 2
    while f"{base_slug}-{counter}" in existing_slugs:
        counter += 1
    
    return f"{base_slug}-{counter}"
