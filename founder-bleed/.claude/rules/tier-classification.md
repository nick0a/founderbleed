# 5-Tier Classification Model

## Tiers
- Unique: Only this founder can do it (strategic vision, key relationships)
- Founder: High-value work a co-founder could handle
- Senior: Skilled specialist work (Engineering or Business)
- Junior: Entry-level specialist work
- EA: Executive Assistant / administrative work

## Default Rates
- Unique: Founder's compensation
- Founder: Founder's compensation
- Senior: $100,000/year
- Junior: $50,000/year
- EA: $30,000/year

## Solo Founder Rule
- When team_composition.founder === 1, hide "Founder" tier
- Events that would be "Founder" become "Unique"
- Visible tiers: Unique, Senior, Junior, EA
