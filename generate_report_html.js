const fs = require('fs');

const mdPath = 'c:/Users/ravin/OneDrive/Desktop/Projects/ADHD Reserch/MathQuest/Pedagogical_Agent_AD_BKT_Technical_Report.md';
const htmlPath = 'c:/Users/ravin/OneDrive/Desktop/Projects/ADHD Reserch/MathQuest/Pedagogical_Agent_AD_BKT_Technical_Report.html';

const rawMd = fs.readFileSync(mdPath, 'utf8');

// Basic Markdown parser for HTML conversion
function parseMarkdown(md) {
  let html = md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>');

  return html;
}

const styledHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MathQuest - AD-BKT Technical Research Report</title>
  <style>
    @media print {
      body { margin: 1cm; font-size: 10.5pt; color: #000; background: #fff; }
      .no-print { display: none !important; }
      pre, blockquote, table { page-break-inside: avoid; }
      .container { box-shadow: none !important; border: none !important; padding: 0 !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.65;
      color: #1e293b;
      max-width: 960px;
      margin: 30px auto;
      padding: 0 20px;
      background: #f8fafc;
    }
    .top-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 12px 20px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.03);
    }
    .btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.92rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
    }
    .btn:hover { background: #1d4ed8; }
    .container {
      background: #ffffff;
      padding: 40px 50px;
      border-radius: 16px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    h1 { color: #0f172a; border-bottom: 2px solid #2563eb; padding-bottom: 12px; font-size: 2.1rem; margin-top: 0; }
    h2 { color: #1d4ed8; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 36px; font-size: 1.45rem; }
    h3 { color: #0f172a; margin-top: 24px; font-size: 1.15rem; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 0.95rem; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
    th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
    tr:nth-child(even) { background: #f8fafc; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: Consolas, monospace; font-size: 0.88em; color: #b91c1c; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 10px; overflow-x: auto; font-size: 0.9em; }
    blockquote { border-left: 4px solid #2563eb; background: #eff6ff; margin: 20px 0; padding: 12px 18px; color: #1e40af; border-radius: 0 8px 8px 0; }
    p { margin: 12px 0; }
    ul, ol { padding-left: 24px; margin: 12px 0; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="top-actions no-print">
    <div>
      <strong style="color: #0f172a;">MathQuest Research Documentation</strong>
      <span style="color: #64748b; font-size: 0.85rem; margin-left: 8px;">Component: Pedagogical Agent & AD-BKT</span>
    </div>
    <button class="btn" onclick="window.print()">
      <span>🖨️</span> Save as PDF / Print Report
    </button>
  </div>

  <div class="container">
    <pre style="white-space: pre-wrap; font-family: inherit; background: transparent; color: inherit; padding: 0; line-height: inherit;">
${rawMd}
    </pre>
  </div>
</body>
</html>`;

fs.writeFileSync(htmlPath, styledHtml, 'utf8');
console.log('Successfully generated HTML report at: ' + htmlPath);
