'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const mdPath = path.join(__dirname, '..', 'GUIDE_EXPLICATION_CODE_FR.md');
const htmlPath = path.join(__dirname, '..', 'GUIDE_EXPLICATION_CODE_FR.html');
const pdfPath = path.join(__dirname, '..', 'GUIDE_EXPLICATION_CODE_FR.pdf');

const markdown = fs.readFileSync(mdPath, 'utf8');

// Basic markdown to HTML converter for report generation
function mdToHtml(md) {
  let html = md;

  // Escape HTML entities in code blocks first
  const codeBlocks = [];
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    codeBlocks.push(
      `<pre class="code-block"><div class="code-header">${lang || 'text'}</div><code>${escapedCode}</code></pre>`
    );
    return placeholder;
  });

  // Inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const placeholder = `___INLINE_CODE_${inlineCodes.length}___`;
    inlineCodes.push(`<code>${escaped}</code>`);
    return placeholder;
  });

  // Headers
  html = html.replace(/^# (.*$)/gim, '<h1 class="doc-title">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');

  // Horizontal rules
  html = html.replace(/^\s*---\s*$/gim, '<hr>');

  // Lists
  html = html.replace(/^\s*[\*\-]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Paragraphs
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<li>') ||
      trimmed.startsWith('</ul') ||
      trimmed.startsWith('___CODE_BLOCK')
    ) {
      return line;
    }
    return `<p>${line}</p>`;
  });
  html = processedLines.join('\n');

  // Restore inline code
  inlineCodes.forEach((code, idx) => {
    html = html.replace(`___INLINE_CODE_${idx}___`, code);
  });

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`___CODE_BLOCK_${idx}___`, block);
  });

  return html;
}

const bodyContent = mdToHtml(markdown);

const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Guide d'Explication Technique du Code - UMBB Portal</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .cover {
      page-break-after: always;
      padding-top: 40mm;
      text-align: center;
    }
    .cover-badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: #e0f2fe;
      color: #0369a1;
      border-radius: 999px;
      margin-bottom: 25px;
    }
    .cover h1 {
      font-size: 26pt;
      font-weight: 800;
      line-height: 1.15;
      color: #0b2d4c;
      margin: 0 0 15px 0;
    }
    .cover h2 {
      font-size: 15pt;
      font-weight: 400;
      color: #64748b;
      margin: 0 0 40px 0;
    }
    .cover-meta {
      border-top: 2px solid #e2e8f0;
      padding-top: 25px;
      max-width: 500px;
      margin: 0 auto;
      text-align: left;
      font-size: 10pt;
    }
    .cover-meta p {
      margin: 6px 0;
    }
    .cover-meta strong {
      color: #0b2d4c;
    }
    h1.doc-title {
      display: none;
    }
    h2 {
      font-size: 15pt;
      font-weight: 700;
      color: #005a9c;
      border-bottom: 1.5px solid #005a9c;
      padding-bottom: 5px;
      margin-top: 30px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #0b2d4c;
      margin-top: 20px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }
    h4 {
      font-size: 11pt;
      font-weight: 600;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }
    ul {
      margin: 0 0 12px 0;
      padding-left: 22px;
    }
    li {
      margin-bottom: 5px;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 25px 0;
    }
    code {
      font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    pre.code-block {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      padding: 12px 14px;
      margin: 12px 0 16px 0;
      overflow-x: auto;
      font-family: Consolas, "Liberation Mono", Menlo, Courier, monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      page-break-inside: avoid;
    }
    pre.code-block .code-header {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      border-bottom: 1px solid #334155;
      padding-bottom: 4px;
      margin-bottom: 8px;
      font-weight: bold;
    }
    pre.code-block code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: inherit;
    }
    strong {
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      color: #0b2d4c;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">Documentation Technique &amp; Architecture Logicielle</div>
    <h1>Guide d'Explication Technique du Code et des Fonctions</h1>
    <h2>Portail Web Universitaire Dynamique — UMBB Boumerdès</h2>
    <div class="cover-meta">
      <p><strong>Établissement :</strong> Université M'Hamed Bougara de Boumerdès</p>
      <p><strong>Module :</strong> Cloud Computing / Ingénierie Web</p>
      <p><strong>Technologies :</strong> Node.js 22 LTS, Express 5, EJS, PostgreSQL 16, Docker, Render PaaS</p>
      <p><strong>Date d'édition :</strong> Novembre 2026</p>
    </div>
  </div>

  <div class="content">
    ${bodyContent}
  </div>
</body>
</html>
`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('HTML generated successfully at:', htmlPath);

// Convert HTML to PDF using headless Edge
const msEdgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (fs.existsSync(msEdgePath)) {
  console.log('Converting HTML to PDF with Microsoft Edge headless...');
  const cmd = `"${msEdgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  execSync(cmd);
  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`PDF generated successfully: ${pdfPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.error('Failed to create PDF.');
  }
} else {
  console.warn('msedge.exe not found at default path.');
}
