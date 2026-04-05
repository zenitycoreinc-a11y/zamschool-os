import { NextResponse } from "next/server";
import { emailService } from "@/lib/email";
import { requireUnsafeLocalDevRoute } from "@/lib/dev-route-guard";

export async function POST(req: Request) {
  const blocked = requireUnsafeLocalDevRoute(req);
  if (blocked) {
    return blocked;
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Test connection first
    const connectionTest = await emailService.testConnection();
    if (!connectionTest.success) {
      return NextResponse.json(
        { error: "SMTP connection failed", details: connectionTest.error },
        { status: 500 }
      );
    }

    // Send test email
    const subject = "ZamSchool SMTP Test Email";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">ZamSchool</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Email Service Test</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">SMTP Configuration Test</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            This is a test email to verify that the SMTP configuration is working correctly for ZamSchool.
          </p>
          <div style="background: white; border: 2px solid #28a745; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 24px; font-weight: bold; color: #28a745;">✅ Email Service Working!</span>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            If you received this email, the SMTP configuration is successful.
          </p>
        </div>
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>Test sent at: ${new Date().toLocaleString()}</p>
          <p>© 2026 ZamSchool. All rights reserved.</p>
        </div>
      </div>
    `;

    const text = `
      ZamSchool - SMTP Test Email
      
      This is a test email to verify that the SMTP configuration is working correctly.
      
      If you received this email, the email service is working properly!
      
      Test sent at: ${new Date().toLocaleString()}
      
      © 2026 ZamSchool
    `;

    const result = await emailService.sendEmail({
      to: email,
      subject,
      html,
      text,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send test email", details: result.error },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const blocked = requireUnsafeLocalDevRoute(req);
  if (blocked) {
    return blocked;
  }

  return NextResponse.json({
    message: "Use POST to send a test email",
    usage: {
      method: "POST",
      body: {
        email: "recipient@example.com"
      }
    }
  });
}
