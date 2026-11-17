import nodemailer from 'nodemailer';
import { getSmtpSettings, smtpIsReady } from '@/lib/settings';

function transportOptions(settings) {
  const encryption = settings.encryption || 'tls';
  const port = Number(settings.port) || 587;
  const secure = encryption === 'ssl' || port === 465;
  const options = {
    host: settings.host,
    port,
    secure,
    connectionTimeout: 12000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
  };

  if (encryption === 'tls' && !secure) {
    options.requireTLS = true;
  }
  if (encryption === 'none') {
    options.secure = false;
    options.tls = { rejectUnauthorized: false };
  }

  if (settings.username) {
    options.auth = {
      user: settings.username,
      pass: settings.password || '',
    };
  }

  return options;
}

export async function createMailTransport(settings = null) {
  const cfg = settings || (await getSmtpSettings());
  if (!smtpIsReady(cfg)) {
    throw new Error('SMTP is not configured or is disabled. Open Settings → SMTP to set it up.');
  }
  return nodemailer.createTransport(transportOptions(cfg));
}

export function buildCampusEmail({ to, subject, title, message, recipientName }) {
  const safeTitle = title || subject || 'PSU Rizal Notice';
  const greeting = recipientName ? `Dear ${recipientName},` : 'Dear Student / Staff,';
  const text = [
    greeting,
    '',
    message,
    '',
    '—',
    'Palawan State University – Rizal Campus',
    'Office of the Registrar',
    'Student Deficiency Monitoring System',
    'This is an automated message. Please do not reply unless Reply-To is configured.',
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#142033;line-height:1.5;max-width:640px;margin:0 auto">
      <div style="background:linear-gradient(90deg,#063056,#0b4f8a);color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
        <div style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.85">Palawan State University · Rizal Campus</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px">Office of the Registrar</div>
      </div>
      <div style="border:1px solid #d7e2ec;border-top:0;padding:20px;border-radius:0 0 10px 10px;background:#fff">
        <p style="margin:0 0 12px">${greeting}</p>
        <h2 style="margin:0 0 10px;font-size:18px;color:#063056">${escapeHtml(safeTitle)}</h2>
        <div style="white-space:pre-wrap">${escapeHtml(message || '')}</div>
        <hr style="border:none;border-top:1px solid #e4ecf3;margin:20px 0" />
        <p style="margin:0;font-size:12px;color:#5a6b7d">
          Student Deficiency Monitoring System · Automated campus notice.
        </p>
      </div>
    </div>
  `;

  return { subject: `[PSU Rizal] ${safeTitle}`, text, html };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendCampusEmail({ to, subject, title, message, recipientName }) {
  const settings = await getSmtpSettings();
  if (!smtpIsReady(settings)) {
    throw new Error('SMTP is not configured or is disabled. Open Settings → SMTP to set it up.');
  }
  if (!to || !String(to).includes('@')) {
    throw new Error('Recipient email address is missing or invalid.');
  }

  const transporter = await createMailTransport(settings);
  const content = buildCampusEmail({ to, subject, title, message, recipientName });
  const fromName = settings.from_name || 'PSU Rizal · Office of the Registrar';
  const info = await transporter.sendMail({
    from: `"${fromName.replace(/"/g, '')}" <${settings.from_email}>`,
    to,
    replyTo: settings.reply_to || undefined,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });
  return { messageId: info.messageId, accepted: info.accepted };
}

export async function verifySmtpConnection(settings = null) {
  const cfg = settings || (await getSmtpSettings());
  if (!cfg.host?.trim()) throw new Error('SMTP host is required.');
  if (!Number(cfg.port)) throw new Error('SMTP port is required.');
  const transporter = nodemailer.createTransport(transportOptions(cfg));
  await transporter.verify();
  return true;
}

export async function sendTestEmail(to) {
  return sendCampusEmail({
    to,
    title: 'SMTP test message',
    message:
      'This is a test email from the PSU Rizal Student Deficiency Monitoring System.\n\n'
      + 'If you received this message, SMTP settings are working correctly for campus deficiency notices.',
    recipientName: 'Administrator',
  });
}
