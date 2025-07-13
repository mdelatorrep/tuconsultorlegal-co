import { useEffect } from "react";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  structuredData?: any;
}

export const useSEO = ({
  title,
  description,
  keywords,
  canonical,
  ogImage,
  structuredData
}: SEOProps) => {
  useEffect(() => {
    // Update document title
    if (title) {
      document.title = title;
    }

    // Update meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }

    // Update meta keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords);
    }

    // Update canonical URL
    if (canonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonical);
    }

    // Update Open Graph title
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', title);
      }
    }

    // Update Open Graph description
    if (description) {
      let ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', description);
      }
    }

    // Update Open Graph image
    if (ogImage) {
      let ogImageMeta = document.querySelector('meta[property="og:image"]');
      if (ogImageMeta) {
        ogImageMeta.setAttribute('content', ogImage);
      }
    }

    // Update Open Graph URL
    if (canonical) {
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute('content', canonical);
      }
    }

    // Update Twitter title
    if (title) {
      let twitterTitle = document.querySelector('meta[property="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', title);
      }
    }

    // Update Twitter description
    if (description) {
      let twitterDescription = document.querySelector('meta[property="twitter:description"]');
      if (twitterDescription) {
        twitterDescription.setAttribute('content', description);
      }
    }

    // Update Twitter image
    if (ogImage) {
      let twitterImage = document.querySelector('meta[property="twitter:image"]');
      if (twitterImage) {
        twitterImage.setAttribute('content', ogImage);
      }
    }

    // Add or update structured data
    if (structuredData) {
      // Remove existing page-specific structured data
      const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-page-specific]');
      existingScripts.forEach(script => script.remove());

      // Add new structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-page-specific', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, canonical, ogImage, structuredData]);
};

export default useSEO;