## Some ideas to extend the app

### Stats & insights
- Per-image stats: views/likes/comments over time for a single photo, plus where traffic came from (gallery, profile, challenge, search, external share)
- Per-album stats (same idea, plus which photos in the album perform best)
- Profile visit stats (who/how many visited `/@username`, follower growth over time)
- Challenge stats for members: acceptance rate, how my submissions compare to the average
- Event stats for admins: RSVP → attendance conversion, no-show rate per member, repeat attendees

### Discovery & social
- "Following" feed: a timeline of new uploads/albums from people you follow (follows exist, but there's no feed that uses them)
- Saved/bookmarked photos (private, separate from public likes)
- Photo map: GPS is already extracted from EXIF but never shown; opt-in map per photo/album/profile (with location privacy, e.g. blur to city level)
- Browse by gear: "photos shot with this camera/lens" pages built from EXIF
- Related photos on the photo detail page (same tags, same event, same photographer)
- Mentions (`@nickname`) in comments and captions, with notifications

### Feedback & learning
- Critique mode: a photo can be flagged "open for critique", with structured feedback (composition, light, editing) separate from regular comments
- Challenge voting: community votes or a "people's choice" next to admin acceptance
- Challenge winners/highlights page and an archive of past winners
- Before/after editing comparisons (slider) on a photo

### Events
- Waitlist when an event is full, with auto-promotion when someone cancels
- Post-event flow: prompt attendees to upload to the event album + short feedback survey
- Recurring events / event series (e.g. monthly photowalk)
- Calendar subscription feed (ICS URL) for all upcoming events, not just per-event add-to-calendar

### Portfolio & profile
- Featured/pinned photos on the profile (portfolio showcase)
- Custom profile layout/cover image
- Downloadable originals toggle per photo (respecting license), plus print-size info

### Admin & moderation
- Notify album owners on suspension/deletion (TODOs in `api/admin/albums/suspend` and `api/admin/albums/delete`)
- Audit log of admin actions (who suspended/resolved/deleted what, and when)
- Member roles beyond admin (e.g. moderator, event host) with scoped permissions
- Newsletter analytics (open/click rates via Resend webhooks) and a newsletter archive page
- Bulk member actions (export CSV, message a filtered group)

### Platform & quality
- PWA polish: installable, offline shell, web push notifications (in-app notifications already exist)
- i18n (Dutch/English), since most events are local
- Accessibility pass: required alt text prompt on upload (could suggest from caption/tags)
- Data export: "download all my photos + metadata" (GDPR-friendly, complements account deletion)
- Duplicate-upload detection (perceptual hash) to warn before uploading the same photo twice
