const nodemailer = require('nodemailer');

// Build transporter with layered fallbacks:
// 1. Explicit SMTP_* settings
// 2. Gmail (EMAIL_USER/EMAIL_PASS)
// 3. Console mock (development fallback)
let transporter;

async function buildTransporter() {
  if (process.env.EMAIL_HOST) {
    const t = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: (process.env.EMAIL_PORT === '465'),
      auth: (process.env.EMAIL_USER) ? {
        user:  process.env.EMAIL_USER,
        pass:  process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD
      } : undefined
    });
    if (process.env.EMAIL_DEBUG === 'true') {
      console.log('[EmailTransport:init]', {
        mode: 'host',
        host: t.options.host,
        port: t.options.port,
        secure: t.options.secure,
        user: (t.options.auth?.user || '').replace(/(.{2}).+(@.*)/,'$1***$2')
      });
    }
    return t;
  }
  if (process.env.EMAIL_USER && (process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD)) {
    const t = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD
      }
    });
    if (process.env.EMAIL_DEBUG === 'true') {
      console.log('[EmailTransport:init]', {
        mode: 'service',
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: (process.env.EMAIL_USER || '').replace(/(.{2}).+(@.*)/,'$1***$2')
      });
    }
    return t;
  }
  // Mock
  return {
    sendMail: async (opts) => {
      console.log('[Email MOCK] ->', {
        to: opts.to,
        subject: opts.subject,
        text: opts.text
      });
      return { messageId: 'mocked' };
    }
  };
}

(async () => {
  try {
    transporter = await buildTransporter();
    if (transporter.verify) {
      transporter.verify().then(()=>{
        console.log('✅ Email transporter ready');
      }).catch(err=>{
        console.warn('⚠️ Email transporter verification failed:', err.message);
      });
    } else {
      console.log('ℹ️ Using mock email transporter (no real SMTP configured)');
    }
  } catch (e) {
    console.error('❌ Failed to initialize email transporter:', e.message);
  }
})();

async function coreSend(mailOptions) {
  // Generic sender used by both OTP + test endpoints
  let lastErr;
  try {
    const result = await transporter.sendMail(mailOptions);
    if (process.env.EMAIL_DEBUG === 'true') {
      console.log('[EmailTransport:sent]', { to: mailOptions.to, subject: mailOptions.subject, messageId: result.messageId || 'n/a' });
    }
    return result;
  } catch (err) {
    lastErr = err;
    // Gmail specific fallback
    if (/535/.test(err.message) && (process.env.EMAIL_HOST === 'smtp.gmail.com' || (transporter?.options?.service === 'gmail'))) {
      try {
        console.log('[EmailTransport:fallback] Retrying with STARTTLS port 587');
        const alt = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD
          }
        });
        const r2 = await alt.sendMail(mailOptions);
        console.log('[EmailTransport:fallback] success');
        return r2;
      } catch (e2) {
        lastErr = e2;
        console.warn('[EmailTransport:fallback] failed:', e2.message);
      }
    }
  }
  throw lastErr || new Error('Unknown email send failure');
}

async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@edusync.local',
    to,
    subject: 'Your EduSync Verification Code',
    text: `Your verification code is ${otp}. It expires in 10 minutes.`,
    html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`
  };
  return coreSend(mailOptions);
}

async function sendGenericEmail(to, subject, text, html) {
  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@edusync.local',
    to,
    subject,
    text,
    html: html || (text ? `<pre>${text}</pre>` : undefined)
  };
  return coreSend(mailOptions);
}

module.exports = { sendOtpEmail, sendGenericEmail };