# StableFlow Postman Evaluation Cheat Sheet

Use this sheet to demonstrate five functional requirements through the API in Postman.

## Before the evaluation

1. Open a terminal in `StableFlow` and run `npm run dev`.
2. Open the StableFlow Postman requests, or create each request manually with the exact full URL and JSON body below. The local environment file is `postman/StableFlow Local Demo.environment.yaml`.
3. Select the **StableFlow Local Demo** environment. Use `manager@stableflow.demo`; enter the manager password shown in your screenshot into the local `managerPassword` environment value. Set the staff password variable to the password printed for the seeded staff account.
4. Set `demoDate` to a date in `YYYY-MM-DD` format.
5. The full API base is `http://localhost:5000/api`. Full request URLs are written below so you can paste them directly into Postman.

For protected endpoints, use **Authorization → Bearer Token** with `{{managerToken}}` or `{{staffToken}}`. The collection saves these tokens when the corresponding login requests succeed. IDs in the examples are Postman environment variables; create/find the records first so the collection can save them.

## Requirement 1: Authentication and role permissions

**Purpose:** Verify the API is available, managers and staff can sign in, and staff cannot perform manager-only changes.

| Action | Method and URL | Expected result |
|---|---|---|
| Health check | `GET http://localhost:5000/api/health` | `200`, status is `ok` |
| Manager sign-in | `POST http://localhost:5000/api/auth/login` | `200`, role is `manager` |
| Staff sign-in | `POST http://localhost:5000/api/auth/login` | `200`, role is `staff` |
| Staff tries a manager-only change | `POST http://localhost:5000/api/horses` with staff Bearer token | `403` |

Manager login request body (copied from the screenshot):

```json
{
  "email": "manager@stableflow.demo",
  "password": "{{managerPassword}}"
}
```

Staff login uses the same URL with this body. Use the staff password printed by `npm run seed` for the current local data:

```json
{
  "email": "alex@stableflow.demo",
  "password": "{{staffPassword}}"
}
```

## Requirement 2: Horse and staff records

**Purpose:** Verify that a manager can view and create horse and staff profiles.

| Action | Method and URL | Expected result |
|---|---|---|
| List horses | `GET http://localhost:5000/api/horses` | `200`, horse list returned |
| Create horse | `POST http://localhost:5000/api/horses` | `201`, new horse returned; save `_id` as `horseId` |
| Update horse | `PUT http://localhost:5000/api/horses/{{horseId}}` | `200`, changed fields returned |
| List staff | `GET http://localhost:5000/api/staff` | `200`, staff list returned |
| Create staff profile | `POST http://localhost:5000/api/staff` | `201`, new staff profile returned |

Create horse body:

```json
{
  "name": "Clover",
  "horseId": "SF-17",
  "dietaryNotes": "Hay twice daily"
}
```

Update horse body:

```json
{ "owner": "Stable Demo" }
```

Create staff body:

```json
{
  "name": "Alex Handler",
  "role": "Stable hand",
  "email": "alex@example.com"
}
```

Use the manager token for these requests.

## Requirement 3: Stall assignment and conflict prevention

**Purpose:** Verify a horse can be assigned to a stall and overlapping occupancy is rejected.

| Action | Method and URL | Expected result |
|---|---|---|
| List stalls | `GET http://localhost:5000/api/stalls` | `200`, stall list returned |
| Create stall | `POST http://localhost:5000/api/stalls` | `201`, save its `_id` as `stallId` |
| Assign horse | `POST http://localhost:5000/api/stallAssignments` | `201` |
| Assign a second horse to the same occupied stall/date range | `POST http://localhost:5000/api/stallAssignments` | `409`, overlap rejected |

Create stall body:

```json
{ "name": "Stall 1", "location": "North wing" }
```

Assignment body:

```json
{
  "stallId": "{{stallId}}",
  "horseId": "{{horseId}}",
  "startDate": "{{demoDate}}"
}
```

For the conflict request, use the same `stallId` and date, but a different horse ID. Use the manager token.

## Requirement 4: Staff routines and daily schedule

**Purpose:** Verify a manager can assign daily care, staff can see their own work, and completion is recorded.

| Action | Method and URL | Expected result |
|---|---|---|
| Create feeding routine | `POST http://localhost:5000/api/routines` | `201`, save `_id` as `routineId` |
| View assigned schedule | `GET http://localhost:5000/api/staff/{{staffId}}/schedule?date={{demoDate}}` | `200`, schedule includes the routine |
| Complete routine | `POST http://localhost:5000/api/routines/{{routineId}}/complete` | `200` |
| Verify service history | `GET http://localhost:5000/api/history` | `200`, completion appears in history |

Create routine body:

```json
{
  "horseId": "{{horseId}}",
  "type": "Feeding",
  "time": "08:00",
  "frequency": "Daily",
  "staffId": "{{staffId}}",
  "active": true
}
```

Completion body:

```json
{ "date": "{{demoDate}}" }
```

Use the manager token to create the routine and verify history. Use the staff token to view the schedule and complete assigned work.

## Requirement 5: Appointments, scheduling conflicts, and history

**Purpose:** Verify a manager can schedule and complete an appointment, and overlapping bookings are rejected.

| Action | Method and URL | Expected result |
|---|---|---|
| Create appointment | `POST http://localhost:5000/api/activities` | `201`, save `_id` as `activityId` |
| Try overlapping booking | `POST http://localhost:5000/api/activities` | `409`, conflict rejected |
| Complete appointment | `POST http://localhost:5000/api/activities/{{activityId}}/complete` | `200`, status is `completed` |
| Verify service history | `GET http://localhost:5000/api/history` | `200`, completed appointment appears |

Create appointment body:

```json
{
  "horseId": "{{horseId}}",
  "type": "Veterinary",
  "date": "{{demoDate}}",
  "time": "10:00",
  "staffId": "{{staffId}}",
  "facility": "Clinic"
}
```

For the conflict request, use the same date and overlap the appointment time, horse, staff member, or facility. Complete the appointment as manager. Use the manager token for these requests.

## Suggested demonstration order

1. Run **API health**, then **Manager login** and **Find seeded horse/staff/stall** from the imported collection.
2. Demonstrate the staff permission rejection in Requirement 1.
3. Create a unique horse, then complete the stall assignment flow in Requirement 3.
4. Create the routine, sign in as staff, view the daily schedule, complete the routine, and verify history in Requirement 4.
5. Create an appointment, demonstrate the overlap rejection, complete it, and verify history in Requirement 5.

The imported collection automates the demo flow and saves IDs/tokens as environment variables. See `docs/M2-API-Demo.md` for collection-specific setup notes.
