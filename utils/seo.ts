export const updateMetaTags = (title: string, description: string) => {
  document.title = `${title} | Ominitools Scribe`;
  
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', description);
  }
  
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);

  const twitterTitle = document.querySelector('meta[property="twitter:title"]');
  if (twitterTitle) twitterTitle.setAttribute('content', title);

  const twitterDesc = document.querySelector('meta[property="twitter:description"]');
  if (twitterDesc) twitterDesc.setAttribute('content', description);
};

export const injectJsonLd = (id: string, data: object) => {
  const scriptId = `json-ld-${id}`;
  const existingScript = document.getElementById(scriptId);
  if (existingScript) {
    existingScript.textContent = JSON.stringify(data);
  } else {
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
};

export const injectFAQSchema = (faqs: { question: string, answer: string }[]) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
  injectJsonLd('faq', schema);
};

export const injectHowToSchema = (steps: { title: string, description: string }[]) => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Transcribe Audio with Ominitools Scribe",
    "description": "Follow these simple steps to convert your audio recordings into high-accuracy text transcripts using Gemini AI.",
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "url": "https://ominitools.com/scribe#how-it-works",
      "name": step.title,
      "itemListElement": [{
        "@type": "HowToDirection",
        "text": step.description
      }],
      "position": index + 1
    }))
  };
  injectJsonLd('howto', schema);
};
