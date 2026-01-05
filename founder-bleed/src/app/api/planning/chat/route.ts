import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditRuns, planningSessions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy',
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, sessionId, auditId } = await request.json();

  // Get or create session
  let planningSessionId = sessionId;
  if (!planningSessionId) {
      // Create new session
      const [newSession] = await db.insert(planningSessions).values({
          userId: session.user.id,
          auditRunId: auditId,
          sessionType: 'chat'
      }).returning();
      planningSessionId = newSession.id;
  }

  // Get context from audit
  const auditRun = await db.query.auditRuns.findFirst({
      where: eq(auditRuns.id, auditId)
  });

  const metrics = (auditRun?.computedMetrics as any) || {};
  const efficiencyScore = metrics.efficiencyScore || 0;
  const planningScore = auditRun?.planningScore || 0;
  const hoursByTier = metrics.hoursByTier || {};

  const systemPrompt = `You are a productivity coach helping founders optimize their calendar.
You have access to their audit results showing how they spend time.

User's Audit Data:
- Efficiency Score: ${efficiencyScore}%
- Planning Score: ${planningScore}%
- Hours by tier: Unique: ${hoursByTier.unique || 0}h, Founder: ${hoursByTier.founder || 0}h, Senior: ${hoursByTier.senior || 0}h, Junior: ${hoursByTier.junior || 0}h, EA: ${hoursByTier.ea || 0}h

When suggesting calendar changes:
- Be specific with times and durations
- Explain why each change helps
- Suggest protecting time for high-value work

You can suggest new events to add to their calendar.
Format event suggestions as structured data JSON block at the end of message if relevant:
\`\`\`json
{
  "type": "event_suggestion",
  "title": "Focus: Product Strategy",
  "start": "2025-01-07T09:00:00",
  "end": "2025-01-07T12:00:00",
  "tier": "unique"
}
\`\`\`
`;

  // Call AI
  let aiResponseText = "";
  
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy') {
      try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
        });
        aiResponseText = completion.choices[0].message.content || "";
      } catch (e) {
          console.error("OpenAI error", e);
          aiResponseText = "Sorry, I encountered an error connecting to the AI service.";
      }
  } else {
      // Mock response
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      aiResponseText = `Based on your efficiency score of ${efficiencyScore}%, I suggest you delegate more tasks.
      
I recommend adding a focus block for tomorrow.

\`\`\`json
{
  "type": "event_suggestion",
  "title": "Focus: Deep Work",
  "start": "${tomorrow}T09:00:00",
  "end": "${tomorrow}T11:00:00",
  "tier": "unique"
}
\`\`\`
`;
  }

  return NextResponse.json({ 
      response: aiResponseText,
      sessionId: planningSessionId
  });
}
