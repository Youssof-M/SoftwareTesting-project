# StableFlow

StableFlow is a horse and stable operations beta built with React, Express, Node.js, and MongoDB. It follows the layered architecture selected in Milestone 1: presentation, HTTP controllers, business services, repositories, and database models.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB running locally or a MongoDB connection URI (optional for the local JSON demo mode)

## Run locally

1. Open a terminal in this folder and run `npm install`.
2. Optionally copy `.env.example` to `.env`; set a private random `AUTH_SECRET` and, if using MongoDB, set `MONGODB_URI`. Without a `MONGODB_URI`, the API uses persistent local JSON files in `server/data`.
3. Optionally run `npm run seed` while the app is stopped to load fictional demo records. On a fresh database it creates a manager and linked staff account, then prints their generated passwords once. Save those credentials; rerunning the seed does not duplicate records or change passwords. If you skip seeding, the app instead guides you through first manager setup.
4. Run `npm run dev` to start the API and React client.
5. Open <http://localhost:5173> and sign in with the seed credentials or create the first manager account. The API health endpoint is <http://localhost:5000/api/health>.

For a production client build, run `npm run build`. Start the API with `npm start`.

Run the complete Jest suite from this folder with `npm test`. Jest runs client service tests, server record and file repository tests, seed tests, and the connected API workflow, including role permissions and persistence across restart. Run `npm test -- --watch` to rerun tests as you edit files.

For the evaluator's API walkthrough, import `postman/StableFlow.postman_collection.json` and follow `docs/M2-API-Demo.md`. Suggested individual questions are in `docs/Team-M2-QA-Prep.md`.

## Beta walkthrough

Create a horse profile, add a staff member with a sign-in, create a stall and assign the horse for a date range, then create a feeding routine assigned to that staff member. Sign in as the staff member and open Staff & history to see assigned work and complete today's routine. The completed service appears in horse history. Managers can schedule veterinary or training visits; the API rejects overlapping bookings for a horse, staff member, or facility and records completed appointments in service history too.

## Code organization

- `client/src`: React presentation and API client.
- `server/controllers`: HTTP request and response handling.
- `server/services`: input validation, scheduling rules, and completion workflow.
- `server/repositories`: MongoDB queries and persistence.
- `server/models`: Mongoose schemas.
- `server/routes` and `server/middleware`: API routing and error responses.

Passwords are hashed with bcrypt, sign-in uses 12-hour bearer tokens, manager-only changes are enforced by API middleware, and staff can complete only their assigned work. The interface uses declarative list rendering. Services use imperative validation and conflict checks. Services and repositories have focused responsibilities to keep database work outside business rules. Set `MONGODB_URI` to use MongoDB; local JSON files preserve demo records across restarts when MongoDB is not configured.

## Milestone 3 follow-up

The course brief separately requires automated unit and end-to-end tests, test-driven development evidence, and at least two justified design patterns for final delivery. Those are not represented as completed by this Milestone 2 beta.
