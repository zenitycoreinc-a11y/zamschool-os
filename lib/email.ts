import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      console.log('Initializing email service with env vars:', {
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_SECURE: process.env.SMTP_SECURE,
        SMTP_USER: process.env.SMTP_USER ? 'SET' : 'NOT_SET',
        SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'NOT_SET',
        SMTP_FROM: process.env.SMTP_FROM,
      });

      this.config = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      };

      if (!this.config.auth.user || !this.config.auth.pass) {
        console.warn('SMTP credentials not found in environment variables');
        return;
      }

      this.transporter = nodemailer.createTransport(this.config);
      console.log('Email transporter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string; messageId?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const fromAddress = options.from || process.env.SMTP_FROM || this.config.auth.user;
      
      const mailOptions = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`Email sent successfully to ${options.to}:`, result.messageId);
      
      return { 
        success: true, 
        messageId: result.messageId 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to send email:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  async sendOtpEmail(email: string, otpCode: string, userName?: string): Promise<{ success: boolean; error?: string }> {
    const subject = 'Your ZamSchool Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ZamSchool</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Education Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">Email Verification</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            ${userName ? `Hello ${userName},` : 'Hello,'}
          </p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Your verification code for ZamSchool is:
          </p>
          <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 3px;">${otpCode}</span>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code will expire in 10 minutes for security reasons.
          </p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>If you didn't request this code, please ignore this email.</p>
          <p>© 2026 ZamSchool. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
      ZamSchool - Email Verification
      
      Hello ${userName || 'User'},
      
      Your verification code is: ${otpCode}
      
      This code will expire in 10 minutes.
      
      If you didn't request this code, please ignore this email.
      
      © 2026 ZamSchool
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }
}

export const emailService = new EmailService();
export default emailService;
