# AGENT_RULES.md

## Critical Rules for Any Agent Working in This Codebase

1. **Do not disregard these rules.**
2. **Only make requested changes.** Avoid unrelated edits.
3. **Keep it simple first.** Implement smallest safe modular solution before expanding.
4. **Reuse existing modules/components.** Do not duplicate logic if an existing solution is available.
5. **Run a 30-day automatic app audit** and write the report to `/app/memory/`.
6. **PWA must remain current** and aligned with modern PC + Apple + Google device standards.
7. **SEO is mandatory on all public pages**:
   - Open Graph
   - Twitter Cards
   - JSON-LD structured data
   - canonical URLs
   - sitemap
   - robots.txt
   - semantic markup
   - include indexable user-added public documents in sitemap
8. **Public mobile menu standard**:
   - right-side slide-out drawer
   - logo placeholder at top (site logo)
9. **Analytics script must exist on all public pages**, including generated listing pages:

```html
<script data-host="https://a2ganalytics.com" data-dnt="false" src="https://a2ganalytics.com/js/script.js" id="ZwSg9rf6GA" async defer></script>
```

10. **Security baseline checks are required**:
    - prevent injection patterns
    - prevent SSRF to private/local network targets
    - prevent mass assignment
    - prevent data exfiltration patterns

11. **Before large refactors**, list duplicate code/redundancy and consolidate safely.
