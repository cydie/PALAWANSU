import { one, query } from '@/lib/db';

const DEFAULTS = {
  enabled: false,
  host: '',
  port: 587,
  encryption: 'tls',
  username: '',
  password: '',
  from_email: '',
  from_name: 'PSU Rizal · Office of the Registrar',
  reply_to: '',
};

export async function getSmtpSettings() {
  const row = await one('SELECT * FROM smtp_settings WHERE settings_id = 1 LIMIT 1');
  if (!row) return { ...DEFAULTS };
  return {
    enabled: Boolean(row.enabled),
    host: row.host || '',
    port: Number(row.port) || 587,
    encryption: row.encryption || 'tls',
    username: row.username || '',
    password: row.password || '',
    from_email: row.from_email || '',
    from_name: row.from_name || DEFAULTS.from_name,
    reply_to: row.reply_to || '',
    updated_at: row.updated_at || null,
    updated_by: row.updated_by || null,
  };
}

/** Safe shape for the admin UI (never returns raw password). */
export function publicSmtpSettings(settings) {
  return {
    enabled: Boolean(settings.enabled),
    host: settings.host || '',
    port: Number(settings.port) || 587,
    encryption: settings.encryption || 'tls',
    username: settings.username || '',
    from_email: settings.from_email || '',
    from_name: settings.from_name || DEFAULTS.from_name,
    reply_to: settings.reply_to || '',
    password_set: Boolean(settings.password),
    updated_at: settings.updated_at || null,
  };
}

export function smtpIsReady(settings) {
  if (!settings?.enabled) return false;
  if (!settings.host?.trim()) return false;
  if (!Number(settings.port)) return false;
  if (!settings.from_email?.includes('@')) return false;
  return true;
}

export async function saveSmtpSettings(input, adminId) {
  const current = await getSmtpSettings();
  const enabled = Boolean(input.enabled);
  const host = String(input.host || '').trim();
  const port = Number(input.port || 587);
  let encryption = String(input.encryption || 'tls').toLowerCase();
  if (!['none', 'tls', 'ssl'].includes(encryption)) encryption = 'tls';
  const username = String(input.username || '').trim();
  const fromEmail = String(input.from_email || '').trim();
  const fromName = String(input.from_name || DEFAULTS.from_name).trim() || DEFAULTS.from_name;
  const replyTo = String(input.reply_to || '').trim();
  const nextPassword = String(input.password || '');
  const password = nextPassword ? nextPassword : current.password;

  if (enabled) {
    if (!host) throw new Error('SMTP host is required when email is enabled.');
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP port must be between 1 and 65535.');
    }
    if (!fromEmail.includes('@')) throw new Error('A valid From email address is required.');
  }

  await query(
    `INSERT INTO smtp_settings (
       settings_id, enabled, host, port, encryption, username, password,
       from_email, from_name, reply_to, updated_by, updated_at
     ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
     ON CONFLICT (settings_id) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       host = EXCLUDED.host,
       port = EXCLUDED.port,
       encryption = EXCLUDED.encryption,
       username = EXCLUDED.username,
       password = EXCLUDED.password,
       from_email = EXCLUDED.from_email,
       from_name = EXCLUDED.from_name,
       reply_to = EXCLUDED.reply_to,
       updated_by = EXCLUDED.updated_by,
       updated_at = CURRENT_TIMESTAMP`,
    [enabled, host, port, encryption, username, password, fromEmail, fromName, replyTo, adminId || null]
  );

  return getSmtpSettings();
}
