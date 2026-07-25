const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lh-report-desktop-final-real.json', 'utf8'));

console.log("=== LIGHTHOUSE SCORES ===");
console.log(`Performance: ${report.categories.performance.score * 100}`);
console.log(`Accessibility: ${report.categories.accessibility.score * 100}`);
console.log(`Best Practices: ${report.categories['best-practices'].score * 100}`);
console.log(`SEO: ${report.categories.seo.score * 100}`);

console.log("\n=== CORE WEB VITALS ===");
const lcp = report.audits['largest-contentful-paint'].displayValue;
console.log(`LCP (Largest Contentful Paint): ${lcp}`);

const cls = report.audits['cumulative-layout-shift'].displayValue;
console.log(`CLS (Cumulative Layout Shift): ${cls}`);

const tbt = report.audits['total-blocking-time'].displayValue;
console.log(`TBT (Total Blocking Time): ${tbt}`);

const speedIndex = report.audits['speed-index'].displayValue;
console.log(`Speed Index: ${speedIndex}`);

const maxPotentialFID = report.audits['max-potential-fid'] ? report.audits['max-potential-fid'].displayValue : 'N/A';
console.log(`Max Potential FID: ${maxPotentialFID}`);
