const schema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "EVCorn",
  "url": "https://evcorn.com",
  "publisher": {
    "@type": "Organization",
    "name": "EVCorn"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://evcorn.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};
console.log(JSON.stringify(schema, null, 2));
