# Resend Email Integration Guide

## Overview

This document provides complete implementation instructions for integrating Resend email service into the Founder Bleed application. Resend is used for:
- Sharing audit reports via email
- Sending verification emails for shared report access
- Sending invitation emails for contacts
- Audit completion notifications

---

## Prerequisites

- Resend account with API key from [Resend Dashboard](https://resend.com/api-keys)
- Verified sending domain configured in Resend

---

## Environment Variables

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=delegate-everything@founderbleed.com
```

---

## Installation

```bash
npm install resend
```

**Source:** [Resend Next.js Documentation](https://resend.com/docs/send-with-nextjs)

---

## SDK Initialization

Create `src/lib/resend.ts`:

```typescript
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

**Source:** [Resend Node.js Documentation](https://resend.com/nodejs)

---

## Sending Single Emails

### Basic Email Send

```typescript
import { resend } from '@/lib/resend';

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Founder Bleed <noreply@founderbleed.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error(error.message);
    }

    return { success: true, emailId: data?.id };
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
}
```

### API Reference

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Sender email. Format: `"Name <email@domain>"` |
| `to` | string \| string[] | Yes | Recipient(s), max 50 per email |
| `subject` | string | Yes | Email subject line |
| `html` | string | One of html/text/react | HTML content |
| `text` | string | One of html/text/react | Plain text (auto-generated from HTML if omitted) |
| `react` | ReactNode | One of html/text/react | React component (Node.js SDK only) |
| `cc` | string \| string[] | No | Carbon copy recipients |
| `bcc` | string \| string[] | No | Blind carbon copy recipients |
| `replyTo` | string | No | Reply-to address |
| `headers` | object | No | Custom email headers |
| `tags` | array | No | Key-value metadata pairs |

**Response:**
```json
{
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```

**Source:** [Resend API Reference - Send Email](https://resend.com/docs/api-reference/emails/send-email)

---

## Batch Sending (Multiple Recipients)

For sending to multiple recipients with personalized content, use the batch API.

### Endpoint
`POST https://api.resend.com/emails/batch`

### Implementation

```typescript
import { resend } from '@/lib/resend';

export async function sendBatchEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
  }>
) {
  if (emails.length > 100) {
    throw new Error('Batch limit is 100 emails per request');
  }

  try {
    const { data, error } = await resend.batch.send(
      emails.map(email => ({
        from: process.env.EMAIL_FROM || 'Founder Bleed <noreply@founderbleed.com>',
        to: [email.to],
        subject: email.subject,
        html: email.html,
      }))
    );

    if (error) {
      console.error('Batch send error:', error);
      throw new Error(error.message);
    }

    return { success: true, results: data };
  } catch (error) {
    console.error('Batch email send failed:', error);
    throw error;
  }
}
```

### Batch Limitations
- Maximum 100 emails per request
- `attachments` field NOT supported in batch
- `scheduled_at` field NOT supported in batch

**Response:**
```json
{
  "data": [
    { "id": "ae2014de-c168-4c61-8267-70d2662a1ce1" },
    { "id": "faccb7a5-8a28-4e9a-ac64-8da1cc3bc1cb" }
  ]
}
```

**Source:** [Resend Batch Emails API](https://resend.com/docs/api-reference/emails/send-batch-emails)

---

## React Email Templates

Create reusable email templates with React components.

### Install React Email (Optional)

```bash
npm install @react-email/components
```

### Share Report Email Template

Create `src/emails/share-report.tsx`:

```typescript
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Link,
  Button,
  Section,
  Heading,
} from '@react-email/components';

interface ShareReportEmailProps {
  senderName: string;
  shareUrl: string;
  heroMetric?: string;
}

export function ShareReportEmail({
  senderName,
  shareUrl,
  heroMetric,
}: ShareReportEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Heading as="h1" style={{ color: '#1a1a1a' }}>
            {senderName} shared their calendar audit with you
          </Heading>

          {heroMetric && (
            <Section style={{ backgroundColor: '#fef2f2', padding: '20px', borderRadius: '8px' }}>
              <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                They discovered they're losing {heroMetric}/year on delegatable work
              </Text>
            </Section>
          )}

          <Section style={{ marginTop: '20px' }}>
            <Text>
              Click below to view their detailed audit results, including role recommendations
              and delegation opportunities.
            </Text>

            <Button
              href={shareUrl}
              style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
                display: 'inline-block',
                marginTop: '16px',
              }}
            >
              View Audit Results
            </Button>
          </Section>

          <Section style={{ marginTop: '40px', borderTop: '1px solid #e5e5e5', paddingTop: '20px' }}>
            <Text style={{ color: '#666', fontSize: '14px' }}>
              Want to audit your own calendar?{' '}
              <Link href="https://founderbleed.com" style={{ color: '#000' }}>
                Get started free
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

### Verification Email Template

Create `src/emails/verification.tsx`:

```typescript
import {
  Html,
  Head,
  Body,
  Container,
  Text,
  Button,
  Section,
  Heading,
} from '@react-email/components';

interface VerificationEmailProps {
  verificationUrl: string;
}

export function VerificationEmail({ verificationUrl }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Heading as="h1" style={{ color: '#1a1a1a' }}>
            Verify your email to view the report
          </Heading>

          <Text>
            Click the button below to verify your email and access the shared audit report.
          </Text>

          <Button
            href={verificationUrl}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Verify Email
          </Button>

          <Text style={{ color: '#666', fontSize: '14px', marginTop: '20px' }}>
            This link expires in 24 hours.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Using React Templates

```typescript
import { resend } from '@/lib/resend';
import { ShareReportEmail } from '@/emails/share-report';

await resend.emails.send({
  from: 'Founder Bleed <noreply@founderbleed.com>',
  to: recipientEmail,
  subject: `${senderName} shared their calendar audit with you`,
  react: ShareReportEmail({
    senderName,
    shareUrl,
    heroMetric: '$127,000',
  }),
});
```

**Source:** [Resend React Email Integration](https://resend.com/docs/send-with-nextjs)

---

## API Route Implementation

### Send Report API

Create `src/app/api/share/send-report/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resend } from '@/lib/resend';
import { db } from '@/lib/db';
import { sharedReports, reportAccessLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { ShareReportEmail } from '@/emails/share-report';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { auditId, emails } = await request.json();

  // Validate emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of emails) {
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: `Invalid email: ${email}` },
        { status: 400 }
      );
    }
  }

  try {
    // Get or create share token
    let sharedReport = await db.query.sharedReports.findFirst({
      where: eq(sharedReports.auditRunId, auditId),
    });

    if (!sharedReport) {
      const shareToken = nanoid(32);
      const [created] = await db.insert(sharedReports).values({
        auditRunId: auditId,
        shareToken,
        ownerUserId: session.user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }).returning();
      sharedReport = created;
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${sharedReport.shareToken}`;

    // Send emails using batch API for efficiency
    const emailPromises = emails.map((email: string) => ({
      from: process.env.EMAIL_FROM || 'Founder Bleed <noreply@founderbleed.com>',
      to: [email],
      subject: `${session.user.name} shared their calendar audit with you`,
      react: ShareReportEmail({
        senderName: session.user.name || 'A Founder Bleed user',
        shareUrl,
      }),
    }));

    const { data, error } = await resend.batch.send(emailPromises);

    if (error) {
      console.error('Resend batch error:', error);
      return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
    }

    // Store emails as leads
    for (const email of emails) {
      await db.insert(reportAccessLog).values({
        sharedReportId: sharedReport.id,
        viewerEmail: email,
        emailVerified: false,
      });
    }

    return NextResponse.json({
      success: true,
      sentCount: emails.length,
      shareUrl,
    });

  } catch (error) {
    console.error('Send report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## Idempotency

Prevent duplicate email sends using the `Idempotency-Key` header:

```typescript
await resend.emails.send({
  from: 'Founder Bleed <noreply@founderbleed.com>',
  to: recipientEmail,
  subject: 'Your audit is ready',
  html: '<p>Your audit has completed.</p>',
}, {
  headers: {
    'Idempotency-Key': `audit-ready-${auditId}-${userId}`,
  },
});
```

**Notes:**
- Key must be unique per request
- Expires after 24 hours
- Maximum 256 characters

**Source:** [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email)

---

## Error Handling

```typescript
import { resend } from '@/lib/resend';

try {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Test',
    html: '<p>Test</p>',
  });

  if (error) {
    // API returned an error
    console.error('Resend API error:', error.name, error.message);

    // Common errors:
    // - validation_error: Invalid parameters
    // - rate_limit_exceeded: Too many requests
    // - invalid_api_key: Check RESEND_API_KEY

    throw new Error(error.message);
  }

  return data;
} catch (err) {
  // Network or other error
  console.error('Email send failed:', err);
  throw err;
}
```

---

## Testing in Development

Use Resend's test email addresses:
- `delivered@resend.dev` - Always succeeds
- `bounced@resend.dev` - Simulates bounce
- `complained@resend.dev` - Simulates spam complaint

```typescript
// In development, use test addresses
const testEmail = process.env.NODE_ENV === 'development'
  ? 'delivered@resend.dev'
  : actualEmail;
```

---

## Rate Limits

Resend enforces rate limits based on your plan:
- Free tier: 100 emails/day, 1 email/second
- Pro tier: Higher limits

Check your current limits in the [Resend Dashboard](https://resend.com/usage).

**Source:** [Resend Usage Limits](https://resend.com/docs/knowledge-base/usage-limits)

---

## Sources

- [Resend Official Documentation](https://resend.com/docs)
- [Resend Next.js Integration](https://resend.com/docs/send-with-nextjs)
- [Resend API Reference - Send Email](https://resend.com/docs/api-reference/emails/send-email)
- [Resend Batch Emails API](https://resend.com/docs/api-reference/emails/send-batch-emails)
- [Resend Node.js SDK](https://resend.com/nodejs)
- [Resend Blog - Batch Emails API](https://resend.com/blog/introducing-the-batch-emails-api)
