import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { byokKeys } from "@/lib/db/schema";
import { encrypt } from "@/lib/encryption";

const SUPPORTED_PROVIDERS = ["openai", "anthropic", "google"] as const;
const PRIORITIES = ["byok_first", "budget_first", "byok_premium_only"] as const;

type Provider = (typeof SUPPORTED_PROVIDERS)[number];

type ByokPayload = {
  provider?: Provider;
  apiKey?: string;
  priority?: (typeof PRIORITIES)[number];
};

function maskKey(key: string) {
  if (key.length <= 6) return "***";
  return `${key.slice(0, 3)}***${key.slice(-4)}`;
}

async function validateKey(provider: Provider, apiKey: string) {
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return response.ok;
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    return response.ok;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  return response.ok;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as ByokPayload | null;
  if (!payload?.provider || !payload.apiKey) {
    return NextResponse.json({ error: "provider and apiKey required" }, { status: 400 });
  }

  if (!SUPPORTED_PROVIDERS.includes(payload.provider)) {
    return NextResponse.json({ error: "unsupported provider" }, { status: 400 });
  }

  const priority = PRIORITIES.includes(payload.priority || "budget_first")
    ? payload.priority || "budget_first"
    : "budget_first";

  const isValid = await validateKey(payload.provider, payload.apiKey);
  if (!isValid) {
    return NextResponse.json({ error: "invalid api key" }, { status: 400 });
  }

  const encryptedKey = encrypt(payload.apiKey);

  const existing = await db.query.byokKeys.findFirst({
    where: and(
      eq(byokKeys.userId, session.user.id),
      eq(byokKeys.provider, payload.provider)
    ),
  });

  if (existing) {
    await db
      .update(byokKeys)
      .set({
        apiKeyEncrypted: encryptedKey,
        priority,
        createdAt: new Date(),
      })
      .where(eq(byokKeys.id, existing.id));
  } else {
    await db.insert(byokKeys).values({
      id: randomUUID(),
      userId: session.user.id,
      provider: payload.provider,
      apiKeyEncrypted: encryptedKey,
      priority,
      createdAt: new Date(),
    });
  }

  return NextResponse.json({ ok: true, key: maskKey(payload.apiKey) });
}
