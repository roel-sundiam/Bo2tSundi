# 📊 Analytics Dashboard for Multiple Apps (Angular + Netlify Functions)

## 🎯 Objective
Build a centralized analytics system that tracks and displays **visits (page views)** and **user logins** across multiple applications. The system should be lightweight, scalable, and deployed using Netlify (frontend + serverless functions).

---

## 🧱 Tech Stack
- Frontend: Angular (latest version)
- Backend: Netlify Functions (serverless)
- Database: MongoDB Atlas
- Deployment: Netlify

---

## 📌 Functional Requirements

### 1. Event Tracking (Across All Apps)
Each app should send tracking data to a centralized endpoint.

#### Events to Track:
- `page_view`
- `login`

#### Event Payload Structure:
```json
{
  "event": "page_view | login",
  "appId": "string (e.g. tennis-app)",
  "userId": "string (optional for page_view, required for login)",
  "page": "string (for page_view)",
  "timestamp": "ISO string"
}
```

---

### 2. Netlify Function (Tracking API)

Create a Netlify function:

```
/netlify/functions/track
```

#### Responsibilities:
- Accept POST requests
- Parse event payload
- Store in MongoDB Atlas (`events` collection)
- Return fast response (non-blocking)

---

### 3. Angular Analytics Dashboard App

Build a separate Angular app that displays analytics.

#### Pages / Components:

##### Dashboard Overview
- Total visits (today)
- Total logins (today)
- Visits per app
- Logins per app

##### Visits Page
- Table of page views
- Columns: App, Page, Timestamp

##### Logins Page
- Table of logins
- Columns: User, App, Timestamp

---

### 4. Data Fetching API (Netlify Functions)

Create additional functions:

```
/netlify/functions/getVisits
/netlify/functions/getLogins
```

#### Responsibilities:
- Query MongoDB
- Filter by event type
- Return aggregated or raw data

---

### 5. Frontend Analytics Service (Angular)

Create a reusable service:

```ts
trackEvent(event: any): void
```

- Use `navigator.sendBeacon()` for sending events
- Ensure non-blocking behavior
- Handle failures silently

---

### 6. Integration with Existing Apps

In each Angular app:
- Call `trackEvent()` on:
  - Page load / route change → `page_view`
  - Successful login → `login`

---

### 7. Polling (Near Real-Time Updates)

Since Netlify does not support WebSockets:
- Implement polling every 5–10 seconds in dashboard
- Refresh visits and login data automatically

---

## ⚙️ Non-Functional Requirements

- Do NOT block user actions while tracking
- Keep API responses fast (<200ms)
- Ensure system works even if tracking fails
- Use clean and modular Angular structure
- Mobile-friendly UI

---

## 📦 Suggested Folder Structure

### Angular
```
/analytics-app
  /dashboard
  /visits
  /logins
  /services
```

### Netlify Functions
```
/netlify/functions
  track.js
  getVisits.js
  getLogins.js
```

---

## 🚀 Future Enhancements (Optional)
- Add reservation tracking
- Add charts (daily/weekly trends)
- Add user activity insights
- Upgrade to real-time using WebSockets (if backend changes)

---

## ✅ Expected Outcome
- A working Angular dashboard showing:
  - Visits
  - Logins
- Centralized tracking across multiple apps
- Fully deployed on Netlify with MongoDB integration

