# Watchlist backend

Python 3.9+ / FastAPI / SQLite API for https://github.com/freakyapie/react.
Inspected commit: `fe5a00cb2db8fff0ca270face17c569a0cacf16e`.
Inspected `src/App.tsx`, `FilmCard.tsx`, and `UserStatus.tsx`: the app currently
keeps movies in localStorage, filters/searches them, toggles watched status,
shows a book read toggle, and has an online/offline setting.

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(48))"
# Put the generated value in .env as JWT_SECRET, then:
.\.venv\Scripts\python.exe -m uvicorn app.asgi:app --reload
```

API: http://localhost:8000. Interactive docs: http://localhost:8000/docs.
This workspace already has a `.venv` and a generated local `.env`; the setup
commands above also cover a fresh checkout. Keep the existing `.env` when restarting.
SQLite tables are created at startup from `app/schema.sql`; the database persists
in `watchlist.db`. No separate SQL server is needed. Run from this directory.
The app refuses to start with a missing, short, or example JWT secret.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

## Routes and access

| Method | Path | Access / purpose |
|---|---|---|
| GET | `/health` | Public readiness check |
| POST | `/api/auth/register` | Public account creation |
| POST | `/api/auth/login` | Public credentials exchange |
| GET | `/api/public/movies` | Public static examples from the React app; no user data or watch state |
| GET | `/docs`, `/redoc`, `/openapi.json` | Public API documentation |
| POST | `/api/auth/logout` | JWT required; revoke this login |
| GET | `/api/users/me` | JWT required; own profile |
| PATCH | `/api/users/me/status` | JWT required; body `{"isOnline": false}` |
| GET | `/api/movies` | JWT required; own movies; `search`, `watched`, `limit`, `offset` |
| POST | `/api/movies` | JWT required; create own movie |
| GET, PUT, DELETE | `/api/movies/{id}` | JWT required; read, replace, delete own movie |
| PATCH | `/api/movies/{id}/watched` | JWT required; body `{"isWatched": true}` |
| GET, POST | `/api/books` | JWT required; list/create own books |
| PATCH | `/api/books/{id}/read` | JWT required; body `{"isRead": true}` |
| DELETE | `/api/books/{id}` | JWT required; delete own book |

Personal collections and watch/read state stay private. Another user's item
returns 404. New accounts start empty; public examples are never auto-inserted.
The online setting is a saved preference, independent of login/session state.

Registration and login accept JSON `{"username":"alice","password":"a-long-password"}`.
Usernames are case insensitive (3–50 letters, digits, `_`, `.`, `-`); passwords
are 8–128 characters. Login returns `access_token`, `token_type`, `expires_in`.
Send `Authorization: Bearer <access_token>` on private requests. In `/docs`,
log in first, then paste the token into Authorize.

Movie bodies use the frontend's names:

```json
{"name":"Fargo","year":1996,"summary":"An artwork of suspense","isWatched":false}
```

Responses add an integer `id`; use that ID for edits/deletes instead of a movie
name. Names are trimmed and case insensitive for duplicate checks within the
same year and account. PUT replaces the movie; PATCH explicitly sets watched
status so retrying a request does not flip it twice. Year range: 1888–2100.
Book creation accepts `title`, `author`, and optional `isRead` (default false).
Validation errors return 422, duplicate movies/usernames 409, invalid credentials
or JWTs 401, missing/inaccessible items 404. Movie lists default to 100 items
(maximum 200); paginate with `offset`.

## React integration

The source frontend is retained under ignored `reference-react/` for inspection;
it has not been rewired. `examples/api.ts` provides a small fetch client to copy
into the frontend. Set `VITE_API_URL=http://localhost:8000` in its `.env`.
Replace localStorage reads/writes with API calls, add login/register screens,
and add `id: number` to the Movie interface. Update card callbacks to use IDs.
After login, load movies; after mutations, refresh the list. Use
`?watched=true` for the watched page and `?search=...` for search. Existing
localStorage data can be imported by POSTing each movie while logged in.

JWTs expire after 30 minutes by default (`ACCESS_TOKEN_MINUTES`). Each login
creates its own persisted session; logout deletes that session and immediately
invalidates its token, including across restarts. Other logins remain active.
Expired sessions are cleaned during login. There is no refresh endpoint;
log in again after expiration. Keep tokens in memory in the frontend; clear
them after successful logout or a 401. Configure `CORS_ORIGINS` for your frontend.

This is a small local backend: SQLite schema initialization is not a migration
system. Before an internet deployment, serve HTTPS, add request/login rate limits
at a gateway, and use a managed secret and database backups. Dependencies follow
bounded compatible ranges; pin resolved versions for a deployment.

Authentication uses PyJWT and pwdlib/Argon2, as in the
[FastAPI JWT guide](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/).

## Share Swagger documentation

Run `.\.venv\Scripts\python.exe export_docs.py` to regenerate `docs/swagger.html`
and `docs/openapi.json`. Send `swagger.html` to someone; they can open it in a
browser without running the backend. Internet access is needed for Swagger UI's
CSS and JavaScript. The schema is embedded in the HTML, and interactive requests
are disabled. No credentials, JWT secrets, or database contents are included.
The JSON file can also be imported into Postman or Swagger Editor.
