// Analytics and performance monitoring utilities

interface WebVitalsMetric {
  name: string;
  id: string;
  value: number;
}

declare global {
  interface Window {
    gtag: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
  }
}

export const analytics = {
  // Google Analytics 4
  gtag: (
    command: string,
    targetId: string,
    config?: Record<string, unknown>
  ) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag(command, targetId, config);
    }
  },

  // Track page views
  pageview: (url: string) => {
    analytics.gtag("config", process.env.NEXT_PUBLIC_GA_ID || "", {
      page_path: url,
    });
  },

  // Track events
  event: (action: string, category: string, label?: string, value?: number) => {
    analytics.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  },
};

// Web Vitals tracking
export const trackWebVitals = (metric: WebVitalsMetric) => {
  analytics.event(
    metric.name,
    "Web Vitals",
    metric.id,
    Math.round(metric.value)
  );
};

// SEO utilities
export const seoUtils = {
  generateBreadcrumbSchema: (items: Array<{ name: string; url: string }>) => {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  },

  generateFAQSchema: (faqs: Array<{ question: string; answer: string }>) => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  },
};
