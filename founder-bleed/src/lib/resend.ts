import { Resend } from 'resend';

// Initialize Resend client - warn if not configured but don't throw
// This allows the app to work in development without email configured
const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn('RESEND_API_KEY not set - email functionality will be disabled');
}

export const resend = new Resend(apiKey || 'placeholder');

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Founder Bleed <noreply@founderbleed.com>';

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
