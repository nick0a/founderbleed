# 5-Tier Classification Model

## Tier Definitions

| Tier | Description | Default Hourly Rate | Who Does This Work |
|------|-------------|---------------------|-------------------|
| **Unique** | Only this founder can do it | Founder's rate | Only you |
| **Founder** | High-value work a co-founder could handle | Founder's rate | A co-founder |
| **Senior** | Skilled specialist work | $48.08/hr ($100K/yr) | Senior hire |
| **Junior** | Entry-level specialist work | $24.04/hr ($50K/yr) | Junior hire |
| **EA** | Administrative/executive assistant work | $14.42/hr ($30K/yr) | EA |

## Hourly Rate Calculations

Annual salary ÷ 2080 (standard work hours per year) = Hourly rate

- Founder: (Salary + Equity Value) / 2080
- Senior: $100,000 / 2080 = $48.08
- Junior: $50,000 / 2080 = $24.04
- EA: $30,000 / 2080 = $14.42

## Solo Founder Exception

**CRITICAL:** When `team_composition.founder === 1`:

1. Hide the "Founder" tier completely from UI
2. Events classified as "Founder" become "Unique"
3. Display only 4 tiers: Unique, Senior, Junior, EA
4. Efficiency score calculation adjusts accordingly

## Classification Guidelines

### Unique Work (Only You)
- Strategic vision and company direction
- Key investor/customer relationships
- Decisions requiring full context
- Public representation (podcasts, keynotes)
- Hiring final decisions

### Founder Work (Co-founder Could Do)
- Strategic partnerships
- High-stakes negotiations
- Architecture decisions
- Team leadership
- Board preparation

### Senior Work (Specialist)
- Technical implementation
- Complex problem-solving
- Mentoring junior team
- Process design
- Quality assurance

### Junior Work (Entry-level)
- Routine development tasks
- Documentation
- Testing
- Research and analysis
- Basic customer support

### EA Work (Administrative)
- Calendar management
- Email triage
- Travel booking
- Expense reports
- Meeting coordination

## Metrics Formulas

### Founder Cost
```
founder_cost = (salary + equity_value) / 2080 * hours_worked
```

### Delegated Cost
```
delegated_cost = Σ(tier_hours * tier_rate) for each non-Unique tier
```

### Arbitrage (Potential Savings)
```
arbitrage = founder_cost - delegated_cost
```
This represents money "lost" by founder doing work others could do.

### Efficiency Score
```
efficiency = (unique_hours + founder_hours) / total_hours * 100
```
Higher is better - more time on high-value work.

### Planning Score
```
planning_score = calendar_hygiene_metrics_aggregate
```
0-100, displayed as percentage (e.g., "42%")
