# Milestone 2 API demo

## Prepare

1. In `StableFlow`, run `npm run seed` if demo data is not already loaded. Use `manager@stableflow.demo` and enter the manager password shown in your screenshot into Postman's local environment. If your local seed data has a different manager password, use the password printed when that account was created. Save the staff credentials too; passwords print only when accounts are first created.
2. Start the backend with `npm run dev --workspace server` (or start the whole app with `npm run dev`).
3. Open the StableFlow Postman requests and select the **StableFlow Local Demo** environment (`postman/StableFlow Local Demo.environment.yaml`). You can also create requests manually using the full URLs and bodies in `docs/Postman-Evaluation-Cheat-Sheet.md`.
4. Set `managerPassword` to the manager password shown in your screenshot, set `staffPassword` to the password printed for the seeded staff account, and set `demoDate` to today's local date in `YYYY-MM-DD` format. Keep these passwords in your local Postman environment.

## Exact login request from the evaluation screenshot

In Postman, set the method to `POST` and enter this full URL:

```text
http://localhost:5000/api/auth/login
```

Select **Body → raw → JSON** and paste:

```json
{
  "email": "manager@stableflow.demo",
  "password": "{{managerPassword}}"
}
```

Expected result: `200 OK`, with a manager user and a bearer token in the response. For the remaining API requests, use the full `http://localhost:5000/api/...` URLs shown in `docs/Postman-Evaluation-Cheat-Sheet.md`; send the token as `Authorization: Bearer <token>` where required.

## Demonstration order

1. Run the health request and manager login.
2. Run the three **Find seeded...** requests. They save the seeded horse, staff, and occupied stall IDs. Create a uniquely named horse, then create a fresh feeding routine and veterinary appointment for that horse; the requests save their IDs too.
3. Log in as staff and view the daily schedule. Complete the fresh feeding routine and verify its service-history record.
4. Run the conflict requests. The overlapping stall assignment and appointment should return HTTP 409. The collection creates uniquely named demo records so it can be run again without colliding with records from an earlier run.
5. Complete this run's unassigned veterinary appointment as manager. Staff assignment and role based completion are demonstrated by the feeding routine.

The collection deliberately uses environment variables rather than storing passwords in the exported file. The seeded account passwords belong to the local data store; do not commit them. The health request sets a run ID so each execution can create unique demo records.

## Architecture talking points

Requests go through Express routes to thin controllers, then services for validation and business rules, then repositories for persistence. The same API works with MongoDB when `MONGODB_URI` is configured or the local JSON repository when it is not.
