# Duplicate / Redundancy Notes

Generated: 2026-03-30 (UTC)

## Current Observations

1. **Public footer blocks are repeated** across multiple public pages (About, Showcase, Property Detail, Newsletter, etc.).
   - Recommendation: move to shared `PublicSiteFooter` component.

2. **Public page hero/section spacing logic** is duplicated in several pages.
   - Recommendation: introduce a small shared `PublicPageContainer` utility.

3. **JSON-LD definitions** are page-local (intentional for SEO specificity), but common organization data repeats.
   - Recommendation: centralize base organization schema in one helper and merge page-specific fields.

4. **Some public pages still have custom visual headers** (by design), while navigation is centralized via `PublicSiteHeader`.
   - Recommendation: keep visual variants but avoid adding new standalone nav implementations.
