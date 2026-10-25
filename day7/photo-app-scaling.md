# SnapShare Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- 10 million registered users
- 10% are active each day, so 1 million daily active users
- Each active user uploads 1 photo per day
- Each active user views 50 feed pages per day
- An average photo is 2 MB, and each photo also gets a 50 KB thumbnail
- Peak traffic is 5 times the average
- 1 day = 86,400 seconds, and 1 year = 365 days
- Storage uses decimal units (1 TB = 1,000,000 MB)

## 2. Estimates

### Daily active users
10,000,000 x 10% = **1,000,000 users per day**

### Uploads per second
- Per day: 1,000,000 users x 1 photo = 1,000,000 uploads
- Average: 1,000,000 / 86,400 = about **12 uploads per second**
- Peak: 12 x 5 = about **60 uploads per second**

### Feed views per second
- Per day: 1,000,000 users x 50 views = 50,000,000 feed views
- Average: 50,000,000 / 86,400 = about **580 feed views per second**
- Peak: 580 x 5 = about **2,900 feed views per second**

### Storage per year
- Per photo: 2 MB + 0.05 MB = 2.05 MB
- Per day: 1,000,000 x 2.05 MB = 2,050,000 MB = about 2.05 TB
- Per year: 2.05 TB x 365 = about **750 TB** (roughly 0.75 PB)
- Of that, originals are about 730 TB and thumbnails about 18 TB

### Upload bandwidth at peak
60 uploads per second x 2 MB = about 120 MB per second coming in.

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are 50 feed views for every 1 upload, a ratio of about 50 to 1.

This shapes the design in three ways:
- Reads must be made cheap, so we use caching and a CDN to answer most requests without touching the database.
- Reads can be spread out, so we add a read replica to share the load.
- Writes are rare and can be slower, so we can move slow work like thumbnails into the background.

## 4. Why photos do not belong in the database

At about 750 TB per year, storing photo files inside the database would cause problems:
- The database would grow huge, which makes backups, restores and replication slow.
- Database storage is much more expensive than object storage.
- Every photo request would use database connections and memory that should serve queries.
- Databases are built for small structured rows, not large binary files.

Photos should go in **object storage**, which is cheap, durable and built for large files, and is easy to put behind a CDN. The database keeps only the **metadata**: photo id, owner, caption, time, and the storage key (the location of the file).

## 5. Trade-offs

- **Cache speed against freshness:** the cache makes feeds fast, but a cached feed can be a few seconds or minutes out of date, so a new photo may not show up immediately. For a photo feed this delay is acceptable. For something like a bank balance it would not be.
- **Replication lag and feed freshness:** the read replica takes load off the primary, but it copies data a moment after the primary, usually milliseconds and sometimes seconds. A user who uploads a photo and refreshes may not see it yet, because the replica has not received the new row. This is eventual consistency. Followers will not notice a photo arriving a few seconds late, so we accept it. For the uploader we read their own recent photos from the primary, so their own upload never seems to vanish.
- **Queue and instant results:** the queue keeps uploads fast, but thumbnails are not ready instantly, so the app must show a "processing" state for a short time. It also adds one more system to run and monitor.
- **CDN cost against speed:** a CDN cuts load time and server load, but it costs money for the traffic it carries, and a changed or deleted photo can stay cached until the cache expires.

## 6. Architecture diagram

```
Users
  |                         +-----+
  |-- photo requests -----> | CDN | --(miss)--> Object storage
  |                         +-----+             (originals + thumbnails)
  |                                                  ^        ^
  |-- API requests (feed, upload)                    |        |
  v                                                  |        |
+---------------+                                    |        |
| Load balancer |                                    |        |
+---------------+                                    |        |
  |       |       |                                  |        |
  v       v       v                                  |        |
+-----+ +-----+ +-----+   save original photo        |        |
| App | | App | | App | -----------------------------+        |
+-----+ +-----+ +-----+                                       |
  |  |    |                                                    |
  |  |    +--> Queue --> Worker (makes thumbnail) -------------+
  |  |                      |
  |  |                      +--> marks photo "ready" in DB primary
  |  |
  |  +--> Cache --(miss)--> DB read replica <--replication-- DB primary
  |
  +--> writes (new photo rows) --> DB primary
```

## 7. Components

- **CDN:** serves photos and thumbnails from servers close to the user, so images load fast and our own servers carry less traffic.
- **Load balancer:** spreads incoming requests across the app servers so no single server is overloaded, and stops sending traffic to servers that are down.
- **App servers:** run the application logic (log in, upload, build the feed), and because they hold no user data themselves, we can add more of them as traffic grows.
- **Cache:** keeps recent feed results and hot data in memory, so most reads skip the database.
- **Database (primary):** stores the metadata for users, photos and follows, and handles all writes.
- **Read replica:** a copy of the primary that handles feed reads, which spreads the heavy read load and keeps the primary free for writes.
- **Object storage:** holds the photo files and thumbnails cheaply and durably at the 750 TB per year scale.
- **Queue:** holds thumbnail jobs, so the upload request can finish quickly and the slow work happens later.
- **Worker:** takes jobs from the queue and creates the 50 KB thumbnails, and we can run more workers if the queue backs up.

## 8. Upload flow

1. The user picks a photo and the app sends it to SnapShare.
2. The load balancer routes the request to an app server.
3. The app server checks that the user is logged in and that the file is a valid image within the size limit.
4. The app server saves the original photo in object storage.
5. The app server writes a metadata row to the database primary, with the storage key and the status "processing".
6. The app server puts a "make thumbnail" message, containing the photo id, on the queue.
7. The app server replies to the user straight away that the upload worked.
8. A worker takes the message from the queue and downloads the original photo.
9. The worker creates the 50 KB thumbnail and saves it in object storage.
10. The worker updates the database row to "ready" and stores the thumbnail key.
11. The photo now appears in followers' feeds, and the CDN serves the thumbnail on request.

If a worker fails, the message goes back on the queue and is retried after a short delay. After several failures it moves to a failed-jobs queue for investigation, so one bad photo never blocks the others.
