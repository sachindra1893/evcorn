const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lh-report-desktop.json', 'utf8'));

console.log(JSON.stringify(report.audits['largest-contentful-paint-element'].details, null, 2));
console.log(JSON.stringify(report.audits['layout-shift-elements'].details, null, 2));
console.log(JSON.stringify(report.audits['network-requests'].details.items.slice(0, 10).map(r => ({url: r.url, transferSize: r.transferSize, resourceType: r.resourceType})), null, 2));
