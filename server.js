const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
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
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject: `Weekly Billing Report - Furious Fiber Fingers LLC (${dateStr})`,
    html: emailBody
  });
  console.log('Saturday Weekly Billing Report Sent.');
}
