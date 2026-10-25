# SnapShare Scaling Plan

## 1. Assumptions and estimates

Assumptions: 10 million registered users, 10% active each day, and each active user uploads 1 photo and views 50 feed pages per day. An average photo is 2 MB plus a 50 KB thumbnail. Peak traffic is 5 times the average, and 1 day is 86,400 seconds.

- Daily active users: 10,000,000 x 10% = 1,000,000
- Uploads per second: 1,000,000 / 86,400 = about 12 on average, about 60 at peak
- Feed views per second: 50,000,000 / 86,400 = about 580 on average, about 2,900 at peak
- Storage per year: 1,000,000 x 2.05 MB x 365 = about 750 TB

## 2. Read-heavy or write-heavy

The system is read-heavy, with 50 feed views for every upload. So we cache, use a CDN and a read replica, and move slow write work such as thumbnails into the background.

## 3. Why photos stay out of the database

At 750 TB a year, photo files in the database would make backups and replication slow, cost far more than object storage, and tie up connections that should serve queries. Photos go in object storage behind a CDN. The database keeps only metadata: photo id, owner, caption, time and storage key.

## 4. Architecture diagram

```
Users --photos--> CDN --miss--> Object storage <----------+
  |                                  ^                    |
  +--API--> Load balancer            | original           | thumbnail
               |                     |                    |
         App   App   App ------------+--> Queue --> Worker
          |     |                                     |
          |     +--> Cache --miss--> DB read replica  |
          |                               ^           |
          +--writes--> DB primary --copy--+  <-update-+
```

## 5. Components

- **CDN:** serves photos from servers near the user, so images load fast and our servers carry less traffic.
- **Load balancer:** spreads requests across the app servers and skips any that are down.
- **App servers:** run the logic (login, upload, feed) and hold no state, so we can add more as traffic grows.
- **Cache:** keeps recent feeds in memory so most reads skip the database.
- **DB primary:** stores the metadata and takes all writes.
- **Read replica:** a copy that serves feed reads and keeps the primary free for writes.
- **Object storage:** holds the photo files cheaply and durably at 750 TB a year.
- **Queue:** holds thumbnail jobs so an upload can finish before the slow work is done.
- **Worker:** takes jobs from the queue and creates the 50 KB thumbnails, and we add more if the queue backs up.

## 6. Upload flow

1. The user sends the photo and the load balancer routes it to an app server.
2. The app server checks login, file type and size.
3. The app server saves the original in object storage.
4. The app server writes a metadata row to the DB primary with the status "processing".
5. The app server puts a "make thumbnail" message with the photo id on the queue.
6. The app server tells the user the upload worked.
7. A worker takes the message and downloads the original.
8. The worker creates the 50 KB thumbnail and saves it in object storage.
9. The worker sets the row to "ready", so the photo appears in feeds and the CDN serves it.

If a worker fails, the message returns to the queue and is retried. After several failures it moves to a failed-jobs queue, so one bad photo never blocks the others. The worker first checks whether the thumbnail already exists, so a retry never duplicates work.

## 7. Trade-offs

- **Replication lag:** the replica copies data a moment after the primary, so a user may upload a photo and not see it in their feed for a few seconds (eventual consistency). Followers will not notice a short delay, and the uploader reads their own recent photos from the primary, so their upload never seems to vanish.
- **Cache freshness:** cached feeds are fast but can be seconds or minutes out of date, which is fine for photos but not for something like a bank balance.
- **Queue:** uploads stay fast, but thumbnails are not instant, so the app shows a "processing" state and we must run and monitor one more system.
- **CDN cost:** a CDN speeds up loading and cuts server load, but it costs money for traffic, and a deleted photo can stay cached until it expires.
