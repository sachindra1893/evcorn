const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lh-report-desktop.json', 'utf8'));

Object.values(report.audits).forEach(audit => {
  if (audit.title.toLowerCase().includes('shift')) {
    console.log(`\n=== ${audit.title} ===`);
    console.log(JSON.stringify(audit.details, null, 2));
  }
});
