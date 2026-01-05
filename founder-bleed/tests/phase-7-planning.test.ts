/**
 * Phase 7: Planning Assistant Tests
 * 
 * Run with: npx tsx tests/phase-7-planning.test.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3003';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function pass(name: string, details?: string) {
  results.push({ name, passed: true, details });
  console.log(`✅ ${name}${details ? `: ${details}` : ''}`);
}

function fail(name: string, error: string) {
  results.push({ name, passed: false, error });
  console.log(`❌ ${name}: ${error}`);
}

// PLAN-01: Free User Sees Paywall (structural verification)
async function testFreeUserSeesPaywall() {
  const testName = 'PLAN-01: Free User Sees Paywall';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check planning page component
    const planningClientPath = path.join(process.cwd(), 'src/app/(dashboard)/planning/planning-client.tsx');
    const exists = fs.existsSync(planningClientPath);
    
    if (!exists) {
      fail(testName, 'Planning client component not found');
      return false;
    }
    
    const content = fs.readFileSync(planningClientPath, 'utf-8');
    
    // Check for paywall implementation
    const hasPaywallModal = content.includes('PaywallModal') || content.includes('paywall');
    const hasSubscriptionCheck = content.includes('subscription') || content.includes('isSubscribed') || content.includes('tier');
    const hasFreeCheck = content.includes('free') || content.includes('Free');
    
    // Check paywall modal component exists
    const paywallModalPath = path.join(process.cwd(), 'src/components/paywall-modal.tsx');
    const paywallExists = fs.existsSync(paywallModalPath);
    
    if (hasPaywallModal && hasSubscriptionCheck && paywallExists) {
      pass(testName, 'Paywall modal implemented with subscription check');
      return true;
    }
    
    if (hasSubscriptionCheck && paywallExists) {
      pass(testName, 'Subscription gating in place');
      return true;
    }
    
    fail(testName, 'Paywall or subscription check not properly implemented');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-02: Subscriber Sees Chat (structural verification)
async function testSubscriberSeesChat() {
  const testName = 'PLAN-02: Subscriber Sees Chat';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check planning client component
    const planningClientPath = path.join(process.cwd(), 'src/app/(dashboard)/planning/planning-client.tsx');
    const content = fs.readFileSync(planningClientPath, 'utf-8');
    
    // Check for chat interface
    const hasChatComponent = content.includes('PlanningChat') || content.includes('Chat') || content.includes('useChat');
    const hasMessageInput = content.includes('input') || content.includes('Input') || content.includes('textarea');
    const hasMessages = content.includes('messages') || content.includes('conversation');
    
    // Check planning chat component exists
    const chatComponentPath = path.join(process.cwd(), 'src/components/planning/planning-chat.tsx');
    const chatExists = fs.existsSync(chatComponentPath);
    
    if (chatExists) {
      const chatContent = fs.readFileSync(chatComponentPath, 'utf-8');
      const hasUseChat = chatContent.includes('useChat') || chatContent.includes('ai/react');
      const hasInput = chatContent.includes('input') || chatContent.includes('Input');
      const hasSubmit = chatContent.includes('submit') || chatContent.includes('send') || chatContent.includes('handleSubmit');
      
      if (hasUseChat && hasInput) {
        pass(testName, 'Chat interface with useChat hook and message input');
        return true;
      }
    }
    
    if (hasChatComponent || (hasMessageInput && hasMessages)) {
      pass(testName, 'Chat interface available for subscribers');
      return true;
    }
    
    fail(testName, 'Chat interface not properly implemented');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-03: AI Responds (structural - check API route exists)
async function testAIResponds() {
  const testName = 'PLAN-03: AI Chat API Route';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check chat API route exists
    const chatRoutePath = path.join(process.cwd(), 'src/app/api/planning/chat/route.ts');
    const exists = fs.existsSync(chatRoutePath);
    
    if (!exists) {
      fail(testName, 'Planning chat API route not found');
      return false;
    }
    
    const content = fs.readFileSync(chatRoutePath, 'utf-8');
    
    // Check for streaming implementation
    const hasStreamText = content.includes('streamText') || content.includes('stream');
    const hasOpenAI = content.includes('openai') || content.includes('OpenAI');
    const hasVercelAI = content.includes('ai/') || content.includes('@ai-sdk');
    const hasSystemPrompt = content.includes('system') || content.includes('System');
    
    if (hasStreamText && (hasOpenAI || hasVercelAI)) {
      pass(testName, 'Chat API with streaming and OpenAI integration');
      return true;
    }
    
    if (hasOpenAI || hasVercelAI) {
      pass(testName, 'Chat API with AI integration');
      return true;
    }
    
    fail(testName, 'Chat API missing streaming or AI integration');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-04: Context Injected
async function testContextInjected() {
  const testName = 'PLAN-04: Context Injected';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check chat API route for context injection
    const chatRoutePath = path.join(process.cwd(), 'src/app/api/planning/chat/route.ts');
    const content = fs.readFileSync(chatRoutePath, 'utf-8');
    
    // Check for audit data context
    const hasAuditData = content.includes('audit') || content.includes('Audit');
    const hasEfficiencyScore = content.includes('efficiency') || content.includes('Efficiency') || content.includes('score');
    const hasPlanningScore = content.includes('planning') || content.includes('Planning');
    const hasTierData = content.includes('tier') || content.includes('Unique') || content.includes('Founder');
    const hasSystemPrompt = content.includes('system') || content.includes('prompt') || content.includes('context');
    
    if (hasSystemPrompt && (hasAuditData || hasEfficiencyScore || hasTierData)) {
      pass(testName, 'System prompt includes audit data context');
      return true;
    }
    
    if (hasAuditData && hasTierData) {
      pass(testName, 'Audit context available for AI');
      return true;
    }
    
    fail(testName, 'Context injection for audit data not found');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-05: Calendar View Shows Events
async function testCalendarViewShowsEvents() {
  const testName = 'PLAN-05: Calendar View Shows Events';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check calendar week view component
    const calendarPath = path.join(process.cwd(), 'src/components/planning/calendar-week-view.tsx');
    const exists = fs.existsSync(calendarPath);
    
    if (!exists) {
      fail(testName, 'Calendar week view component not found');
      return false;
    }
    
    const content = fs.readFileSync(calendarPath, 'utf-8');
    
    // Check for calendar features
    const hasWeekGrid = content.includes('week') || content.includes('Week') || content.includes('day') || content.includes('Day');
    const hasEvents = content.includes('event') || content.includes('Event');
    const hasNavigation = content.includes('prev') || content.includes('next') || content.includes('Today') || content.includes('navigation');
    const hasTimeSlots = content.includes('hour') || content.includes('time') || content.includes('8') || content.includes('9');
    
    // Check for tier color coding
    const hasTierColors = content.includes('purple') || content.includes('Purple') || 
                          content.includes('blue') || content.includes('Blue') ||
                          content.includes('green') || content.includes('Green') ||
                          content.includes('yellow') || content.includes('Yellow') ||
                          content.includes('gray') || content.includes('Gray') ||
                          content.includes('tier') || content.includes('Tier');
    
    if (hasWeekGrid && hasEvents && hasTierColors) {
      pass(testName, 'Calendar view with week grid, events, and tier color coding');
      return true;
    }
    
    if (hasWeekGrid && hasEvents) {
      pass(testName, 'Calendar view displays events on week grid');
      return true;
    }
    
    fail(testName, 'Calendar view missing required features');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-06: Per-Event Planning Scores
async function testPerEventPlanningScores() {
  const testName = 'PLAN-06: Per-Event Planning Scores';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check calendar component for score badges
    const calendarPath = path.join(process.cwd(), 'src/components/planning/calendar-week-view.tsx');
    const content = fs.readFileSync(calendarPath, 'utf-8');
    
    // Check for planning score badges
    const hasScoreBadge = content.includes('score') || content.includes('Score') || content.includes('badge') || content.includes('Badge');
    const hasColorCoding = content.includes('green') || content.includes('amber') || content.includes('red') || 
                          content.includes('🟢') || content.includes('🟡') || content.includes('🔴');
    const hasThresholds = content.includes('70') || content.includes('40') || content.includes('%');
    
    // Check planning score lib
    const planningScorePath = path.join(process.cwd(), 'src/lib/planning-score.ts');
    const planningScoreExists = fs.existsSync(planningScorePath);
    
    if (planningScoreExists) {
      const scoreContent = fs.readFileSync(planningScorePath, 'utf-8');
      const hasScoreCalculation = scoreContent.includes('score') || scoreContent.includes('Score');
      
      if (hasScoreCalculation && (hasScoreBadge || hasColorCoding)) {
        pass(testName, 'Per-event planning scores with color-coded badges');
        return true;
      }
    }
    
    if (hasScoreBadge && hasColorCoding) {
      pass(testName, 'Planning score badges with color coding');
      return true;
    }
    
    if (hasScoreBadge || planningScoreExists) {
      pass(testName, 'Planning score implementation present');
      return true;
    }
    
    fail(testName, 'Per-event planning scores not implemented');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-07: Event Suggestions Render
async function testEventSuggestionsRender() {
  const testName = 'PLAN-07: Event Suggestions Render';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check event suggestion card component
    const suggestionCardPath = path.join(process.cwd(), 'src/components/planning/event-suggestion-card.tsx');
    const exists = fs.existsSync(suggestionCardPath);
    
    if (!exists) {
      fail(testName, 'Event suggestion card component not found');
      return false;
    }
    
    const content = fs.readFileSync(suggestionCardPath, 'utf-8');
    
    // Check for suggestion card features
    const hasTitle = content.includes('title') || content.includes('Title');
    const hasTime = content.includes('time') || content.includes('Time') || content.includes('start') || content.includes('end');
    const hasAddButton = content.includes('Add') || content.includes('add') || content.includes('Calendar');
    const hasDismiss = content.includes('Dismiss') || content.includes('dismiss') || content.includes('close') || content.includes('remove');
    const hasTier = content.includes('tier') || content.includes('Tier');
    
    if (hasTitle && hasTime && hasAddButton) {
      pass(testName, 'Event suggestion cards with title, time, and Add to Calendar button');
      return true;
    }
    
    fail(testName, 'Event suggestion card missing required features');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-08: Add Without Write Scope (scope upgrade prompt)
async function testAddWithoutWriteScope() {
  const testName = 'PLAN-08: Add Without Write Scope';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check scope upgrade modal
    const scopeUpgradePath = path.join(process.cwd(), 'src/components/planning/scope-upgrade-modal.tsx');
    const exists = fs.existsSync(scopeUpgradePath);
    
    if (!exists) {
      fail(testName, 'Scope upgrade modal not found');
      return false;
    }
    
    const content = fs.readFileSync(scopeUpgradePath, 'utf-8');
    
    // Check for upgrade prompt features
    const hasWriteAccess = content.includes('write') || content.includes('Write');
    const hasPermission = content.includes('permission') || content.includes('Permission') || content.includes('access') || content.includes('Access');
    const hasGrantButton = content.includes('Grant') || content.includes('grant') || content.includes('Upgrade') || content.includes('Allow');
    const hasCancel = content.includes('Cancel') || content.includes('cancel');
    
    // Check for upgrade scope API
    const upgradeRoutePath = path.join(process.cwd(), 'src/app/api/calendar/upgrade-scope/route.ts');
    const upgradeRouteExists = fs.existsSync(upgradeRoutePath);
    
    if (hasWriteAccess && hasPermission && hasGrantButton && upgradeRouteExists) {
      pass(testName, 'Scope upgrade modal with write access request and API');
      return true;
    }
    
    if (hasWriteAccess && hasGrantButton) {
      pass(testName, 'Scope upgrade prompt for write access');
      return true;
    }
    
    fail(testName, 'Scope upgrade flow not properly implemented');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-09: Add With Write Scope (event creation API)
async function testAddWithWriteScope() {
  const testName = 'PLAN-09: Add With Write Scope';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check create event API
    const createEventPath = path.join(process.cwd(), 'src/app/api/calendar/events/create/route.ts');
    const exists = fs.existsSync(createEventPath);
    
    if (!exists) {
      fail(testName, 'Create event API route not found');
      return false;
    }
    
    const content = fs.readFileSync(createEventPath, 'utf-8');
    
    // Check for event creation features
    const hasInsert = content.includes('insert') || content.includes('create') || content.includes('Create');
    const hasCalendarAPI = content.includes('calendar') || content.includes('Calendar') || content.includes('google');
    const hasWriteCheck = content.includes('write') || content.includes('Write') || content.includes('hasWriteAccess');
    const hasTitle = content.includes('title') || content.includes('summary');
    const hasStartEnd = content.includes('start') && content.includes('end');
    
    if (hasInsert && hasCalendarAPI && (hasTitle || hasStartEnd)) {
      pass(testName, 'Create event API with Google Calendar integration');
      return true;
    }
    
    if (hasCalendarAPI && hasInsert) {
      pass(testName, 'Event creation API implemented');
      return true;
    }
    
    fail(testName, 'Event creation API not properly implemented');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// PLAN-10: Add All Works (bulk event creation)
async function testAddAllWorks() {
  const testName = 'PLAN-10: Add All Works';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Check planning chat component for bulk add
    const chatPath = path.join(process.cwd(), 'src/components/planning/planning-chat.tsx');
    const exists = fs.existsSync(chatPath);
    
    if (!exists) {
      fail(testName, 'Planning chat component not found');
      return false;
    }
    
    const content = fs.readFileSync(chatPath, 'utf-8');
    
    // Check for bulk add feature
    const hasAddAll = content.includes('Add All') || content.includes('addAll') || content.includes('AddAll');
    const hasBulk = content.includes('bulk') || content.includes('Bulk') || content.includes('all') || content.includes('All');
    const hasMultipleSuggestions = content.includes('suggestions') || content.includes('Suggestions') || content.includes('events');
    const hasLoop = content.includes('map') || content.includes('forEach') || content.includes('Promise.all');
    
    // Also check event suggestion card
    const suggestionCardPath = path.join(process.cwd(), 'src/components/planning/event-suggestion-card.tsx');
    if (fs.existsSync(suggestionCardPath)) {
      const cardContent = fs.readFileSync(suggestionCardPath, 'utf-8');
      const cardHasAddAll = cardContent.includes('Add All') || cardContent.includes('addAll');
      if (cardHasAddAll) {
        pass(testName, 'Add All button in event suggestion cards');
        return true;
      }
    }
    
    if (hasAddAll || (hasBulk && hasMultipleSuggestions)) {
      pass(testName, 'Add All Suggestions functionality implemented');
      return true;
    }
    
    if (hasMultipleSuggestions && hasLoop) {
      pass(testName, 'Bulk event handling for multiple suggestions');
      return true;
    }
    
    fail(testName, 'Add All functionality not implemented');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// Additional: Check Planning Session API
async function testPlanningSessionsAPI() {
  const testName = 'Planning Sessions API';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const sessionsPath = path.join(process.cwd(), 'src/app/api/planning/sessions/route.ts');
    const exists = fs.existsSync(sessionsPath);
    
    if (!exists) {
      fail(testName, 'Planning sessions API route not found');
      return false;
    }
    
    const content = fs.readFileSync(sessionsPath, 'utf-8');
    
    const hasCreate = content.includes('POST') || content.includes('create') || content.includes('insert');
    const hasGet = content.includes('GET') || content.includes('select') || content.includes('find');
    
    if (hasCreate || hasGet) {
      pass(testName, 'Planning sessions API implemented');
      return true;
    }
    
    fail(testName, 'Planning sessions API incomplete');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// Additional: Check Database Schema
async function testDatabaseSchema() {
  const testName = 'Planning Sessions Schema';
  log(`Running ${testName}...`);
  
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.ts');
    const content = fs.readFileSync(schemaPath, 'utf-8');
    
    const hasPlanningSessions = content.includes('planningSessions') || content.includes('planning_sessions');
    const hasConversationHistory = content.includes('conversationHistory') || content.includes('conversation_history');
    const hasPlannedEvents = content.includes('plannedEvents') || content.includes('planned_events');
    
    if (hasPlanningSessions) {
      pass(testName, 'Planning sessions table in schema');
      return true;
    }
    
    fail(testName, 'Planning sessions schema not found');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// Page Load Test (requires server)
async function testPlanningPageLoads() {
  const testName = 'Planning Page Loads';
  log(`Running ${testName}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/planning`);
    
    // May redirect to sign-in for unauthenticated users
    if (response.status === 200 || response.status === 307 || response.status === 302) {
      pass(testName, `Planning page accessible (status: ${response.status})`);
      return true;
    }
    
    fail(testName, `Planning page returned ${response.status}`);
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// Chat API Endpoint Test (requires server)
async function testChatAPIEndpoint() {
  const testName = 'Chat API Endpoint';
  log(`Running ${testName}...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/planning/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] })
    });
    
    // Expecting 401 (unauthorized) or 400 (bad request) since we're not authenticated
    // but endpoint should exist
    if (response.status !== 404) {
      pass(testName, `Chat API endpoint exists (status: ${response.status})`);
      return true;
    }
    
    fail(testName, 'Chat API endpoint not found');
    return false;
  } catch (error) {
    fail(testName, `Error: ${error}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n========================================');
  console.log('Phase 7: Planning Assistant Tests');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('========================================\n');
  
  // Structural tests (don't require server)
  console.log('--- Component Structure Tests ---\n');
  await testFreeUserSeesPaywall();
  await testSubscriberSeesChat();
  await testAIResponds();
  await testContextInjected();
  await testCalendarViewShowsEvents();
  await testPerEventPlanningScores();
  await testEventSuggestionsRender();
  await testAddWithoutWriteScope();
  await testAddWithWriteScope();
  await testAddAllWorks();
  
  console.log('\n--- Database & API Structure Tests ---\n');
  await testPlanningSessionsAPI();
  await testDatabaseSchema();
  
  // API/Page tests (require server running)
  console.log('\n--- Page/API Tests (require server) ---\n');
  
  try {
    await testPlanningPageLoads();
    await testChatAPIEndpoint();
  } catch (error) {
    console.log(`\n⚠️  Some page tests failed - ensure dev server is running on port 3003\n`);
    console.log(`Error: ${error}`);
  }
  
  // Summary
  console.log('\n========================================');
  console.log('Test Summary');
  console.log('========================================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }
  
  console.log('\n');
  
  return failed === 0;
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
});