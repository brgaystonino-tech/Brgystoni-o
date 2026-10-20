# Barangay Sto. Niño Information & Service Portal

A responsive barangay information portal with public service requests, community concerns, announcements, service catalog, officials, emergency contacts, admin dashboard, QR code generator, live request sound alerts, and official profile photo support. The legacy admin username/password login is restored and the Firebase Gmail Cloud Functions backend has been removed.

## Admin login

- Username: `stonino`
- Password: `admin123`

For compatibility, the login creates a browser session that expires after two hours. This is **not server-side authentication** and must not be treated as secure access control. Do not publish or store sensitive information in this static front-end until server-side authorization and restrictive Realtime Database rules are configured.

## Deploy to Firebase Hosting (Windows CMD)

1. Install Node.js and Firebase CLI if needed: `npm install -g firebase-tools`.
2. Open CMD in this project folder and run:

   ```cmd
   firebase login
   firebase use stoninobrgy
   firebase deploy --only hosting
   ```

3. Open the hosting URL printed by the CLI. Test both the public page and `admin.html`.

## Important security limitation

The current `firebase-database.rules.json` file allows public read/write access to `/portalData` to preserve the site's existing single-object data model and unauthenticated public forms. This is not safe for real resident personal information or confidential complaint records. Before production use with sensitive records, refactor to server-verified authentication and granular Realtime Database rules. The username/password login is visible in the client-side code and can be bypassed; it is a restored legacy convenience, not a security boundary.
