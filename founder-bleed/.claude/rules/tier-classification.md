# Tier Classification Model

The 5-Tier Classification Model is central to the application logic.

## The 5 Tiers

| Tier | Description | Default Rate | Who Does This Work |
|------|-------------|--------------|-------------------|
| **Unique** | Only this founder can do it (strategic vision, key relationships) | Founder's compensation | Only you |
| **Founder** | High-value work a co-founder could handle | Founder's compensation | A co-founder |
| **Senior** | Skilled specialist work (Engineering or Business) | $100,000/year | Senior hire |
| **Junior** | Entry-level specialist work | $50,000/year | Junior hire |
| **EA** | Executive Assistant / administrative | $30,000/year | EA |

## Rules

1. **Solo Founder Rule**: 
   - If team has only 1 founder (`team_composition.founder === 1`), hide "Founder" tier entirely.
   - Events that would normally be classified as "Founder" become "Unique".
   - The UI should never display "Founder" tier in this state.

2. **Classification Logic**:
   - Every calendar event must be classified into one of these tiers.
   - Default classification comes from the Audit Engine (AI).
   - User can override classification manually.

3. **Cost Calculation**:
   - `Delegated Cost` = Σ(Hours per Tier × Tier Rate)
   - `Founder Cost` = (Salary + Equity Value) / 2080 × Hours Worked
