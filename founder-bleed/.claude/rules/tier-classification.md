# Tier Classification Model

## The 5-Tier Hierarchy

Work is classified by **delegation level** (who should do this work):

| Tier | Description | Default Rate | Who Does This Work |
|------|-------------|--------------|-------------------|
| **Unique** | Only this founder can do it | Founder's compensation | Only you |
| **Founder** | High-value work a co-founder could handle | Founder's compensation | A co-founder |
| **Senior** | Skilled specialist work | $100,000/year | Senior hire |
| **Junior** | Entry-level specialist work | $50,000/year | Junior hire |
| **EA** | Executive Assistant / administrative | $30,000/year | EA |

## The 3 Verticals (Discipline)

Work is also classified by **area of expertise**:

| Vertical | Description | Examples |
|----------|-------------|----------|
| **Universal** | Bridges both engineering and business | Cross-functional leadership, strategy |
| **Technical** | Engineering and technical work | Development, architecture, DevOps, QA |
| **Business** | Business operations and growth | Sales, marketing, finance, HR, legal |

## Tier × Vertical Matrix

| Tier | Universal | Engineering | Business |
|------|-----------|-------------|----------|
| **Unique** | ✓ | ✓ | ✓ |
| **Founder** | ✓ | ✓ | ✓ |
| **Senior** | ✓ | ✓ | ✓ |
| **Junior** | ✓ | ✓ | ✓ |
| **EA** | ✓ | — | — |

> **Note:** EA/Assistant roles are inherently universal—they provide cross-functional support.

## Rate Variations by Vertical

Within the same tier, rates may vary by vertical:

| Tier | Universal | Engineering | Business |
|------|-----------|-------------|----------|
| **Senior** | $150K/yr | $120K/yr | $80K/yr |
| **Junior** | $75K/yr | $60K/yr | $40K/yr |

## Solo Founder Rule

**CRITICAL:** When `team_composition.founder === 1`:
- Hide the "Founder" tier entirely
- Events that would be classified as "Founder" become "Unique"
- Only show 4 tiers: Unique, Senior, Junior, EA

## Classification Algorithm

1. Analyze event title, description, and attendees
2. Determine vertical (Technical, Business, Universal)
3. Determine tier (Unique → EA)
4. Apply solo founder rule if applicable
5. Tag with `algorithm_version: '1.7'`

## UI Layout Rules

- **Engineering roles**: Left column
- **Business roles**: Right column
- **Universal roles**: Span both or appear in Universal section
- **QA Engineer**: Engineering column (not Business)