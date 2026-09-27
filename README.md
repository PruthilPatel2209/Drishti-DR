# DRISHTI DR

Frontend-first demo for explainable retinal screening workflows. Patient identities and screening outcomes are fictional; the staged analysis is illustrative and is not a diagnosis or a clinically validated model.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Create a production build with `npm run build`.

## ASHA demo access

- User ID: `ASHA-1042`
- PIN: `1042`

The ophthalmologist and coordinator roles are available from role selection as well. App state persists in local browser storage.

## Project structure

- `src/App.tsx` — landing, role and login screens, application shell, ASHA dashboard and screening flow, specialist queue, and role pages.
- `src/state.tsx` — typed demo patients/cases, local authentication, persistence, and shared case/audit updates.
- `src/styles.css` — responsive clinical UI styles and retinal-image/analysis visuals.
- `src/main.tsx` — React entry point and router/provider wiring.
