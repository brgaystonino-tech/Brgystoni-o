# Firebase Setup — Barangay Sto. Niño Portal

This package uses Firebase project `stoninobrgy` and Realtime Database at `https://stoninobrgy-default-rtdb.firebaseio.com`. The public site and admin tools use Firebase Hosting + Realtime Database; the Gmail Cloud Functions backend and Firebase Authentication login have been removed.

## Admin access

The previous `stonino` username and `admin123` password are restored. The browser keeps an admin session for up to two hours and clears it on sign-out. This is a compatibility login for the existing static site, **not server-side authentication**: anyone with access to the front-end source can inspect or bypass it. Do not rely on it to protect sensitive data.

## Deployment (Windows CMD)

Install Node.js and the Firebase CLI (`npm install -g firebase-tools`) if not already installed. In the project folder run:

```cmd
firebase login
firebase use stoninobrgy
firebase deploy --only hosting
```

The database rules file is included for reference, but this package intentionally retains the legacy public read/write rules for `/portalData` because the existing public request forms and site editor use a single shared data object. **Those rules are not safe for sensitive resident data.** Before production use with confidential records, implement server-verified admin roles and restrictive rules at the database path level.

Firebase web configuration values in `firebase-config.js` are public by design; never add Gmail passwords or service-account keys to it.
