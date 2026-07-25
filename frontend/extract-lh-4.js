const fs = require('fs');
const report = JSON.parse(fs.readFileSync('lh-report-desktop.json', 'utf8'));

console.log("=== FAILED AUDITS ===");
Object.values(report.audits).forEach(audit => {
  if (audit.score !== 1 && audit.score !== null) {
    console.log(`- ${audit.title} (Score: ${audit.score})`);
  }
});
