/**
 * Email Notifications via Resend
 * Central email utility for RAG system notifications
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailNotifier {
  private isConfigured(): boolean {
    return !!resend && !!process.env.RESEND_API_KEY;
  }
  
  private async sendEmail(template: EmailTemplate): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Resend not configured - email stubbed to console');
      console.log('📧 Email would be sent:');
      console.log(`To: ${template.to}`);
      console.log(`Subject: ${template.subject}`);
      console.log(`Body: ${template.text || template.html}`);
      return;
    }
    
    try {
      const { data, error } = await resend!.emails.send({
        from: process.env.FROM_EMAIL || 'Luma RAG <noreply@lumarai.com>',
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      
      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }
      
      console.log(`✅ Email sent successfully (ID: ${data?.id})`);
      
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }
  
  async sendUserNudge(userId: string, templateData: any): Promise<void> {
    console.log(`📧 Sending user nudge to: ${userId}`);
    
    // TODO: Get user email from database based on userId
    const userEmail = `${userId}@example.com`; // Placeholder
    
    const template: EmailTemplate = {
      to: userEmail,
      subject: '🌟 Luma Check-in: How are you feeling today?',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Hi there! 👋</h2>
          
          <p>It's been 24 hours since your last conversation with Luma. We wanted to check in and see how you're doing.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #475569;">Last Session Mood: ${templateData.lastMood || 'Not specified'}</h3>
            <p>Based on your recent conversation, we thought you might find these resources helpful:</p>
            <ul>
              ${(templateData.suggestions || []).map((suggestion: string) => `<li>${suggestion}</li>`).join('')}
            </ul>
          </div>
          
          <p>Remember, you're not alone in this journey. Take care of yourself today. 💜</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'https://luma.app'}" 
               style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Continue Your Journey with Luma
            </a>
          </div>
          
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            You're receiving this because you opted in to follow-up messages from Luma.
            <a href="#" style="color: #6366f1;">Unsubscribe</a>
          </p>
        </div>
      `,
      text: `
Hi there!

It's been 24 hours since your last conversation with Luma. We wanted to check in and see how you're doing.

Last Session Mood: ${templateData.lastMood || 'Not specified'}

Based on your recent conversation, here are some suggestions:
${(templateData.suggestions || []).map((s: string) => `- ${s}`).join('\n')}

Remember, you're not alone in this journey. Take care of yourself today.

Continue your journey: ${process.env.APP_URL || 'https://luma.app'}
      `.trim()
    };
    
    await this.sendEmail(template);
  }
  
  async alertMaintainer(subject: string, details: string): Promise<void> {
    console.log(`🚨 Sending maintainer alert: ${subject}`);
    
    const maintainerEmail = process.env.MAINTAINER_EMAIL || 'admin@lumarai.com';
    
    const template: EmailTemplate = {
      to: maintainerEmail,
      subject: `[Luma RAG Alert] ${subject}`,
      html: `
        <div style="font-family: monospace; max-width: 800px; margin: 0 auto;">
          <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
            🚨 RAG System Alert
          </h2>
          
          <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #991b1b;">${subject}</h3>
            <pre style="background: white; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${details}</pre>
          </div>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Quick Actions:</h4>
            <ul>
              <li>Check logs: <code>kubectl logs -f deployment/luma-api</code></li>
              <li>Run manual eval: <code>npm run rag:eval</code></li>
              <li>Process jobs: <code>npm run rag:jobs</code></li>
            </ul>
          </div>
          
          <p style="font-size: 11px; color: #6b7280;">
            Timestamp: ${new Date().toISOString()}<br>
            Environment: ${process.env.NODE_ENV || 'development'}
          </p>
        </div>
      `,
      text: `
[Luma RAG Alert] ${subject}

${details}

Quick Actions:
- Check logs: kubectl logs -f deployment/luma-api
- Run manual eval: npm run rag:eval
- Process jobs: npm run rag:jobs

Timestamp: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
      `.trim()
    };
    
    await this.sendEmail(template);
  }
  
  async notifyKnowledgeUpdate(userId: string, summary: string): Promise<void> {
    console.log(`📚 Sending knowledge update notification to: ${userId}`);
    
    // TODO: Get user email and preferences from database
    const userEmail = `${userId}@example.com`; // Placeholder
    
    const template: EmailTemplate = {
      to: userEmail,
      subject: '📚 Luma Knowledge Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Knowledge Base Updated! 📚</h2>
          
          <p>Hi there!</p>
          
          <p>We've updated our knowledge base based on recent conversations and your feedback. Here's what's new:</p>
          
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Update Summary:</strong></p>
            <p style="margin: 10px 0 0 0;">${summary}</p>
          </div>
          
          <p>These improvements should help provide more accurate and helpful responses to your questions.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.APP_URL || 'https://luma.app'}" 
               style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Try the Updated Luma
            </a>
          </div>
          
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            This update was triggered by your recent interactions. Thank you for helping us improve!
          </p>
        </div>
      `,
      text: `
Knowledge Base Updated!

Hi there!

We've updated our knowledge base based on recent conversations and your feedback.

Update Summary:
${summary}

These improvements should help provide more accurate and helpful responses to your questions.

Try the updated Luma: ${process.env.APP_URL || 'https://luma.app'}

This update was triggered by your recent interactions. Thank you for helping us improve!
      `.trim()
    };
    
    await this.sendEmail(template);
  }
}

// Create singleton instance
const sendEmail = new EmailNotifier();

// Export both the class and singleton for flexibility
export { EmailNotifier, sendEmail };