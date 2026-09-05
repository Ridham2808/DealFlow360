const nodemailer = require('nodemailer');

const cleanPassword = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');

const config = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE !== 'false',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: cleanPassword,
  },
  from: process.env.MAIL_FROM || `"DealFlow360" <${process.env.SMTP_USER || 'no-reply@dealflow360.com'}>`,
  clientUrl: process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000',
};

let transporter;

if (process.env.NODE_ENV === 'test' || !config.auth.user) {
  // JSON transporter for tests or fallback
  transporter = nodemailer.createTransport({
    jsonTransport: true,
  });
} else if (config.host.includes('gmail') || process.env.SMTP_SERVICE === 'gmail') {
  // Native Gmail transporter
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
  });
} else {
  // Generic SMTP transporter
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
  });
}

module.exports = {
  transporter,
  mailConfig: config,
};
