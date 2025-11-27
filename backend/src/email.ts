import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

// Hash email for privacy
export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

// Generate a secure email verification token
export function generateEmailToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

interface ListLink {
  name: string;
  creatorUrl: string;
  buyerUrl: string;
}

// Send list links to email
export async function sendListLinksEmail(
  to: string,
  lists: ListLink[]
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email send');
    return false;
  }

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const listItems = lists.map(list => `
      <div style="margin: 20px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 18px;">${list.name}</h3>
        <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">
          <strong>Your Creator Link:</strong><br/>
          <a href="${list.creatorUrl}" style="color: #4f46e5; text-decoration: none;">${list.creatorUrl}</a>
        </p>
        <p style="margin: 8px 0; color: #6b7280; font-size: 14px;">
          <strong>Buyer Link (share this):</strong><br/>
          <a href="${list.buyerUrl}" style="color: #10b981; text-decoration: none;">${list.buyerUrl}</a>
        </p>
      </div>
    `).join('');

    await resend.emails.send({
      from: 'BlindList <onboarding@resend.dev>', // Change this to your verified domain
      to,
      subject: `Your BlindList ${lists.length > 1 ? 'Lists' : 'List'}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #111827; margin-bottom: 8px;">BlindList</h1>
              <p style="color: #6b7280; font-size: 14px;">Your Wishlist Links</p>
            </div>

            <p style="margin-bottom: 20px;">Hi there! Here ${lists.length > 1 ? 'are' : 'is'} your BlindList ${lists.length > 1 ? 'lists' : 'list'}:</p>

            ${listItems}

            <div style="margin-top: 30px; padding: 16px; background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Remember:</strong> Use your Creator Link to manage items. Share the Buyer Link with friends and family so they can mark items as purchased. You'll stay blind to what they choose!
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>This email was sent from BlindList. If you didn't request this, you can safely ignore it.</p>
              <p><a href="${baseUrl}" style="color: #4f46e5; text-decoration: none;">Visit BlindList</a></p>
            </div>
          </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Send verification email with magic link
export async function sendVerificationEmail(
  to: string,
  emailToken: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email send');
    return false;
  }

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${baseUrl}/verify-email/${emailToken}`;

  try {
    await resend.emails.send({
      from: 'BlindList <onboarding@resend.dev>', // Change this to your verified domain
      to,
      subject: 'Access Your BlindLists',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #111827; margin-bottom: 8px;">BlindList</h1>
              <p style="color: #6b7280; font-size: 14px;">Access Your Lists</p>
            </div>

            <p style="margin-bottom: 20px;">Hi there! Click the button below to access all your BlindLists associated with this email:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Access My Lists
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Or copy and paste this link into your browser:<br/>
              <a href="${verificationUrl}" style="color: #4f46e5; word-break: break-all;">${verificationUrl}</a>
            </p>

            <div style="margin-top: 30px; padding: 16px; background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Note:</strong> This link expires in 1 hour and can only be used once.
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
              <p>This email was sent from BlindList. If you didn't request this, you can safely ignore it.</p>
              <p><a href="${baseUrl}" style="color: #4f46e5; text-decoration: none;">Visit BlindList</a></p>
            </div>
          </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}
