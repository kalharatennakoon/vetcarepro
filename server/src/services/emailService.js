import nodemailer from 'nodemailer';

const CLINIC_NAME = 'Pro Pet Animal Hospital';
const CLINIC_EMAIL = 'contact@propet.lk';
const CLINIC_PHONE = process.env.CLINIC_PHONE || '+94 37 123 4567';
const CLINIC_ADDRESS = 'Mawathagama, Kurunegala, Sri Lanka';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const baseTemplate = (bodyContent) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f6f8; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #2563eb; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
    .header p { color: #bfdbfe; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; color: #374151; font-size: 14px; line-height: 1.6; }
    .body h2 { color: #1f2937; margin-top: 0; font-size: 17px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .info-table td:first-child { color: #6b7280; width: 40%; }
    .info-table td:last-child { color: #111827; font-weight: 600; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-yellow { background: #fef9c3; color: #a16207; }
    .footer { background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
    .footer strong { color: #6b7280; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${CLINIC_NAME}</h1>
      <p>${CLINIC_ADDRESS}</p>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      <strong>${CLINIC_NAME}</strong><br>
      ${CLINIC_ADDRESS}<br>
      Tel: ${CLINIC_PHONE} &nbsp;|&nbsp; Email: ${CLINIC_EMAIL}
    </div>
  </div>
</body>
</html>
`;

export const sendAppointmentConfirmation = async ({ to, customerName, petName, appointmentDate, appointmentTime, vetName, reason }) => {
  const transporter = createTransporter();

  const html = baseTemplate(`
    <h2>Appointment Confirmation</h2>
    <p>Dear ${customerName},</p>
    <p>Your appointment has been confirmed at <strong>${CLINIC_NAME}</strong>. Please find the details below.</p>
    <table class="info-table">
      <tr><td>Patient (Pet)</td><td>${petName}</td></tr>
      <tr><td>Date</td><td>${appointmentDate}</td></tr>
      <tr><td>Time</td><td>${appointmentTime}</td></tr>
      ${vetName ? `<tr><td>Veterinarian</td><td>${vetName}</td></tr>` : ''}
      ${reason ? `<tr><td>Reason</td><td>${reason}</td></tr>` : ''}
    </table>
    <p>Please arrive 10 minutes before your scheduled time. If you need to reschedule or cancel, contact us at least 24 hours in advance.</p>
    <p style="color:#6b7280; font-size:13px;">If you have any questions, please contact us at <a href="mailto:${CLINIC_EMAIL}">${CLINIC_EMAIL}</a>.</p>
  `);

  await transporter.sendMail({
    from: `"${CLINIC_NAME}" <${CLINIC_EMAIL}>`,
    to,
    subject: `Appointment Confirmation – ${appointmentDate} at ${appointmentTime}`,
    html
  });
};

export const sendBillEmail = async ({ to, customerName, billId, billDate, items, totalAmount, paidAmount, balanceAmount, paymentStatus }) => {
  const transporter = createTransporter();

  const itemRows = items.map(item =>
    `<tr><td>${item.item_name}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:right">Rs. ${parseFloat(item.unit_price).toFixed(2)}</td><td style="text-align:right">Rs. ${parseFloat(item.total_price).toFixed(2)}</td></tr>`
  ).join('');

  const statusLabel = paymentStatus === 'fully_paid' ? 'Fully Paid' : paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Unpaid';
  const badgeClass = paymentStatus === 'fully_paid' ? 'badge-green' : paymentStatus === 'partially_paid' ? 'badge-yellow' : 'badge-blue';

  const html = baseTemplate(`
    <h2>Invoice / Bill Summary</h2>
    <p>Dear ${customerName},</p>
    <p>Please find your invoice details from <strong>${CLINIC_NAME}</strong> below.</p>
    <table class="info-table">
      <tr><td>Bill Reference</td><td>#${billId}</td></tr>
      <tr><td>Date</td><td>${billDate}</td></tr>
      <tr><td>Payment Status</td><td><span class="badge ${badgeClass}">${statusLabel}</span></td></tr>
    </table>
    <table style="width:100%; border-collapse:collapse; margin:16px 0; font-size:13px;">
      <thead>
        <tr style="background:#f3f4f6; color:#6b7280;">
          <th style="text-align:left; padding:8px 10px;">Item</th>
          <th style="text-align:center; padding:8px 10px;">Qty</th>
          <th style="text-align:right; padding:8px 10px;">Unit Price</th>
          <th style="text-align:right; padding:8px 10px;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table class="info-table">
      <tr><td>Total Amount</td><td>Rs. ${parseFloat(totalAmount).toFixed(2)}</td></tr>
      <tr><td>Amount Paid</td><td>Rs. ${parseFloat(paidAmount || 0).toFixed(2)}</td></tr>
      <tr><td>Balance Due</td><td style="color:${parseFloat(balanceAmount) > 0 ? '#ef4444' : '#16a34a'}">Rs. ${parseFloat(balanceAmount || 0).toFixed(2)}</td></tr>
    </table>
    <p style="color:#6b7280; font-size:13px;">For any billing queries, please contact us at <a href="mailto:${CLINIC_EMAIL}">${CLINIC_EMAIL}</a>.</p>
  `);

  await transporter.sendMail({
    from: `"${CLINIC_NAME}" <${CLINIC_EMAIL}>`,
    to,
    subject: `Invoice #${billId} – ${CLINIC_NAME}`,
    html
  });
};

export const sendCustomEmail = async ({ to, customerName, subject, message, senderName }) => {
  const transporter = createTransporter();

  const html = baseTemplate(`
    <h2>${subject}</h2>
    <p>Dear ${customerName},</p>
    <div style="white-space: pre-line; line-height: 1.8;">${message}</div>
    <hr class="divider">
    <p style="color:#6b7280; font-size:13px;">This message was sent by <strong>${senderName}</strong> at ${CLINIC_NAME}.<br>
    For enquiries, contact us at <a href="mailto:${CLINIC_EMAIL}">${CLINIC_EMAIL}</a>.</p>
  `);

  await transporter.sendMail({
    from: `"${CLINIC_NAME}" <${CLINIC_EMAIL}>`,
    to,
    subject,
    html
  });
};
