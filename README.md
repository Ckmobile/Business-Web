# WhatsApp Web — Firebase Edition

A professional-grade WhatsApp-inspired web client built with plain HTML, CSS and modern JavaScript modules, using Firebase Authentication, Firestore and Storage.

## Included

- Google + email/password authentication
- Responsive desktop/mobile chat shell
- Real-time chat list and Firestore message streams
- Read/delivery state
- Presence/last-seen model
- Typing indicator data model
- Replies and emoji reactions
- Image/video/document uploads via Firebase Storage
- Search/filter UI
- Chat details panel
- Status/call UI entry points
- Security rules for users, chats, messages, groups, status and calls
- Firebase Hosting configuration
- Firestore composite indexes

## Firebase setup

1. Create a Firebase project.
2. Enable Authentication:
   - Google
   - Email/Password
3. Create a Firestore database.
4. Enable Firebase Storage.
5. Register a Web App and copy its configuration into `firebase-config.js`.
6. Deploy rules/indexes:
   ```bash
   firebase login
   firebase use YOUR_PROJECT_ID
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
7. For local development, use a static server:
   ```bash
   npx serve .
   ```
   or deploy with Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## Firestore data model

- `users/{uid}` — profile, about, avatar, online/lastSeen
- `presence/{uid}` — live presence state
- `chats/{chatId}` — members, lastMessage, updatedAt, unread counts
- `chats/{chatId}/messages/{messageId}` — text/media, sender, timestamps, delivery/read state, replies, reactions
- `groups/{groupId}` — group metadata, members, admins
- `statuses/{statusId}` — status posts and expiration metadata
- `typing/{chatId_uid}` — ephemeral typing state
- `calls/{callId}` — WebRTC call metadata
- `calls/{callId}/signals/{signalId}` — WebRTC signaling messages
- `notifications/{uid}` — push/in-app notification queue

## Production hardening

This is a functional foundation, not a claim of feature parity with WhatsApp's proprietary backend. For production, add:

- Phone authentication + reCAPTCHA
- Firebase Cloud Messaging for push notifications
- Cloud Functions for notifications, cleanup and server-side validation
- WebRTC TURN servers and complete offer/answer/ICE signaling
- Group-chat composer and admin controls
- Message edit/delete/forward/pin/star/search
- Contact discovery and QR/link-device flow
- Status viewers/replies/expiry cleanup
- End-to-end encryption architecture if required; Firestore rules alone are not E2EE
- Rate limits, abuse controls, file scanning and quotas
- App Check
- Stronger Storage rules validating MIME types and ownership
- Pagination/virtualized message rendering
- Offline persistence and conflict handling
- Analytics, crash reporting and automated tests

## Important

Do not put Firebase Admin SDK service-account credentials in `firebase-config.js`. Browser Firebase configuration values are identifiers, but access control must be enforced by Authentication + Firestore/Storage Security Rules.
