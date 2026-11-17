import { fail, json, requireAdmin } from '@/lib/auth';
import { sendTestEmail, verifySmtpConnection } from '@/lib/mail';
import { logAction } from '@/lib/notify';
import {
  getSmtpSettings,
  publicSmtpSettings,
  saveSmtpSettings,
  smtpIsReady,
} from '@/lib/settings';

export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const settings = await getSmtpSettings();
    return json({
      ok: true,
      smtp: publicSmtpSettings(settings),
      ready: smtpIsReady(settings),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || 'save');

  try {
    if (action === 'test') {
      const settings = await getSmtpSettings();
      if (!smtpIsReady(settings)) {
        return json(
          { ok: false, error: 'Save and enable SMTP settings before sending a test email.' },
          422
        );
      }
      const to = String(body.test_email || user.email || '').trim();
      if (!to.includes('@')) {
        return json({ ok: false, error: 'Provide a valid test recipient email.' }, 422);
      }
      await verifySmtpConnection(settings);
      await sendTestEmail(to);
      await logAction(user.user_id, `SMTP test email sent to ${to}`);
      return json({ ok: true, message: `Test email sent to ${to}.` });
    }

    if (action === 'verify') {
      const draft = {
        ...(await getSmtpSettings()),
        ...body,
        password: body.password || (await getSmtpSettings()).password,
      };
      if (!draft.host) return json({ ok: false, error: 'SMTP host is required to verify.' }, 422);
      await verifySmtpConnection(draft);
      return json({ ok: true, message: 'SMTP server accepted the connection.' });
    }

    const saved = await saveSmtpSettings(body, user.user_id);
    await logAction(
      user.user_id,
      `Updated SMTP settings (enabled=${saved.enabled ? 'yes' : 'no'}, host=${saved.host || 'none'})`
    );
    return json({
      ok: true,
      message: 'SMTP settings saved.',
      smtp: publicSmtpSettings(saved),
      ready: smtpIsReady(saved),
    });
  } catch (err) {
    return json({ ok: false, error: err.message || 'Unable to update SMTP settings.' }, 422);
  }
}
