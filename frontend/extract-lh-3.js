const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lh-report-desktop.json', 'utf8'));

console.log("=== CLS FAILURES ===");
const clsAudit = report.audits['layout-shift-elements'];
if (clsAudit && clsAudit.details && clsAudit.details.items) {
  clsAudit.details.items.forEach(item => {
    console.log(`- Score: ${item.score}, Element: ${item.node ? item.node.selector : 'unknown'}, HTML: ${item.node ? item.node.snippet : 'unknown'}`);
  });
} else {
  console.log("No specific CLS elements found in the report.");
}

console.log("\n=== LCP ELEMENT ===");
const lcpAudit = report.audits['largest-contentful-paint-element'];
if (lcpAudit && lcpAudit.details && lcpAudit.details.items) {
  lcpAudit.details.items.forEach(item => {
    console.log(`- Element: ${item.node ? item.node.selector : 'unknown'}, HTML: ${item.node ? item.node.snippet : 'unknown'}`);
  });
} else {
  console.log("No specific LCP elements found in the report.");
}
