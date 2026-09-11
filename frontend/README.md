# SmartSubmit frontend

This directory contains the React/Vite single-page application.

```bash
npm install
npm run dev
npm test
npm run build
npm run lint
```

Set `VITE_API_URL` in `.env.development` when the API is on another origin. An empty or unset value uses same-origin `/api` requests in deployment.

The client authenticates before resolving roles. The active role is kept per tab in `sessionStorage`; route guards require it to be among the authenticated user's assigned roles. See the repository [README](../README.md) for configuration, imports, uploads and API routes.
