import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface StaffInvitationEmailData {
  to: string;
  name: string;
  role: string;
  facility: string;
  staffId: string;
  tempPassword: string;
  phone?: string;
  loginUrl?: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'smtp-config.json');

// Helper to load persistent configuration
function loadSavedConfig(): Partial<EmailConfig> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load saved SMTP config:', err);
  }
  return {};
}

const savedConfig = loadSavedConfig();

// SMTP configuration that can be updated via API, disk storage, or environment variables
let currentEmailConfig: EmailConfig = {
  host: (savedConfig.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
  port: Number(savedConfig.port || process.env.SMTP_PORT) || 465,
  secure: true,
  user: (savedConfig.user || process.env.SMTP_USER || 'justunme0423@gmail.com').trim(),
  pass: (savedConfig.pass || process.env.SMTP_PASS || 'svgmmvuegcvuuarq').replace(/\s+/g, '').trim(),
  fromName: (savedConfig.fromName || process.env.SMTP_FROM_NAME || 'Feronia Wildlife Facility').trim(),
  fromEmail: (savedConfig.fromEmail || process.env.SMTP_FROM_EMAIL || 'justunme0423@gmail.com').trim(),
};

// Cached test transporter for fast preview generation
let cachedTestAccount: any = null;

export function getEmailConfigStatus() {
  const hasConfig = Boolean(currentEmailConfig.host && currentEmailConfig.user && currentEmailConfig.pass);
  return {
    configured: hasConfig,
    host: currentEmailConfig.host || '',
    port: currentEmailConfig.port || 587,
    secure: currentEmailConfig.secure,
    user: currentEmailConfig.user || '',
    fromName: currentEmailConfig.fromName || 'Feronia Wildlife Facility',
    fromEmail: currentEmailConfig.fromEmail || currentEmailConfig.user || 'no-reply@feronia.ph',
  };
}

export async function verifySMTPConnection() {
  if (!currentEmailConfig.host || !currentEmailConfig.user || !currentEmailConfig.pass) {
    return { 
      success: false, 
      error: 'SMTP host, username, and password are required before testing the connection.' 
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: currentEmailConfig.host,
      port: currentEmailConfig.port,
      secure: currentEmailConfig.secure,
      auth: {
        user: currentEmailConfig.user,
        pass: currentEmailConfig.pass,
      },
      connectionTimeout: 10000,
    });

    await transporter.verify();
    return {
      success: true,
      message: `Direct connection verified! Successfully connected to ${currentEmailConfig.host}:${currentEmailConfig.port}`,
    };
  } catch (err: any) {
    console.error('SMTP verification failed:', err);
    return {
      success: false,
      error: `SMTP connection failed: ${err?.message || 'Check host, port, or app password.'}`,
    };
  }
}

export function updateEmailConfig(config: Partial<EmailConfig>) {
  currentEmailConfig = {
    ...currentEmailConfig,
    ...config,
  };

  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentEmailConfig, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist SMTP config to disk:', err);
  }

  return getEmailConfigStatus();
}

/**
 * Generate a rich, high-contrast, responsive HTML email template for staff invitation
 */
export function generateStaffInvitationHtml(data: StaffInvitationEmailData): string {
  const roleDisplay = data.role.toLowerCase() === 'vet' ? 'Veterinarian' : 'Animal Keeper';
  const roleDesc = data.role.toLowerCase() === 'vet'
    ? 'Veterinary assessments, medical examinations, clinical records, and treatment workflows.'
    : 'Primary reptile husbandry, feeding protocols, enclosure maintenance, and daily care tasks.';

  const loginUrl = data.loginUrl || 'https://ais-dev-ad3h7si2ztpuyg3s6irnqi-330151245219.asia-southeast1.run.app';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Staff Account Invitation - Feronia Wildlife Facility</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px -10px rgba(34, 197, 94, 0.15); border: 1px solid #bbf7d0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%); padding: 44px 36px; text-align: left; border-bottom: 3px solid #15803d;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.25); border: 1px solid rgba(255, 255, 255, 0.5); border-radius: 10px; padding: 6px 14px; margin-bottom: 16px;">
                      <span style="color: #ffffff; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">🌿 FERONIA WILDLIFE FACILITY</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.25;">
                      Welcome to the Operational Team
                    </h1>
                    <p style="color: #f0fdf4; margin: 0; font-size: 14px; line-height: 1.5; font-weight: 600;">
                      Official personnel assignment and system access credentials.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #0f172a; font-weight: 700;">
                Hello ${data.name},
              </p>
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                You have been officially registered as authorized personnel in the <strong>Feronia Wildlife Facility Management Information System</strong>. Below are your secure login credentials and station assignment.
              </p>

              <!-- Account Credentials Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 18px; border: 1px solid #e2e8f0; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; background-color: #f1f5f9;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; font-weight: 900;">🔒 Secure Account Credentials</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="10">
                      <tr>
                        <td width="38%" style="font-size: 13px; color: #64748b; font-weight: 700;">Staff ID:</td>
                        <td style="font-size: 13px; color: #0f172a; font-family: 'Courier New', Courier, monospace; font-weight: 800; background-color: #e2e8f0; padding: 4px 8px; border-radius: 6px;">${data.staffId}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 700;">Assigned Role:</td>
                        <td>
                          <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 20px; border: 1px solid #bbf7d0;">
                            ✨ ${roleDisplay}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 700;">Facility / Station:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 800;">${data.facility || 'Main Sanctuary Facility'}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 700;">Login Email:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 800;">${data.to}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 700;">Temporary Password:</td>
                        <td>
                          <div style="display: inline-block; background-color: #ecfdf5; color: #15803d; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 900; padding: 8px 16px; border-radius: 10px; letter-spacing: 1.5px; border: 1px solid #86efac;">
                            ${data.tempPassword}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Role Responsibilities -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; margin-bottom: 28px; padding: 18px 22px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #166534;">
                      <strong style="text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; display: block; margin-bottom: 4px; color: #14532d;">Assigned Responsibilities:</strong>
                      ${roleDesc}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; text-align: center;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 16px 36px; border-radius: 14px; box-shadow: 0 10px 20px -5px rgba(34, 197, 94, 0.4); letter-spacing: 0.3px;">
                      Log In to Feronia System &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                      <strong style="color: #0f172a;">Security Notice:</strong> You will be prompted to change your temporary password upon your first login. Keep your credentials strictly confidential and do not share them with unauthorized personnel.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; font-weight: 700;">
                Feronia Wildlife Facility Management Information System
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} Feronia Sanctuary Operations. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send the invitation email.
 * If user configured SMTP, delivers via SMTP.
 * If SMTP is not configured or throws an error, uses Ethereal test inbox and provides live previewUrl!
 */
export async function sendStaffInvitationEmail(data: StaffInvitationEmailData) {
  const htmlContent = generateStaffInvitationHtml(data);
  const textContent = `Welcome to Feronia Wildlife Facility Management System

Hello ${data.name},

You have been registered as an authorized personnel in the system.

ACCOUNT CREDENTIALS:
- Staff ID: ${data.staffId}
- Role: ${data.role}
- Facility: ${data.facility || 'Main Facility'}
- Login Email: ${data.to}
- Temporary Password: ${data.tempPassword}

Please log in here: ${data.loginUrl || 'https://feronia.ph'}
Note: You will be required to change your temporary password upon first login.`;

  const subject = `Welcome to Feronia Wildlife - Staff Account Credentials (${data.name})`;

  // Check if real custom SMTP is configured
  const hasCustomSmtp = Boolean(currentEmailConfig.host && currentEmailConfig.user && currentEmailConfig.pass);

  // 1. Try Brevo HTTP REST API & SMTP Relay if key is present (Allows sending to ANY recipient email with NO domain restrictions)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    // 1A. Brevo HTTP REST API
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey.trim(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            name: currentEmailConfig.fromName || 'Feronia Wildlife Facility', 
            email: currentEmailConfig.fromEmail || currentEmailConfig.user || 'justunme0423@gmail.com' 
          },
          to: [{ email: data.to, name: data.name }],
          subject,
          textContent,
          htmlContent
        })
      });
      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          mode: 'smtp' as const,
          messageId: json.messageId,
          recipient: data.to,
          subject,
          previewUrl: null,
          smtpConfigured: true,
          message: `Email successfully delivered directly to ${data.to} via Brevo HTTP API`,
        };
      } else {
        const err = await res.text().catch(() => '');
        console.warn('Brevo HTTP API notice, attempting Brevo SMTP Relay:', err);
      }
    } catch (httpErr) {
      console.warn('Brevo HTTP dispatch attempt error:', httpErr);
    }

    // 1B. Brevo SMTP Relay (smtp-relay.brevo.com)
    try {
      const brevoTransporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: currentEmailConfig.user || 'justunme0423@gmail.com',
          pass: brevoApiKey.trim(),
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
        tls: { rejectUnauthorized: false }
      });

      const info = await brevoTransporter.sendMail({
        from: `"${currentEmailConfig.fromName || 'Feronia Wildlife Facility'}" <${currentEmailConfig.fromEmail || currentEmailConfig.user || 'justunme0423@gmail.com'}>`,
        to: data.to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        mode: 'smtp' as const,
        messageId: info.messageId,
        recipient: data.to,
        subject,
        previewUrl: null,
        smtpConfigured: true,
        message: `Email successfully delivered directly to ${data.to} via Brevo SMTP Relay`,
      };
    } catch (relayErr) {
      console.warn('Brevo SMTP Relay attempt notice:', relayErr);
    }
  }

  // 2. Try Google Apps Script / Custom Email Webhook (HTTPS Port 443 - 100% works on Render)
  const webhookUrl = process.env.EMAIL_WEBHOOK_URL || process.env.SMTP_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.to,
          name: data.name,
          role: data.role,
          subject: subject,
          text: textContent,
          html: htmlContent,
          tempPassword: data.tempPassword,
          loginUrl: data.loginUrl
        })
      });
      if (res.ok || res.status === 302 || res.status === 200) {
        return {
          success: true,
          mode: 'smtp' as const,
          recipient: data.to,
          subject,
          previewUrl: null,
          smtpConfigured: true,
          message: `Email successfully delivered directly to ${data.to} via HTTPS Webhook`,
        };
      }
    } catch (whErr) {
      console.warn('Email Webhook dispatch error:', whErr);
    }
  }

  // 2. Try Resend HTTP REST API if key is present (Bypasses all cloud port firewalls)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `Feronia Wildlife <onboarding@resend.dev>`,
          to: [data.to],
          subject,
          text: textContent,
          html: htmlContent
        })
      });
      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          mode: 'smtp' as const,
          messageId: json.id,
          recipient: data.to,
          subject,
          previewUrl: null,
          smtpConfigured: true,
          message: `Email successfully delivered directly to ${data.to} via Resend HTTP API`,
        };
      } else {
        const errJson: any = await res.json().catch(() => ({}));
        // If Resend sandbox restricts to owner account (justunme0423@gmail.com), deliver credentials alert to owner
        if (errJson?.statusCode === 403 && data.to !== 'justunme0423@gmail.com') {
          const ownerRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: `Feronia Wildlife <onboarding@resend.dev>`,
              to: ['justunme0423@gmail.com'],
              subject: `[Staff Credentials Notice] ${data.name} (${data.to})`,
              text: `New Staff Account Created for: ${data.name} (${data.to})\nRole: ${data.role}\nTemporary Password: ${data.tempPassword}\nLogin URL: ${data.loginUrl || 'https://feronia.onrender.com'}\n\n${textContent}`,
              html: `<div style="font-family:sans-serif;padding:20px;background:#05180f;color:#fff;border-radius:12px;">
                <h2 style="color:#10b981;">New Staff Account Created</h2>
                <p><b>Staff Name:</b> ${data.name}</p>
                <p><b>Assigned Email:</b> ${data.to}</p>
                <p><b>Role:</b> ${data.role}</p>
                <p><b>Temporary Password:</b> <code style="background:#064e3b;padding:4px 8px;border-radius:4px;color:#34d399;font-weight:bold;">${data.tempPassword}</code></p>
                <p><b>Login URL:</b> <a href="${data.loginUrl || 'https://feronia.onrender.com'}" style="color:#34d399;">${data.loginUrl || 'https://feronia.onrender.com'}</a></p>
                <hr style="border-color:#064e3b;margin:16px 0;" />
                <p style="font-size:12px;color:#9ca3af;">Forward these credentials to ${data.name} at ${data.to}.</p>
              </div>`
            })
          });
          if (ownerRes.ok) {
            return {
              success: true,
              mode: 'smtp' as const,
              recipient: 'justunme0423@gmail.com',
              subject,
              previewUrl: null,
              smtpConfigured: true,
              message: `Credentials notice sent to admin email (justunme0423@gmail.com)`,
            };
          }
        }
      }
    } catch (httpErr) {
      console.warn('Resend HTTP dispatch attempt error:', httpErr);
    }
  }

  // 4. Try standard SMTP Nodemailer transport with Port 465 (SSL) and Port 587 (STARTTLS) dual fallback
  if (hasCustomSmtp) {
    const isGmail = currentEmailConfig.host?.includes('gmail') || currentEmailConfig.user?.includes('gmail');
    const cleanUser = currentEmailConfig.user.trim();
    const cleanPass = currentEmailConfig.pass.replace(/\s+/g, '').trim();

    // Strategy A: Port 465 (Direct SSL)
    try {
      const transporterSSL = nodemailer.createTransport({
        host: isGmail ? 'smtp.gmail.com' : currentEmailConfig.host,
        port: 465,
        secure: true,
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
        connectionTimeout: 7000,
        greetingTimeout: 7000,
        socketTimeout: 9000,
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporterSSL.sendMail({
        from: `"${currentEmailConfig.fromName}" <${currentEmailConfig.fromEmail || currentEmailConfig.user}>`,
        to: data.to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        mode: 'smtp' as const,
        messageId: info.messageId,
        recipient: data.to,
        subject,
        previewUrl: null,
        smtpConfigured: true,
        message: `Email successfully delivered directly to ${data.to} via Gmail SSL (Port 465)`,
      };
    } catch (sslErr: any) {
      console.warn('Port 465 SSL attempt failed, trying Port 587 STARTTLS fallback:', sslErr?.message);
    }

    // Strategy B: Port 587 (STARTTLS)
    try {
      const transporterTLS = nodemailer.createTransport({
        host: isGmail ? 'smtp.gmail.com' : currentEmailConfig.host,
        port: 587,
        secure: false,
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
        connectionTimeout: 7000,
        greetingTimeout: 7000,
        socketTimeout: 9000,
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporterTLS.sendMail({
        from: `"${currentEmailConfig.fromName}" <${currentEmailConfig.fromEmail || currentEmailConfig.user}>`,
        to: data.to,
        subject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        mode: 'smtp' as const,
        messageId: info.messageId,
        recipient: data.to,
        subject,
        previewUrl: null,
        smtpConfigured: true,
        message: `Email successfully delivered directly to ${data.to} via Gmail STARTTLS (Port 587)`,
      };
    } catch (tlsErr: any) {
      console.error('All SMTP direct delivery attempts failed:', tlsErr);
      const isAuthError = tlsErr?.message?.includes('535') || tlsErr?.message?.includes('Username and Password not accepted');
      const errorDetail = isAuthError 
        ? 'Gmail SMTP Authentication Failed (535): Username or Password not accepted. Note: Gmail requires a 16-character Google App Password (not your regular Gmail login password). Go to myaccount.google.com/apppasswords to generate one.'
        : `Direct SMTP delivery failed: ${tlsErr?.message || 'Check host, port, or cloud network firewall settings.'}`;
      return {
        success: false,
        mode: 'error' as const,
        recipient: data.to,
        subject,
        error: errorDetail,
        previewUrl: null,
        smtpConfigured: true,
      };
    }
  }

  // If SMTP is not configured, inform the user directly so they can configure it or launch their email client
  return {
    success: false,
    mode: 'not_configured' as const,
    recipient: data.to,
    subject,
    error: 'Direct SMTP is not configured yet. Enter your SMTP details below (e.g. Gmail or custom SMTP) to send real emails directly to inboxes.',
    previewUrl: null,
    smtpConfigured: false,
  };
}

export interface PasswordResetEmailData {
  to: string;
  name: string;
  resetCode: string;
}

export function generatePasswordResetHtml(data: PasswordResetEmailData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset - Feronia Wildlife Facility</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(34, 197, 94, 0.1); border: 1px solid #bbf7d0;">
          <tr>
            <td style="background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%); padding: 36px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900;">Password Reset Request</h1>
              <p style="color: #f0fdf4; margin: 8px 0 0 0; font-size: 13px;">Feronia Wildlife Facility Management System</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #0f172a; font-weight: 700;">Hello ${data.name},</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                We received a request to reset your password for your Feronia Wildlife Facility account. Use the secure verification code below to complete your password reset.
              </p>
              <div style="text-align: center; margin-bottom: 28px;">
                <div style="display: inline-block; background-color: #ecfdf5; color: #15803d; font-family: monospace; font-size: 28px; font-weight: 900; padding: 14px 28px; border-radius: 12px; letter-spacing: 4px; border: 2px dashed #86efac;">
                  ${data.resetCode}
                </div>
              </div>
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                If you did not request a password reset, please ignore this email or contact your facility administrator. This code expires in 15 minutes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData) {
  const htmlContent = generatePasswordResetHtml(data);
  const textContent = `Password Reset Verification Code: ${data.resetCode}`;
  
  if (!currentEmailConfig.host || !currentEmailConfig.user || !currentEmailConfig.pass) {
    throw new Error('SMTP is not configured.');
  }

  const transporter = nodemailer.createTransport({
    host: currentEmailConfig.host,
    port: currentEmailConfig.port,
    secure: currentEmailConfig.secure,
    auth: {
      user: currentEmailConfig.user,
      pass: currentEmailConfig.pass,
    },
    connectionTimeout: 15000,
  });

  const info = await transporter.sendMail({
    from: `"${currentEmailConfig.fromName}" <${currentEmailConfig.fromEmail || currentEmailConfig.user}>`,
    to: data.to,
    subject: 'Password Reset Verification Code - Feronia Wildlife',
    text: textContent,
    html: htmlContent,
  });

  return { success: true, messageId: info.messageId };
}
