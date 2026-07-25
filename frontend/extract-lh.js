const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lh-report-desktop.json', 'utf8'));

console.log("=== ACCESSIBILITY FAILURES ===");
Object.values(report.audits).forEach(audit => {
  if (audit.score !== 1 && audit.score !== null && audit.details && audit.details.type === 'table') {
    if (report.categories.accessibility.auditRefs.find(ref => ref.id === audit.id && ref.weight > 0)) {
      console.log(`- ${audit.title}: ${audit.description}`);
      if (audit.details.items) {
        audit.details.items.forEach(item => {
           console.log(`   * ${item.node ? item.node.selector : 'unknown'}`);
        });
      }
    }
  }
});

console.log("\n=== CLS FAILURES ===");
const clsAudit = report.audits['layout-shift-elements'];
if (clsAudit && clsAudit.details && clsAudit.details.items) {
  clsAudit.details.items.forEach(item => {
    console.log(`- Score: ${item.score}, Element: ${item.node ? item.node.selector : 'unknown'}`);
  });
}

console.log("\n=== LCP ELEMENT ===");
const lcpAudit = report.audits['largest-contentful-paint-element'];
if (lcpAudit && lcpAudit.details && lcpAudit.details.items) {
  lcpAudit.details.items.forEach(item => {
    console.log(`- Element: ${item.node ? item.node.selector : 'unknown'}`);
  });
}
