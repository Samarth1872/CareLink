# CareLoop (prototype)

Care-coordination platform for ASHA workers and PHC staff: **Screen → Register → PHC review → Treat → Monitor → Follow up → Control.**
CareLoop does not replace ASHA workers or doctors. It connects them.

> DEMO DATA — NOT REAL PATIENT INFORMATION. Prototype only; not a medical device.

## Run
```bash
npm install
npm start        # http://localhost:3000
```
Demo logins (password `demo1234`): ASHA `ASHA001` (role ASHA) · PHC `PHC001` (role PHC).

## What's inside
- `server.js` – Express API, in-memory demo data (3 PHCs, 10 ASHAs, 120 patients), server-side RBAC (ASHA = own area only, clinical plan = PHC only), validation, audit log, session timeout (30 min), duplicate-safe sync via `clientId`.
- `public/index.html` – single-page app (vanilla JS): landing, login, ASHA + PHC dashboards, priority + "why", patient profile/timeline/BP & glucose charts, visit form, registration, follow-ups, referrals/review queue, care gaps, medicine issues, analytics, notifications, offline queue + sync indicator, simulated reminders (EN/KN/HI), voice-note draft (confirm before save).

## Not yet built (next steps)
File upload/OCR, real map, real SMS/voice gateway, database (replace in-memory arrays), full i18n strings, hashed passwords with bcrypt, HTTPS/reverse proxy.
