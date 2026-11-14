# Milestone 2 individual question prep

Use these as practice prompts. Each team member should answer from their own code contribution and be ready to point to a route, service, repository, or UI example.

## Member 1 — Horse management and authorization

1. How does a horse profile move through the layers? Explain the route, controller, service validation, repository, and model.
2. How are manager and staff permissions enforced? Explain password hashing, the bearer token, and one manager-only operation.

## Member 2 — Feeding and care

1. How are recurring routines assigned and displayed on the staff daily schedule?
2. What happens when staff marks a routine complete, and how does the system prevent duplicate service-history entries for the same routine and date?

## Member 3 — Scheduling

1. How does the appointment conflict check detect overlapping time ranges involving the horse, staff member, or facility?
2. Which validation and conflict cases are covered by the API requirement tests?

## Member 4 — Stalls and resources

1. How does the system determine whether a stall is occupied for a date, and how are overlapping assignments rejected?
2. How are resources represented and managed separately from stalls and horses?

## Member 5 — Staff schedule and service history

1. How does the staff schedule endpoint return only the signed-in staff member's assigned work, and how is the 10-second target checked?
2. How does completing a care routine or appointment create a service-history record?

## Questions any member may get

- Where is declarative programming used? Point to React `map`/`filter` rendering and the staff schedule transformation.
- Where is imperative programming used? Point to input validation, role checks, and overlap conflict conditions in the services.
- How does the architecture match Milestone 1? Describe the presentation → route/controller → service → repository → database flow.
- How do you run the beta and its checks? Explain `npm install`, `npm run seed`, `npm test`, and `npm run dev`.
