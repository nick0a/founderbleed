import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { byokKeys } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/encryption';

const VALID_PROVIDERS = ['openai', 'anthropic', 'google'] as const;
type Provider = typeof VALID_PROVIDERS[number];

// Validate API key by making a test request
async function validateApiKey(provider: Provider, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (response.ok) return { valid: true };
        if (response.status === 401) return { valid: false, error: 'Invalid API key' };
        return { valid: false, error: 'Failed to validate key' };
      }
      case 'anthropic': {
        // Anthropic doesn't have a simple validation endpoint, so we just check format
        if (!apiKey.startsWith('sk-ant-')) {
          return { valid: false, error: 'Invalid Anthropic API key format' };
        }
        return { valid: true };
      }
      case 'google': {
        // Google AI Studio keys also don't have a simple validation endpoint
        if (apiKey.length < 20) {
          return { valid: false, error: 'API key too short' };
        }
        return { valid: true };
      }
      default:
        return { valid: false, error: 'Invalid provider' };
    }
  } catch (error) {
    console.error('Key validation error:', error);
    return { valid: false, error: 'Failed to validate key' };
  }
}

// GET - List BYOK keys (without revealing actual keys)
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keys = await db.select({
      id: byokKeys.id,
      provider: byokKeys.provider,
      priority: byokKeys.priority,
      createdAt: byokKeys.createdAt,
    })
      .from(byokKeys)
      .where(eq(byokKeys.userId, session.user.id));

    // Add masked key preview
    const maskedKeys = await Promise.all(
      keys.map(async (key) => {
        const fullKey = await db.query.byokKeys.findFirst({
          where: eq(byokKeys.id, key.id),
        });
        if (fullKey?.apiKeyEncrypted) {
          const decrypted = decrypt(fullKey.apiKeyEncrypted);
          return {
            ...key,
            keyPreview: `${decrypted.slice(0, 8)}...${decrypted.slice(-4)}`,
          };
        }
        return { ...key, keyPreview: '****' };
      })
    );

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error('Get BYOK keys error:', error);
    return NextResponse.json({ error: 'Failed to get keys' }, { status: 500 });
  }
}

// POST - Add new BYOK key
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { provider, apiKey, priority = 'budget_first' } = await request.json();

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be openai, anthropic, or google' },
        { status: 400 }
      );
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 400 }
      );
    }

    if (!['byok_first', 'budget_first', 'byok_premium_only'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be byok_first, budget_first, or byok_premium_only' },
        { status: 400 }
      );
    }

    // Validate the API key
    const validation = await validateApiKey(provider, apiKey);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid API key' },
        { status: 400 }
      );
    }

    // Check if key for this provider already exists
    const existing = await db.query.byokKeys.findFirst({
      where: and(
        eq(byokKeys.userId, session.user.id),
        eq(byokKeys.provider, provider)
      ),
    });

    const encryptedKey = encrypt(apiKey);

    if (existing) {
      // Update existing key
      await db.update(byokKeys)
        .set({
          apiKeyEncrypted: encryptedKey,
          priority,
        })
        .where(eq(byokKeys.id, existing.id));

      return NextResponse.json({ success: true, updated: true });
    }

    // Insert new key
    await db.insert(byokKeys).values({
      userId: session.user.id,
      provider,
      apiKeyEncrypted: encryptedKey,
      priority,
    });

    return NextResponse.json({ success: true, created: true });
  } catch (error) {
    console.error('Add BYOK key error:', error);
    return NextResponse.json({ error: 'Failed to add key' }, { status: 500 });
  }
}

// DELETE - Remove BYOK key
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
    }

    // Verify ownership
    const key = await db.query.byokKeys.findFirst({
      where: and(
        eq(byokKeys.id, keyId),
        eq(byokKeys.userId, session.user.id)
      ),
    });

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    await db.delete(byokKeys).where(eq(byokKeys.id, keyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete BYOK key error:', error);
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
  }
}

// PATCH - Update priority
export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, priority } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing key ID' }, { status: 400 });
    }

    if (!['byok_first', 'budget_first', 'byok_premium_only'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority' },
        { status: 400 }
      );
    }

    // Verify ownership
    const key = await db.query.byokKeys.findFirst({
      where: and(
        eq(byokKeys.id, id),
        eq(byokKeys.userId, session.user.id)
      ),
    });

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    await db.update(byokKeys)
      .set({ priority })
      .where(eq(byokKeys.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update BYOK key error:', error);
    return NextResponse.json({ error: 'Failed to update key' }, { status: 500 });
  }
}
