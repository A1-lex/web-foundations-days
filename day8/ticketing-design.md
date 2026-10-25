# TicketHub Design

TicketHub sells tickets for concerts and events. Its hard problem is the "big sale": a popular concert goes on sale and thousands of people try to buy the same few seats at once.

## 1. Requirements

Functional: browse and search events, view a seat map, hold seats for 5 minutes, pay for them, and view my tickets.

Non-functional:
- Correctness: a seat is never sold twice. This matters more than speed.
- Fairness: in a big sale, buyers are served in the order they arrive.
- Speed: browsing loads in under 300 ms and a seat hold answers in under 1 second.
- Reliability: 99.9% availability during the sale, and a paid order is never lost.

## 2. Estimates

Assumptions: 86,400 seconds a day, a normal-day peak of 5 times the average, and in the big sale each of the 200,000 people views 10 pages and tries for seats once within 600 seconds.

| | Normal day | Big sale |
|---|---|---|
| Page views per second | 50,000 x 10 / 86,400 = about 6 (30 at peak) | 200,000 x 10 / 600 = about 3,300 |
| Seat attempts per second | 5,000 / 86,400 = about 0.06 (0.3 at peak) | 200,000 / 600 = about 330 |

The big sale has about 550 times the reads and 5,500 times the seat attempts, and 90% of attempts must fail because only 20,000 seats exist. A normal day fits on one server and one database, so the big sale is the real design problem.

## 3. API

| Method | Path | Description | Success |
|---|---|---|---|
| GET | `/events?q=rock&page=1` | Search and list events. | 200 |
| GET | `/events/{id}/seats` | Seat map with each seat's status. | 200 |
| POST | `/events/{id}/holds` | Hold seats for 5 minutes. | 201 |
| DELETE | `/events/{id}/holds` | Release my held seats. | 204 |
| POST | `/orders` | Pay for my held seats. | 201 |
| GET | `/orders` | List my orders and tickets. | 200 |

Example: `POST /events/5/holds` with `{ "seatIds": [12, 13] }` returns 409 with `{ "error": "Seat 13 is no longer available." }` if seat 13 was just taken. Other errors: 400 bad input, 401 not logged in, 404 unknown event, 429 too many requests.

## 4. Data model

```sql
CREATE TABLE users (
  id    INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);

CREATE TABLE events (
  id        INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  venue     TEXT NOT NULL,
  starts_at TEXT NOT NULL
);

CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  total_cents INTEGER NOT NULL,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE seats (
  id          INTEGER PRIMARY KEY,
  event_id    INTEGER NOT NULL REFERENCES events (id),
  label       TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'available'
              CHECK (status IN ('available', 'held', 'sold')),
  held_by     INTEGER REFERENCES users (id),
  held_until  TEXT,
  order_id    INTEGER REFERENCES orders (id),
  UNIQUE (event_id, label)
);
```

One user has many orders, one event has many seats, and one order contains many seats. Each seat belongs to at most one order.

## 5. How double booking is prevented

Two people click the same seat at the same moment. The database decides, not the app.

1. **Hold with one atomic update.**

```sql
UPDATE seats
SET status = 'held', held_by = 7, held_until = datetime('now', '+5 minutes')
WHERE id = 13
  AND (status = 'available' OR (status = 'held' AND held_until < datetime('now')));
```

The check and the change happen in one statement, and the database changes one row at a time, so only one of two simultaneous updates can match. The winner sees 1 row changed. The loser sees 0 and gets a 409.

2. **Pay in one transaction.**

```sql
BEGIN;
INSERT INTO orders (user_id, total_cents) VALUES (7, 15000);
UPDATE seats SET status = 'sold', order_id = 55, held_until = NULL
WHERE id IN (12, 13) AND status = 'held' AND held_by = 7 AND held_until > datetime('now');
COMMIT;
```

The card is charged just before COMMIT. If fewer rows changed than seats ordered (a hold expired and someone else took the seat), the app runs ROLLBACK, so nothing is sold and the charge is cancelled.

3. **Two more safeguards.** The seat map comes from a cache and may be stale, so a user can click a gone seat and get a 409, but correctness never depends on the cache. A worker also frees expired holds every minute.

## 6. Architecture

```
Client
  |
  +---> CDN (pages, images, CSS, JS)
  |
Waiting room (lets in a fixed number of buyers)
  |
Load balancer
  |          |          |
App 1      App 2      App 3
  |  \         |
  |   +--> Cache (event list, seat map)
  |              |
  |         DB read replica <--copies-- DB primary
  |                                        ^
  +---- holds and orders (writes) ---------+
  |
  +--> Queue --> Worker (emails, expired holds)
  |
  +--> Payment provider
```

- **Client:** the browser or phone app where people browse and buy.
- **CDN:** serves pages and images from servers near the user, so most browsing never reaches us.
- **Waiting room:** lets buyers in first come, first served, a fixed number at a time, so the database never sees all 200,000 at once.
- **Load balancer:** spreads requests across the app servers and skips any that are down.
- **App servers:** run the API and keep no state, so we add more before a sale.
- **Cache:** keeps the event list and seat map in memory, so most of the 3,300 reads a second skip the database.
- **DB primary:** the one place that decides who gets each seat and takes all writes.
- **Read replica:** a live copy that serves reads and can replace the primary if it fails.
- **Queue and worker:** do slow jobs such as emails and freeing expired holds, so requests finish quickly.
- **Payment provider:** an outside service that charges cards, so we never store card numbers.

**Surviving the big sale:** the sale time is known, so we add app servers beforehand. The CDN and cache absorb the reads, the waiting room turns a spike into a steady flow (for example 2,000 buyers inside at a time), and only hold and order writes reach the primary.

**No single point of failure:** several app servers, a pair of load balancers, a replica ready to be promoted, and a cache that falls back to the database.

## 7. Trade-offs

- **Waiting room:** it protects the system and keeps the sale fair, but some people wait. Without it the site would likely fail for everyone.
- **One primary for seat writes:** one place deciding keeps correctness simple, but it is a bottleneck and a single point of failure. The waiting room limits its load and a replica can take over.
- **Cached seat map:** fast, but a seat can look free for a few seconds after it is taken, so some users get a 409. The database, not the cache, decides.
