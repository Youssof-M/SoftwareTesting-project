# StableFlow Milestone 2 implementation notes

## Beta features

- Horse profiles with identification, owner, dietary, medical, and care details; search by name or stable ID.
- Recurring feeding and care routines, including assigned staff and a daily staff work list.
- Veterinary, training, and other appointment scheduling with one-hour overlap checks for horse, staff member, and facility.
- Stall records and date-range assignments; overlapping occupancy of the same stall is rejected.
- Staff and resource records, appointment completion, daily care completion, and horse service history.
- Clear API validation and conflict messages, persistent records, and a responsive React interface.
- Manager and staff accounts, hashed passwords, role-protected management routes, and assigned-work completion access.

## Architecture and code evidence

The client calls REST routes. Controllers translate HTTP requests, services enforce validation and workflow rules, repositories isolate persistence, and Mongoose models define the MongoDB records. If `MONGODB_URI` is not set, a file repository persists demo records under `server/data` so the beta can run without installing MongoDB.

The repository pattern is visible in `server/repositories`; each repository exposes the record operations used by the business services. The controller and service split keeps HTTP concerns separate from validation and scheduling rules. The client uses declarative `map`/`filter` rendering; the services use imperative branching to validate inputs and reject overlapping bookings.

## Demonstration steps

1. Add a horse and a staff member.
2. Add a stall and assign the horse for a date range.
3. Create a daily feeding routine assigned to that staff member.
4. Open **Staff & history** and complete the routine; confirm a service-history record appears.
5. Schedule a veterinary or training visit and mark it complete; confirm another history record appears.
6. Try overlapping appointments or stall occupancy and confirm the API rejects them with a clear message.

## Verification performed

- `npm install` completed with 0 reported vulnerabilities.
- `npm run build` completed successfully.
- Node syntax checks passed for the server entry point and all server layers.
- `npm test` passes all four requirement checks. The API workflow covers manager setup, horse create/update/view, staff accounts, stalls and overlapping occupancy, care routines, appointments and overlap rejection, role permissions, service history, and persistence after an API restart.
- Client checks cover name/ID search and staff daily schedule behavior, including completed-care filtering and the 10-second response target.

## Milestone 2 handoff checklist

- [x] Beta builds without syntax errors (`npm run build` and server `node --check`).
- [x] Connected end-to-end care scenario works and is covered by `npm test`.
- [x] Layered architecture is reflected in routes, controllers, services, repositories, and models.
- [x] Declarative rendering and imperative validation/scheduling logic are both present and documented.
- [ ] On the evaluator's laptop, run `npm install` and `npm run dev`, create the first manager account, and repeat the walkthrough.
- [ ] If the team chooses MongoDB for the demo, configure `MONGODB_URI` and verify the MongoDB-backed run on that laptop. The automated API workflow uses isolated local file storage.
- [ ] Submit the code and milestone notes through the course Google Form; keep `.env` secrets out of the submission.

## Remaining course work

- The Milestone 3 brief additionally asks for TDD evidence and at least two justified design patterns for final delivery. The Repository pattern is documented; prepare the second pattern and TDD evidence for M3.
