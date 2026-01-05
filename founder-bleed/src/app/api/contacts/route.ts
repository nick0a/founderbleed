import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { contacts, users, notifications, userPrivacySettings, auditRuns } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { resend, EMAIL_FROM, isEmailConfigured } from '@/lib/resend';

// GET - List contacts (sent invites, received invites, accepted connections)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all contact records where user is involved
    const allContacts = await db.query.contacts.findMany({
      where: or(
        eq(contacts.userId, session.user.id),
        eq(contacts.contactUserId, session.user.id)
      ),
    });

    // Get user info for all contacts
    const userIds = new Set<string>();
    allContacts.forEach(c => {
      if (c.userId && c.userId !== session.user.id) userIds.add(c.userId);
      if (c.contactUserId && c.contactUserId !== session.user.id) userIds.add(c.contactUserId);
    });

    const contactUsers = userIds.size > 0 ? await db.query.users.findMany({
      where: or(...Array.from(userIds).map(id => eq(users.id, id))),
      columns: { id: true, name: true, email: true, username: true },
    }) : [];

    const userMap = new Map(contactUsers.map(u => [u.id, u]));

    // Categorize contacts
    const sentPending = allContacts
      .filter(c => c.userId === session.user.id && c.status === 'pending')
      .map(c => ({
        ...c,
        contactUser: c.contactUserId ? userMap.get(c.contactUserId) : null,
      }));

    const receivedPending = allContacts
      .filter(c => c.contactUserId === session.user.id && c.status === 'pending')
      .map(c => ({
        ...c,
        contactUser: userMap.get(c.userId!),
      }));

    const accepted = allContacts
      .filter(c => c.status === 'accepted')
      .map(c => {
        const otherUserId = c.userId === session.user.id ? c.contactUserId : c.userId;
        return {
          ...c,
          contactUser: otherUserId ? userMap.get(otherUserId) : null,
        };
      });

    return NextResponse.json({
      sentPending,
      receivedPending,
      accepted,
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json({ error: 'Failed to get contacts' }, { status: 500 });
  }
}

// POST - Invite a contact by email
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    // Can't invite yourself
    if (normalizedEmail === currentUser?.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
    }

    // Check if user exists with that email
    const targetUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    // Check for existing connection
    if (targetUser) {
      const existing = await db.query.contacts.findFirst({
        where: or(
          and(
            eq(contacts.userId, session.user.id),
            eq(contacts.contactUserId, targetUser.id)
          ),
          and(
            eq(contacts.userId, targetUser.id),
            eq(contacts.contactUserId, session.user.id)
          )
        ),
      });

      if (existing) {
        if (existing.status === 'accepted') {
          return NextResponse.json({ error: 'Already connected with this user' }, { status: 400 });
        }
        if (existing.status === 'pending') {
          return NextResponse.json({ error: 'Invitation already pending' }, { status: 400 });
        }
      }
    } else {
      // Check for existing pending invite by email
      const existingByEmail = await db.query.contacts.findFirst({
        where: and(
          eq(contacts.userId, session.user.id),
          eq(contacts.contactEmail, normalizedEmail)
        ),
      });

      if (existingByEmail) {
        return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 });
      }
    }

    // Create contact invitation
    const [contact] = await db.insert(contacts).values({
      userId: session.user.id,
      contactUserId: targetUser?.id || null,
      contactEmail: targetUser ? null : normalizedEmail,
      status: 'pending',
    }).returning();

    // Create notification for target user if they exist
    if (targetUser) {
      await db.insert(notifications).values({
        userId: targetUser.id,
        type: 'contact_invite',
        title: 'New Contact Request',
        body: `${currentUser?.name || currentUser?.email} wants to connect with you on Founder Bleed`,
        link: '/settings?tab=contacts',
      });
    }

    // Send email invitation
    if (isEmailConfigured()) {
      const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/settings?tab=contacts`;

      await resend.emails.send({
        from: EMAIL_FROM,
        to: normalizedEmail,
        subject: `${currentUser?.name || 'A founder'} wants to connect on Founder Bleed`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Contact Request</h2>
            <p>${currentUser?.name || currentUser?.email} has invited you to connect on Founder Bleed.</p>
            <p>Connect to compare your delegation efficiency and planning scores on the leaderboard.</p>
            <p>
              <a href="${inviteUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                ${targetUser ? 'View Request' : 'Sign Up & Connect'}
              </a>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              Founder Bleed helps founders identify time they can delegate to unlock more strategic focus.
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

// PATCH - Accept or decline invitation
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { contactId, action } = await request.json();

    if (!contactId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Find the contact invitation
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, contactId),
        eq(contacts.contactUserId, session.user.id),
        eq(contacts.status, 'pending')
      ),
    });

    if (!contact) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (action === 'accept') {
      await db.update(contacts)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
        })
        .where(eq(contacts.id, contactId));

      // Notify the inviter
      await db.insert(notifications).values({
        userId: contact.userId!,
        type: 'contact_invite',
        title: 'Contact Request Accepted',
        body: 'Your contact request was accepted! You can now see each other on the leaderboard.',
        link: '/settings?tab=contacts',
      });
    } else {
      await db.update(contacts)
        .set({ status: 'declined' })
        .where(eq(contacts.id, contactId));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
  }
}

// DELETE - Remove contact
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID required' }, { status: 400 });
    }

    // Verify ownership (either side can remove)
    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, contactId),
        or(
          eq(contacts.userId, session.user.id),
          eq(contacts.contactUserId, session.user.id)
        )
      ),
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await db.delete(contacts).where(eq(contacts.id, contactId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json({ error: 'Failed to remove contact' }, { status: 500 });
  }
}
