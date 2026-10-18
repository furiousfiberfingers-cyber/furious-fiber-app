const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = './logs.json';
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const RATES = {
  fusionSplice: 12,
  partialRibbon: 12,
  ribbonSplice: 100,
  setupTeardown: 150,
  spliceDtap: 150,
  spliceTerminal: 120,
  testDtap: 20,
  testEvolve: 8,
  testRetripL: 0
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'billing@furiousfiberfingers.com',
    pass: process.env.EMAIL_PASS || 'your-email-password'
  }
});

function getWeeklyLogs() {
  const logs = JSON.parse(fs.readFileSync(DATA_FILE));
  const now = new Date();
  const weekAgo = new Date(now.setDate(now.getDate() - 7));
  return logs.filter(log => new Date(log.dateSpliced) >= weekAgo);
}

function calculateWeeklySummary() {
  const weeklyLogs = getWeeklyLogs();
  const totals = {
    fusionSplice: 0, partialRibbon: 0, ribbonSplice: 0,
    setupTeardown: 0, spliceDtap: 0, spliceTerminal: 0,
    testDtap: 0, testEvolve: 0, testRetripL: 0
  };

  weeklyLogs.forEach(log => {
    Object.keys(totals).forEach(key => {
      totals[key] += (log[key] || 0);
    });
  });

  let totalDue = 0;
  Object.keys(totals).forEach(key => {
    totalDue += totals[key] * (RATES[key] || 0);
  });

  return { totals, totalDue, logs: weeklyLogs };
}

app.post('/api/daily-log', (req, res) => {
  const logs = JSON.parse(fs.readFileSync(DATA_FILE));
  logs.push({ ...req.body, timestamp: new Date().toISOString() });
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2));
  res.json({ status: 'success' });
});

app.get('/api/weekly-summary', (req, res) => {
  res.json(calculateWeeklySummary());
});

async function sendSaturdayReport() {
  const summary = calculateWeeklySummary();
  const dateStr = new Date().toLocaleDateString();

  const emailBody = `
    <h2>Furious Fiber Fingers LLC - Weekly Billing Report</h2>
    <p><strong>Week Ending:</strong> ${dateStr}</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f2f2f2;">
          <th>Item / Task</th>
          <th>Quantity</th>
          <th>Rate ($)</th>
          <th>Subtotal ($)</th>
        </tr>
      </thead>
      <tbody>
        ${Object.keys(summary.totals).map(key => `
          <tr>
            <td>${key}</td>
            <td>${summary.totals[key]}</td>
            <td>$${RATES[key]}</td> <td>$${(summary.totals[key] * RATES[key]).toFixed(2)}</td>
          </tr>
        `).join('')}
        <tr>
          <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL DUE:</td>
          <td style="font-weight: bold; color: green;">$${summary.totalDue.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    <h3>Daily Entry Logs</h3>
    <pre>${JSON.stringify(summary.logs, null, 2)}</pre>
  `;

  await transporter.sendMail({
    from: '"FFF Billing Portal" <billing@furiousfiberfingers.com>',
    to: 'furiousfiberfingers@gmail.com',
    subject: `Weekly Billing Report - Furious Fiber Fingers LLC (${dateStr})`,
    html: emailBody
  });
  console.log('Saturday Weekly Billing Report Sent.');
}

cron.schedule('59 23 * * 6', () => {
  console.log('Executing Saturday Automated Billing Email...');
  sendSaturdayReport().catch(console.error);
});

app.post('/api/send-weekly-report', async (req, res) => {
  try {
    await sendSaturdayReport();
    res.json({ status: 'Report sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));