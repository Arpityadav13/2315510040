# Notification System Design

## Stage 1

### Overview
A campus notification platform where students receive real-time updates about Placements, Events, and Results.

### REST API Endpoints

#### 1. Get All Notifications for a Student
```
GET /notifications
Authorization: Bearer <token>
```
Response:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "studentId": "string",
      "type": "Placement",
      "message": "You have a placement drive tomorrow",
      "isRead": false,
      "createdAt": "2026-06-10T10:00:00Z"
    }
  ]
}
```

#### 2. Mark Notification as Read
```
PATCH /notifications/:id/read
Authorization: Bearer <token>
```
Response:
```json
{
  "message": "Notification marked as read"
}
```

#### 3. Create a New Notification (Admin)
```
POST /notifications
Authorization: Bearer <token>
```
Body:
```json
{
  "studentId": "2315510040",
  "type": "Placement",
  "message": "TCS is visiting campus on Friday"
}
```

#### 4. Notify All Students
```
POST /notifications/notify-all
Authorization: Bearer <token>
```
Body:
```json
{
  "type": "Event",
  "message": "Tech Fest starts tomorrow!"
}
```

### Notification Types
- **Placement** - Job/internship related
- **Result** - Exam results
- **Event** - College events

### Real-time Notifications
Use **WebSockets (Socket.IO)**:
- Each student joins a room with their studentId
- When a notification is created, server emits it to that student's room instantly
- No need to refresh the page

### Notification JSON Schema
```json
{
  "id": "uuid - unique identifier",
  "studentId": "string - which student",
  "type": "enum - Placement / Result / Event",
  "message": "string - notification text",
  "isRead": "boolean - read or unread",
  "createdAt": "timestamp - when created"
}
```

---

## Stage 2

### Which Database to Use?

**Choice: PostgreSQL (Relational Database)**

**Why PostgreSQL?**
- Notifications have a fixed structure (id, studentId, type, message, isRead)
- We need to query by studentId and filter by isRead — SQL handles this perfectly
- ACID compliance ensures no notification is lost
- Easy to add indexes for fast queries

### Database Schema

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studentId   VARCHAR(50) NOT NULL,
  type        VARCHAR(20) CHECK (type IN ('Placement', 'Result', 'Event')) NOT NULL,
  message     TEXT NOT NULL,
  isRead      BOOLEAN DEFAULT false,
  createdAt   TIMESTAMP DEFAULT NOW()
);

-- Index to speed up queries per student
CREATE INDEX idx_student_id ON notifications(studentId);

-- Index for unread notifications
CREATE INDEX idx_isread ON notifications(isRead);
```

### Problems as Data Grows

| Problem | Solution |
|---------|----------|
| Table has millions of rows → slow queries | Add pagination (fetch 20 at a time) |
| Old notifications take space | Archive notifications older than 6 months |
| Too many reads on one DB | Add read replicas |

---

## Stage 3

### The Slow Query

```sql
SELECT * FROM notifications
WHERE studentID = 1842 AND isRead = false
ORDER BY createdAt DESC;
```

**Why is it slow?**
- No index exists on studentID + isRead + createdAt
- So the database scans ALL 5,000,000 rows one by one
- This is called a **Full Table Scan** — very slow

**Fix: Add a Composite Index**
```sql
CREATE INDEX idx_student_unread ON notifications(studentId, isRead, createdAt DESC);
```

Now the DB jumps directly to student 1842's unread notifications — very fast.

### Should We Add Indexes on EVERY Column?

**No. Here's why:**

- Every time a new notification is inserted or updated, ALL indexes must be updated too
- 10 indexes = 10 extra writes on every INSERT
- More indexes = more storage used
- The query optimizer can get confused with too many indexes

**Correct approach:** Only add indexes on columns that are actually used in WHERE, ORDER BY, or JOIN clauses.

---

## Stage 4

### Problem: DB is Fetched on Every Page Load

When 50,000 students open the notification page at the same time, the DB gets 50,000 queries simultaneously. This causes slowness and crashes.

### Solutions

#### Solution 1: Caching with Redis
- Store each student's notifications in Redis (fast in-memory storage) for 60 seconds
- When student opens the page → check Redis first → if found, return instantly (no DB hit)
- When new notification arrives → clear that student's cache so they get fresh data
- **Tradeoff:** Notifications might be up to 60 seconds stale

#### Solution 2: Pagination
- Don't load ALL notifications at once
- Load only 10-20 at a time, load more when user scrolls down
- **Tradeoff:** Requires frontend changes, but much lighter DB queries

#### Solution 3: Read Replicas
- The main DB handles writes (new notifications)
- Separate replica DBs handle reads (fetching notifications)
- **Tradeoff:** Small delay between main and replica, costs more

### Best Strategy
Combine **Redis caching + Pagination** for best performance with minimal infrastructure cost.

---

## Stage 5

### Current Implementation (Pseudocode)

```
function notify_all(student_ids, message):
  for student_id in student_ids:
    send_email(student_id, message)    # calls Email API
    save_to_db(student_id, message)    # DB insert
    push_to_app(student_id, message)
```

### What's Wrong?

1. **If email fails at student 200** → loop crashes → remaining 49,800 students get nothing
2. **Loop runs for 50,000 students one by one** → takes hours, blocks the server
3. **No retry** → if email API is down temporarily, notification is lost forever
4. **DB save and email are coupled** → if DB is slow, email also waits

### Improved Design

```
function notify_all(student_ids, message):

  # Step 1: Save ALL notifications to DB first (bulk insert - fast)
  bulk_insert_db(student_ids, message)

  # Step 2: Push each job to a Message Queue (async - non-blocking)
  for student_id in student_ids:
    queue.push({ student_id, message, type: "email" })
    queue.push({ student_id, message, type: "push" })

# Separate worker processes the queue in background
function worker():
  job = queue.pop()
  try:
    if job.type == "email":
      send_email(job.student_id, job.message)
    if job.type == "push":
      push_to_app(job.student_id, job.message)
  catch error:
    queue.retry(job, max_attempts=3)  # retry up to 3 times
```

### Why This is Better

- DB is saved first → notifications are never lost even if email fails
- Queue processes jobs in parallel → much faster than one-by-one loop
- Failed emails are retried automatically up to 3 times
- Server is not blocked → other users can still use the app

---

## Stage 6

### Priority Inbox

Display top N unread notifications based on **type weight + recency**.

### Priority Weights
| Type | Weight |
|------|--------|
| Placement | 20 |
| Result | 15 |
| Event | 10 |

### Priority Score Formula
```
score = typeWeight + recencyScore
recencyScore = max(0, 100 - ageInHours)
```

Newer notifications get a higher recency score, older ones get lower.

### Implementation (TypeScript)

```typescript
interface Notification {
  id: string;
  type: "Placement" | "Result" | "Event";
  message: string;
  isRead: boolean;
  createdAt: string;
}

const weights: Record<string, number> = {
  Placement: 20,
  Result: 15,
  Event: 10,
};

function getPriorityScore(notification: Notification): number {
  const ageInHours =
    (Date.now() - new Date(notification.createdAt).getTime()) / 3600000;
  const recencyScore = Math.max(0, 100 - ageInHours);
  return weights[notification.type] + recencyScore;
}

function getTopN(notifications: Notification[], n: number): Notification[] {
  return notifications
    .filter((n) => !n.isRead)
    .map((n) => ({ ...n, score: getPriorityScore(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

// Usage: get top 10 priority notifications
const topNotifications = getTopN(allNotifications, 10);
```

### How to Handle New Notifications Arriving

- When a new notification arrives, add it to the list and re-sort
- For large scale: use a **Max-Heap** data structure so inserting a new notification is O(log n) instead of O(n log n) for full re-sort
- Store the heap in **Redis** so it works across multiple server instances

### Screenshots
Screenshots of output are pushed to this repository in the `notification_app_be` folder.
