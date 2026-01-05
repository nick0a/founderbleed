// Business Area Keywords (case-insensitive, partial match)
export const BUSINESS_AREA_KEYWORDS: Record<string, string[]> = {
  'Strategy/Vision': ['strategy', 'vision', 'roadmap', 'planning', 'OKR', 'goals', 'priorities', 'direction', 'mission'],
  'Fundraising': ['investor', 'pitch', 'fundraising', 'due diligence', 'term sheet', 'cap table', 'board', 'VC', 'deck'],
  'Executive Hiring': ['executive', 'C-level', 'VP', 'director', 'leadership', 'senior hire', 'founder'],
  'Key Relationships': ['partner CEO', 'investor meeting', 'board member', 'advisor', 'mentor'],
  'Product': ['roadmap', 'feature', 'user story', 'sprint', 'backlog', 'requirements', 'PRD', 'spec', 'prioritization'],
  'Design': ['figma', 'design', 'UI', 'UX', 'mockup', 'wireframe', 'prototype', 'user research', 'usability'],
  'Development': ['code', 'bug', 'feature', 'PR', 'git', 'deploy', 'testing', 'QA', 'technical', 'programming', 'architecture'],
  'Sales': ['sales', 'pitch', 'proposal', 'deal', 'prospect', 'lead', 'demo', 'closing', 'pipeline', 'outreach', 'CRM'],
  'Marketing': ['content', 'blog', 'social', 'campaign', 'SEO', 'ads', 'brand', 'copywriting', 'newsletter', 'launch'],
  'Customer Success': ['support', 'customer', 'ticket', 'onboarding', 'retention', 'churn', 'feedback', 'NPS', 'renewal'],
  'Partnerships': ['partnership', 'integration', 'API', 'channel', 'reseller', 'affiliate', 'co-marketing', 'BD'],
  'Data/Analytics': ['dashboard', 'metrics', 'KPI', 'analytics', 'reporting', 'data', 'SQL', 'tableau', 'amplitude'],
  'Finance': ['invoice', 'expense', 'payroll', 'accounting', 'budget', 'billing', 'taxes', 'xero', 'quickbooks'],
  'Legal/Admin': ['contract', 'NDA', 'terms', 'compliance', 'agreement', 'legal', 'policy', 'documentation'],
  'Recruiting Ops': ['resume', 'sourcing', 'scheduling interview', 'applicant', 'ATS', 'job posting', 'screening'],
  'Operations': ['scheduling', 'admin', 'travel', 'calendar', 'logistics', 'office', 'supplies', 'errands', 'facilities'],
  'Community': ['discord', 'slack community', 'forum', 'documentation', 'tutorial', 'FAQ', 'help center']
};

// Tier Keywords
export const TIER_KEYWORDS: Record<string, string[]> = {
  unique: ['board', 'investor', 'fundraise', 'strategic', 'vision', 'deep work', 'architecture', 'strategy'],
  founder: ['leadership', 'executive', 'strategy', 'hiring senior', 'partner CEO', 'advisor'],
  senior: ['architecture', 'technical review', 'project planning', 'client meeting', 'code review'],
  junior: ['code review', 'bug fix', 'documentation', 'testing', 'QA'],
  ea: ['scheduling', 'travel', 'expenses', 'admin', 'calendar', 'invoice', 'payroll', 'receipts']
};

// Vertical Classification (Senior/Junior only)
export const ENGINEERING_AREAS = ['Development', 'Design', 'Data/Analytics'];
// All other areas = Business

export type Tier = 'unique' | 'founder' | 'senior' | 'junior' | 'ea';
export type Confidence = 'high' | 'medium' | 'low';
export type Vertical = 'engineering' | 'business' | 'universal';
export type EventCategory = 'work' | 'leisure' | 'exercise' | 'travel';

// Event Category Keywords - patterns that indicate non-work events
export const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  travel: [
    'flight', 'qf ', 'va ', 'jq ', 'sq ', 'qr ', 'ek ', 'aa ', 'ua ', 'dl ',
    'hotel', 'stay at', 'airbnb', 'accommodation', 'check-in', 'check-out',
    'airport', 'terminal', 'boarding', 'layover', 'transit',
    'ibis', 'hilton', 'marriott', 'hyatt', 'sheraton', 'novotel', 'mercure',
    'booking.com', 'expedia', 'agoda', 'hotels.com'
  ],
  leisure: [
    'dinner', 'lunch', 'breakfast', 'brunch', 'restaurant', 'cafe', 'coffee',
    'movie', 'cinema', 'concert', 'show', 'theater', 'theatre',
    'party', 'birthday', 'celebration', 'wedding', 'anniversary',
    'vacation', 'holiday', 'personal', 'family', 'friend',
    'reservation at', 'table for', 'booking at',
    'spa', 'massage', 'salon', 'haircut', 'beauty',
    'shopping', 'mall', 'store'
  ],
  exercise: [
    'gym', 'workout', 'training', 'fitness', 'exercise',
    'run', 'running', 'jog', 'jogging', 'walk', 'walking', 'hike', 'hiking',
    'yoga', 'pilates', 'crossfit', 'spin', 'cycling', 'bike', 'swim', 'swimming',
    'tennis', 'golf', 'basketball', 'soccer', 'football', 'sports',
    'peloton', 'orange theory', 'f45', 'equinox', 'anytime fitness'
  ],
  work: [] // Default - everything else is work
};

export interface ClassificationResult {
  suggestedTier: Tier;
  businessArea: string;
  vertical: Vertical;
  confidence: Confidence;
  keywordsMatched: string[];
  eventCategory: EventCategory;
}

export function classifyEvent(
  title: string,
  description: string,
  attendeesCount: number,
  isSoloFounder: boolean
): ClassificationResult {
  const text = `${title} ${description}`.toLowerCase();
  const matchedKeywords: string[] = [];

  // Find business area
  let businessArea = 'Operations'; // default
  for (const [area, keywords] of Object.entries(BUSINESS_AREA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        businessArea = area;
        matchedKeywords.push(keyword);
        break;
      }
    }
    if (matchedKeywords.length > 0) break;
  }

  // Determine vertical (for Senior/Junior)
  const vertical: Vertical = ENGINEERING_AREAS.includes(businessArea) ? 'engineering' : 'business';

  // Determine tier
  let suggestedTier: Tier = 'senior'; // default
  let confidence: Confidence = 'medium';

  // Check tier keywords
  for (const [tier, keywords] of Object.entries(TIER_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        suggestedTier = tier as Tier;
        matchedKeywords.push(keyword);
        break;
      }
    }
  }

  // Heuristics
  if (attendeesCount >= 5) {
    suggestedTier = isSoloFounder ? 'unique' : 'founder';
    confidence = 'low'; // heuristic-based
  }

  // Confidence scoring
  if (matchedKeywords.length >= 3) confidence = 'high';
  else if (matchedKeywords.length >= 1) confidence = 'medium';
  else confidence = 'low';

  // Solo founder adjustment
  if (isSoloFounder && suggestedTier === 'founder') {
    suggestedTier = 'unique';
  }

  // Determine event category (work vs non-work)
  let eventCategory: EventCategory = 'work'; // default
  
  // Check travel keywords first (highest priority for travel-related events)
  for (const keyword of CATEGORY_KEYWORDS.travel) {
    if (text.includes(keyword.toLowerCase())) {
      eventCategory = 'travel';
      break;
    }
  }
  
  // Check exercise keywords
  if (eventCategory === 'work') {
    for (const keyword of CATEGORY_KEYWORDS.exercise) {
      if (text.includes(keyword.toLowerCase())) {
        eventCategory = 'exercise';
        break;
      }
    }
  }
  
  // Check leisure keywords
  if (eventCategory === 'work') {
    for (const keyword of CATEGORY_KEYWORDS.leisure) {
      if (text.includes(keyword.toLowerCase())) {
        eventCategory = 'leisure';
        break;
      }
    }
  }

  return {
    suggestedTier,
    businessArea,
    vertical,
    confidence,
    keywordsMatched: matchedKeywords,
    eventCategory
  };
}