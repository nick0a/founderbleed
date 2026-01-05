# Founder Bleed

A web app that helps founders reclaim time by analyzing their calendar, classifying work by delegation tier, and generating hiring recommendations.

## Tech Stack
- Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Drizzle ORM with PostgreSQL (Neon)
- NextAuth.js v5 with Google OAuth
- Stripe for payments
- next-themes for dark/light mode

## Core Concepts
- 5-Tier Model: Unique, Founder, Senior, Junior, EA
- Core Loop: TRIAGE → DELEGATE → PLAN
- Solo founders see only 4 tiers (Founder hidden)
- Planning Score displayed as percentage

## Current Phase
Phase 0: Setup (complete)

## Key Files
- See .claude/rules/ for detailed specifications
- `/src/lib/db/schema.ts` - Database schema
- `/src/lib/auth.ts` - Authentication configuration
- `/src/lib/encryption.ts` - AES-256 encryption utilities

## Core Product Loop
1. **TRIAGE** - Users audit their calendar to classify time spent
2. **DELEGATE** - Get hiring recommendations based on tier analysis
3. **PLAN** - Use AI assistant to better plan calendar hygiene

## Hero Metric
Display as: **"{Username}, You're Losing $X Every Year..."**

## Algorithm Version
All audit runs tagged with `algorithm_version: '1.7'`
