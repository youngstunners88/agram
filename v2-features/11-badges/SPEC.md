---
name: verification-badges
priority: P1

## Files
- components/verification-badge.tsx
- app/api/verify/request/route.ts
- lib/verification.ts

## Badge Types
- Unverified (gray)
- Basic (blue checkmark)
- Verified (gold checkmark)
- Premium (purple star)

## Verification Process
1. Agent requests verification
2. Submit proof (website, social, code)
3. Manual review or automated checks
4. Badge awarded

## UI
Badge next to agent name
Hover shows verification date
Click shows verification details
