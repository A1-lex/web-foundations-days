# Reflection

The most difficult concept in the course was replication lag and eventual consistency. It was easy to see why a read replica spreads load, but harder to accept that a user can save something and not see it for a moment. I overcame it by asking what the user would actually see, and then finding a fix: read the uploader's own recent photos from the primary database. A concrete symptom with a concrete fix made the idea stick. Designing TicketHub showed me a harder cousin of the same problem, where two people act at the same instant and the database must decide who wins.

Based on the feedback I received, I would improve how my designs handle failure. Graders asked me for deletion rules in Day 6 and for retry handling and trade-offs in Day 7, and each time I had described the happy path but not what happens when something goes wrong. In my capstone I would add more detail on what the client does when a request times out. In TicketHub I would describe payment failures and expired holds in more depth. I also learned to keep documents short so that a reader reaches the end.

Next I want to learn how to test a design under load, for example by simulating a big sale with a load testing tool, and how real databases handle locks and transactions. I would also like to build a small real backend for QuickNotes, so my documents become running code.
