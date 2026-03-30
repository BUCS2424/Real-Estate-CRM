import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Hidden Haven Realty';
const DEFAULT_DESCRIPTION = 'Luxury real estate listings, private showings, and trusted local market expertise with Hidden Haven Realty.';
const DEFAULT_IMAGE = 'https://customer-assets.emergentagent.com/job_096c795f-2f6d-4346-886a-63ca7ee0963b/artifacts/0gvwgebj_hidden-haven-realty.png';

const buildCanonicalUrl = (urlPath) => {
  if (typeof window === 'undefined') {
    return urlPath || '';
  }

  const origin = window.location.origin;
  const path = urlPath || window.location.pathname;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  return `${origin}${path}`;
};

export const PublicSeoHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  urlPath,
  type = 'website',
  keywords,
  jsonLd = []
}) => {
  const canonicalUrl = buildCanonicalUrl(urlPath);
  const finalTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const finalKeywords = keywords || 'luxury real estate, homes for sale, property listings, tampa real estate, hidden haven realty';

  const schemaItems = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

  return (
    <Helmet prioritizeSeoTags>
      <title>{finalTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <script
        data-host="https://a2ganalytics.com"
        data-dnt="false"
        src="https://a2ganalytics.com/js/script.js"
        id="ZwSg9rf6GA"
        async
        defer
      />

      {schemaItems
        .filter(Boolean)
        .map((schema, index) => (
          <script
            key={`schema-${index}`}
            type="application/ld+json"
          >
            {JSON.stringify(schema)}
          </script>
        ))}
    </Helmet>
  );
};

export default PublicSeoHead;