'use strict';

/**
 * Layer 4 · Premium HTML Report Generator
 * =========================================
 * Generates a stunning, interactive HTML dashboard showing:
 *  - Suite Health Score (animated ring)
 *  - Pass/Fail Heatmap across all runs
 *  - Per-test flakiness scores with severity badges
 *  - Root Cause labels and counts
 *  - AI-powered fix recommendations with code diffs
 *  - CI Trust Gate status
 */

const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');

class ReportGenerator {
  constructor({ outputDir }) {
    this.outputDir = outputDir;
  }

  /**
   * Generate the HTML report
   * @param {Object} data - { runs, scores, analysis, config }
   * @returns {Promise<string>} Path to the generated HTML file
   */
  async generate(data) {
    await fs.ensureDir(this.outputDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const html = this._buildHtml(data);
    const reportPath = path.join(this.outputDir, `flaky-report-${timestamp}.html`);
    const latestPath = path.join(this.outputDir, 'flaky-report-latest.html');

    await fs.writeFile(reportPath, html, 'utf-8');
    await fs.writeFile(latestPath, html, 'utf-8');

    console.log(chalk.green(`\n  📊  Report generated: ${latestPath}`));
    return latestPath;
  }

  _buildHtml({ runs, scores, analysis, config }) {
    const { suiteHealthScore, totalTests, totalFlaky, totalAlwaysFail, totalStable, topRootCauses, recommendations, ciGatePassed } = analysis;
    const testEntries = Object.values(scores).sort((a, b) => b.flakinessScore - a.flakinessScore);

    const heatmapData = this._buildHeatmapData(runs, scores);
    const now = new Date().toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Selenium Flaky Detector · Report</title>
  <meta name="description" content="Entropy-based flakiness analysis report for Selenium/Java test suite"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    /* ─── Design Tokens ─────────────────────────────────────── */
    :root {
      --bg-base:    #0a0e1a;
      --bg-card:    #111827;
      --bg-card2:   #1a2235;
      --accent:     #6366f1;
      --accent2:    #8b5cf6;
      --success:    #10b981;
      --warning:    #f59e0b;
      --danger:     #ef4444;
      --mild:       #eab308;
      --moderate:   #f97316;
      --severe:     #ef4444;
      --critical:   #dc2626;
      --text:       #f1f5f9;
      --text-dim:   #94a3b8;
      --border:     rgba(99,102,241,0.2);
      --glow:       rgba(99,102,241,0.15);
      --radius:     12px;
      --radius-lg:  20px;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-base);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }
    /* Background grid */
    body::before {
      content: '';
      position: fixed; inset: 0; z-index: 0;
      background:
        linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }

    /* ─── Layout ─────────────────────────────────────────────── */
    .container { max-width: 1280px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }

    /* ─── Header ─────────────────────────────────────────────── */
    header {
      padding: 40px 0 32px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
    }
    .logo { display: flex; align-items: center; gap: 14px; }
    .logo-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      display: flex; align-items: center; justify-content: center; font-size: 24px;
      box-shadow: 0 0 30px rgba(99,102,241,0.4);
    }
    .logo-text h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .logo-text p { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
    .meta { font-size: 13px; color: var(--text-dim); text-align: right; line-height: 1.7; }
    .meta strong { color: var(--text); }

    /* ─── CI Badge ───────────────────────────────────────────── */
    .ci-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 8px 20px; border-radius: 100px;
      font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
    }
    .ci-pass { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: var(--success); }
    .ci-fail { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: var(--danger); }

    /* ─── KPI Cards ──────────────────────────────────────────── */
    .kpi-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px; margin: 32px 0;
    }
    .kpi-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 24px;
      position: relative; overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px var(--glow); }
    .kpi-card::before {
      content: ''; position: absolute; inset: 0; border-radius: var(--radius-lg);
      background: linear-gradient(135deg, var(--glow), transparent);
      opacity: 0; transition: opacity 0.2s;
    }
    .kpi-card:hover::before { opacity: 1; }
    .kpi-icon { font-size: 28px; margin-bottom: 12px; }
    .kpi-value { font-size: 38px; font-weight: 800; letter-spacing: -1px; }
    .kpi-label { font-size: 13px; color: var(--text-dim); margin-top: 4px; font-weight: 500; }

    /* ─── Health Ring ────────────────────────────────────────── */
    .health-section {
      display: grid; grid-template-columns: auto 1fr; gap: 40px; align-items: center;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 32px; margin-bottom: 28px;
    }
    @media (max-width: 600px) { .health-section { grid-template-columns: 1fr; text-align: center; } }
    .health-ring-wrap { position: relative; width: 180px; height: 180px; flex-shrink: 0; }
    .health-ring-wrap svg { transform: rotate(-90deg); }
    .health-ring-center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .health-score-num { font-size: 40px; font-weight: 800; letter-spacing: -2px; }
    .health-score-lbl { font-size: 12px; color: var(--text-dim); font-weight: 500; }
    .health-info h2 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .health-info p { color: var(--text-dim); font-size: 14px; line-height: 1.7; max-width: 480px; }
    .health-bar-list { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
    .health-bar-item { display: flex; align-items: center; gap: 10px; }
    .health-bar-item span:first-child { font-size: 13px; color: var(--text-dim); width: 80px; flex-shrink: 0; }
    .health-bar-track {
      flex: 1; height: 8px; background: rgba(255,255,255,0.06);
      border-radius: 100px; overflow: hidden;
    }
    .health-bar-fill { height: 100%; border-radius: 100px; transition: width 1s ease; }

    /* ─── Section Headers ────────────────────────────────────── */
    .section { margin-bottom: 32px; }
    .section-header {
      display: flex; align-items: center; gap: 10px;
      font-size: 18px; font-weight: 700; margin-bottom: 18px;
      padding-bottom: 12px; border-bottom: 1px solid var(--border);
    }
    .section-header .badge {
      margin-left: auto; font-size: 12px; padding: 3px 10px;
      background: rgba(99,102,241,0.15); border: 1px solid var(--border);
      border-radius: 100px; color: var(--accent); font-weight: 600;
    }

    /* ─── Heatmap ────────────────────────────────────────────── */
    .heatmap-table-wrap { overflow-x: auto; }
    .heatmap-table {
      width: 100%; border-collapse: separate; border-spacing: 0;
      font-size: 13px; background: var(--bg-card);
      border: 1px solid var(--border); border-radius: var(--radius);
      overflow: hidden;
    }
    .heatmap-table th {
      background: var(--bg-card2); padding: 12px 16px;
      text-align: left; font-weight: 600; color: var(--text-dim);
      font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .heatmap-table td { padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.04); }
    .heatmap-table tr:hover td { background: rgba(99,102,241,0.05); }
    .run-cell {
      width: 36px; height: 28px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; transition: transform 0.15s;
      cursor: default;
    }
    .run-cell:hover { transform: scale(1.2); }
    .cell-pass     { background: rgba(16,185,129,0.2);  color: var(--success); border: 1px solid rgba(16,185,129,0.3); }
    .cell-fail     { background: rgba(239,68,68,0.2);   color: var(--danger);  border: 1px solid rgba(239,68,68,0.3); }
    .cell-skip     { background: rgba(148,163,184,0.15);color: var(--text-dim);border: 1px solid rgba(148,163,184,0.2); }

    /* severity badges */
    .badge-stable   { background: rgba(16,185,129,0.15);  color: var(--success); border: 1px solid rgba(16,185,129,0.3);  padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .badge-mild     { background: rgba(234,179,8,0.15);   color: var(--mild);    border: 1px solid rgba(234,179,8,0.3);   padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .badge-moderate { background: rgba(249,115,22,0.15);  color: var(--moderate);border: 1px solid rgba(249,115,22,0.3);  padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .badge-severe   { background: rgba(239,68,68,0.15);   color: var(--severe);  border: 1px solid rgba(239,68,68,0.3);   padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; }
    .badge-critical { background: rgba(220,38,38,0.25);   color: #fca5a5;       border: 1px solid rgba(220,38,38,0.5);   padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; }

    /* flakiness progress bar */
    .flaky-bar { display: flex; align-items: center; gap: 8px; }
    .flaky-track { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; min-width: 80px; }
    .flaky-fill { height: 100%; border-radius: 100px; }
    .fill-stable   { background: var(--success); }
    .fill-mild     { background: var(--mild); }
    .fill-moderate { background: var(--moderate); }
    .fill-severe, .fill-critical { background: var(--danger); }

    /* ─── Root Cause Chart ───────────────────────────────────── */
    .rca-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .rca-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 20px;
      transition: transform 0.2s, border-color 0.2s;
    }
    .rca-card:hover { transform: translateY(-2px); border-color: var(--accent); }
    .rca-emoji { font-size: 28px; margin-bottom: 10px; }
    .rca-label { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
    .rca-count { font-size: 32px; font-weight: 800; color: var(--accent); }

    /* ─── Recommendations ────────────────────────────────────── */
    .rec-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 20px;
    }
    .rec-header {
      padding: 18px 24px; background: var(--bg-card2);
      display: flex; align-items: center; gap: 12px;
      border-bottom: 1px solid var(--border);
    }
    .rec-emoji { font-size: 22px; }
    .rec-title { font-weight: 700; font-size: 16px; }
    .rec-rca   { font-size: 12px; color: var(--text-dim); margin-left: auto; }
    .rec-body  { padding: 24px; }
    .rec-desc  { color: var(--text-dim); font-size: 14px; line-height: 1.7; margin-bottom: 20px; }
    .code-block { position: relative; }
    .code-label {
      font-size: 11px; font-weight: 600; letter-spacing: 1px;
      text-transform: uppercase; padding: 8px 16px;
      border-radius: 6px 6px 0 0;
    }
    .label-bad  { background: rgba(239,68,68,0.15);   color: var(--danger);  }
    .label-good { background: rgba(16,185,129,0.15);  color: var(--success); }
    pre {
      background: #050810; padding: 20px;
      border-radius: 0 0 10px 10px; overflow-x: auto;
      font-family: 'JetBrains Mono', monospace; font-size: 13px;
      line-height: 1.6; color: #e2e8f0;
      border: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 16px;
    }
    .code-diff { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 768px) { .code-diff { grid-template-columns: 1fr; } }

    /* ─── Footer ─────────────────────────────────────────────── */
    footer {
      text-align: center; padding: 40px 0;
      font-size: 13px; color: var(--text-dim);
      border-top: 1px solid var(--border); margin-top: 40px;
    }
    footer a { color: var(--accent); text-decoration: none; }

    /* ─── Animations ─────────────────────────────────────────── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-up { animation: fadeUp 0.5s ease both; }
    .fade-up:nth-child(1){animation-delay:.05s}
    .fade-up:nth-child(2){animation-delay:.10s}
    .fade-up:nth-child(3){animation-delay:.15s}
    .fade-up:nth-child(4){animation-delay:.20s}
    .fade-up:nth-child(5){animation-delay:.25s}
  </style>
</head>
<body>

<!-- ╔══ HEADER ══════════════════════════════════════════════════╗ -->
<div class="container">
  <header>
    <div class="logo">
      <div class="logo-icon">🔍</div>
      <div class="logo-text">
        <h1>Selenium Flaky Detector</h1>
        <p>Java Edition · Entropy-Based Analysis · v1.0.0</p>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;">
      <span class="ci-badge ${ciGatePassed ? 'ci-pass' : 'ci-fail'}">
        ${ciGatePassed ? '🚦 CI GATE PASSED' : '🚦 CI GATE FAILED'}
      </span>
      <div class="meta">
        <strong>${config.buildTool.toUpperCase()}</strong> · ${config.runs} runs · ${now}
      </div>
    </div>
  </header>

  <!-- ╔══ KPI CARDS ══════════════════════════════════════════════╗ -->
  <div class="kpi-grid">
    <div class="kpi-card fade-up">
      <div class="kpi-icon">🧪</div>
      <div class="kpi-value">${totalTests}</div>
      <div class="kpi-label">Total Tests Analysed</div>
    </div>
    <div class="kpi-card fade-up">
      <div class="kpi-icon">🔥</div>
      <div class="kpi-value" style="color:var(--danger)">${totalFlaky}</div>
      <div class="kpi-label">Flaky Tests Detected</div>
    </div>
    <div class="kpi-card fade-up">
      <div class="kpi-icon">💀</div>
      <div class="kpi-value" style="color:var(--warning)">${totalAlwaysFail}</div>
      <div class="kpi-label">Consistently Failing</div>
    </div>
    <div class="kpi-card fade-up">
      <div class="kpi-icon">🟢</div>
      <div class="kpi-value" style="color:var(--success)">${totalStable}</div>
      <div class="kpi-label">Stable Tests</div>
    </div>
    <div class="kpi-card fade-up">
      <div class="kpi-icon">🔄</div>
      <div class="kpi-value">${config.runs}</div>
      <div class="kpi-label">Suite Runs Performed</div>
    </div>
  </div>

  <!-- ╔══ HEALTH SCORE ═══════════════════════════════════════════╗ -->
  <div class="section">
    <div class="health-section fade-up">
      <div class="health-ring-wrap">
        ${this._healthRingSvg(suiteHealthScore)}
        <div class="health-ring-center">
          <span class="health-score-num" style="color:${this._scoreColor(suiteHealthScore)}">${suiteHealthScore}</span>
          <span class="health-score-lbl">/ 100</span>
        </div>
      </div>
      <div class="health-info">
        <h2>💯 Suite Health Score</h2>
        <p>A weighted reliability index calculated using entropy-based flakiness scores across all ${config.runs} runs. Scores below 70 will fail the CI gate.</p>
        <div class="health-bar-list">
          <div class="health-bar-item">
            <span>🟢 Stable</span>
            <div class="health-bar-track"><div class="health-bar-fill" style="width:${totalTests ? (totalStable / totalTests * 100).toFixed(0) : 0}%;background:var(--success)"></div></div>
            <span style="font-size:13px;font-weight:600">${totalStable}</span>
          </div>
          <div class="health-bar-item">
            <span>🔥 Flaky</span>
            <div class="health-bar-track"><div class="health-bar-fill" style="width:${totalTests ? (totalFlaky / totalTests * 100).toFixed(0) : 0}%;background:var(--danger)"></div></div>
            <span style="font-size:13px;font-weight:600">${totalFlaky}</span>
          </div>
          <div class="health-bar-item">
            <span>💀 Broken</span>
            <div class="health-bar-track"><div class="health-bar-fill" style="width:${totalTests ? (totalAlwaysFail / totalTests * 100).toFixed(0) : 0}%;background:var(--warning)"></div></div>
            <span style="font-size:13px;font-weight:600">${totalAlwaysFail}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ╔══ HEATMAP ════════════════════════════════════════════════╗ -->
  <div class="section">
    <div class="section-header">
      🔥 Pass/Fail Heatmap
      <span class="badge">${config.runs} Runs × ${totalTests} Tests</span>
    </div>
    <div class="heatmap-table-wrap">
      <table class="heatmap-table" id="heatmap">
        <thead>
          <tr>
            <th>Test</th>
            <th>Class</th>
            ${Array.from({ length: config.runs }, (_, i) => `<th>Run ${i + 1}</th>`).join('')}
            <th>Flakiness</th>
            <th>Severity</th>
            <th>RCA</th>
          </tr>
        </thead>
        <tbody>
          ${testEntries.map(t => this._heatmapRow(t, heatmapData, analysis, config.runs)).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ╔══ ROOT CAUSE ANALYSIS ════════════════════════════════════╗ -->
  ${topRootCauses.length > 0 ? `
  <div class="section">
    <div class="section-header">🔍 Root Cause Distribution</div>
    <div class="rca-grid">
      ${topRootCauses.map(r => `
        <div class="rca-card">
          <div class="rca-emoji">${r.emoji}</div>
          <div class="rca-label">${r.label}</div>
          <div class="rca-count">${r.count}</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:4px">flaky test${r.count !== 1 ? 's' : ''}</div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- ╔══ RECOMMENDATIONS ════════════════════════════════════════╗ -->
  ${recommendations.length > 0 ? `
  <div class="section">
    <div class="section-header">
      💡 AI-Powered Fix Recommendations
      <span class="badge">${recommendations.length} fixes</span>
    </div>
    ${recommendations.map(rec => `
      <div class="rec-card">
        <div class="rec-header">
          <span class="rec-emoji">${rec.emoji}</span>
          <span class="rec-title">${rec.fix.title}</span>
          <span class="rec-rca">${rec.rootCause}</span>
        </div>
        <div class="rec-body">
          <p class="rec-desc">${rec.description}</p>
          <div class="code-diff">
            <div class="code-block">
              <div class="code-label label-bad">❌ Before (Problematic)</div>
              <pre>${this._escHtml(rec.fix.before)}</pre>
            </div>
            <div class="code-block">
              <div class="code-label label-good">✅ After (Fixed)</div>
              <pre>${this._escHtml(rec.fix.after)}</pre>
            </div>
          </div>
        </div>
      </div>
    `).join('')}
  </div>` : ''}

  <!-- ╔══ FOOTER ══════════════════════════════════════════════════╗ -->
  <footer>
    Generated by <a href="https://www.npmjs.com/package/selenium-flaky-detector" target="_blank">selenium-flaky-detector</a>
    · Java Edition · ${now}<br/>
    Methodology: Entropy Scoring (4·p·(1−p)·100) · Root Cause Pattern Matching
  </footer>

</div>

<script>
  // Animate health bar fills on load
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.health-bar-fill').forEach(el => {
      const w = el.style.width;
      el.style.width = '0';
      setTimeout(() => { el.style.width = w; }, 100);
    });
    // Animate SVG ring
    const ring = document.querySelector('.health-ring-progress');
    if (ring) {
      const target = ring.getAttribute('stroke-dashoffset');
      ring.setAttribute('stroke-dashoffset', '502');
      setTimeout(() => {
        ring.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)';
        ring.setAttribute('stroke-dashoffset', target);
      }, 200);
    }
  });
</script>
</body>
</html>`;
  }

  // ─── SVG Ring ─────────────────────────────────────────────────────────────
  _healthRingSvg(score) {
    const r = 78, cx = 90, cy = 90;
    const circ = 2 * Math.PI * r;  // ~490
    const fill = ((100 - score) / 100) * circ;
    const color = this._scoreColor(score);
    return `<svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="12"
        stroke-linecap="round"
        stroke-dasharray="${circ.toFixed(1)}"
        stroke-dashoffset="${fill.toFixed(1)}"
        class="health-ring-progress"/>
    </svg>`;
  }

  // ─── Heatmap Row ──────────────────────────────────────────────────────────
  _heatmapRow(t, heatmapData, analysis, totalRuns) {
    const cells = heatmapData[t.fullName] || [];
    const rca = analysis.perTest[t.fullName] || {};
    const runCells = Array.from({ length: totalRuns }, (_, i) => {
      const r = cells[i];
      if (!r) return `<td><span class="run-cell cell-skip" title="No data">—</span></td>`;
      return `<td><span class="run-cell ${r === 'PASS' ? 'cell-pass' : r === 'FAIL' ? 'cell-fail' : 'cell-skip'}" title="${r}">${r === 'PASS' ? '✓' : r === 'FAIL' ? '✗' : '—'}</span></td>`;
    });

    const pct = t.flakinessScore.toFixed(1);

    // Severity badge — special cases for always-fail and always-pass
    let severityBadge;
    if (t.isAlwaysFail) {
      severityBadge = '<span style="background:rgba(239,68,68,0.25);color:#fca5a5;border:1px solid rgba(239,68,68,0.5);padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600">💀 BROKEN</span>';
    } else if (t.isAlwaysPass) {
      severityBadge = '<span class="badge-stable">✓ STABLE</span>';
    } else {
      severityBadge = `<span class="badge-${t.severity}">${t.severity.toUpperCase()}</span>`;
    }

    // Flakiness bar — show BROKEN or score%
    let flakyCell;
    if (t.isAlwaysFail) {
      flakyCell = `<span style="font-size:12px;color:#ef4444;font-weight:600">Always Fails</span>`;
    } else if (t.isAlwaysPass) {
      flakyCell = `<span style="font-size:12px;color:#10b981;font-weight:600">Always Passes</span>`;
    } else {
      flakyCell = `<div class="flaky-bar">
              <div class="flaky-track"><div class="flaky-fill fill-${t.severity}" style="width:${pct}%"></div></div>
              <span style="font-size:12px;font-weight:600;min-width:38px">${pct}%</span>
            </div>`;
    }

    const rowStyle = t.isAlwaysFail ? 'background:rgba(239,68,68,0.04)' : '';

    return `<tr style="${rowStyle}">
      <td style="font-family:'JetBrains Mono',monospace;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this._escHtml(t.testName)}">${this._escHtml(t.testName)}</td>
      <td style="font-size:12px;color:var(--text-dim);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this._escHtml(t.className)}">${this._escHtml(t.className.split('.').pop())}</td>
      ${runCells.join('')}
      <td>${flakyCell}</td>
      <td>${severityBadge}</td>
      <td style="font-size:13px">${rca.emoji ?? '—'} ${rca.rootCause ?? '—'}</td>
    </tr>`;
  }

  // ─── Build heatmap lookup: fullName → [runResult per run] ─────────────────
  _buildHeatmapData(runs, scores) {
    const map = {};
    for (const testName of Object.keys(scores)) {
      map[testName] = [];
    }
    for (const run of runs) {
      for (const test of run.tests) {
        if (!map[test.fullName]) map[test.fullName] = [];
        map[test.fullName][run.runNumber - 1] = test.status;
      }
    }
    return map;
  }

  _scoreColor(score) {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  }

  _escHtml(str) {
    return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async openLatestReport() {
    const latestPath = path.join(this.outputDir, 'flaky-report-latest.html');
    if (await fs.pathExists(latestPath)) {
      const open = require('open');
      await open(latestPath);
    } else {
      console.log(chalk.yellow('No report found. Run the detector first.'));
    }
  }
}

module.exports = { ReportGenerator };
