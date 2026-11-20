"""Personal watchlist API. Run: uvicorn app.asgi:app --reload."""
import os
import sqlite3
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel, ConfigDict, Field

load_dotenv()
passwords = PasswordHash.recommended()
dummy_hash = passwords.hash("dummy-password-for-timing")
bearer = HTTPBearer(auto_error=False)


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"]
    expires_in: int = Field(description="Token lifetime in seconds", gt=0)


class HealthResponse(BaseModel):
    status: Literal["ok"]


class PublicMovie(BaseModel):
    name: str
    year: int
    summary: str


class MovieInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=200)
    year: int = Field(ge=1888, le=2100)
    summary: str = Field(default="", max_length=5000)
    isWatched: bool = False


class Movie(MovieInput):
    id: int


class Watched(BaseModel):
    isWatched: bool


class BookInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    author: str = Field(min_length=1, max_length=200)
    isRead: bool = False


class Book(BookInput):
    id: int


class ReadStatus(BaseModel):
    isRead: bool


class UserStatus(BaseModel):
    isOnline: bool


class User(BaseModel):
    id: int
    username: str
    isOnline: bool


def create_app(database_path=None, jwt_secret=None, token_minutes=None):
    database_path = str(database_path or os.getenv("DATABASE_PATH", "watchlist.db"))
    secret = jwt_secret or os.getenv("JWT_SECRET", "")
    if len(secret) < 32 or secret.startswith("replace-with"):
        raise RuntimeError("Set JWT_SECRET to a random secret of at least 32 characters")
    lifetime = int(token_minutes if token_minutes is not None else os.getenv("ACCESS_TOKEN_MINUTES", "30"))
    if lifetime <= 0:
        raise RuntimeError("ACCESS_TOKEN_MINUTES must be positive")

    def connect():
        db = sqlite3.connect(database_path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        return db

    @asynccontextmanager
    async def lifespan(app):
        db = connect()
        try:
            db.executescript(Path(__file__).with_name("schema.sql").read_text())
            db.commit()
        finally:
            db.close()
        yield

    api = FastAPI(title="Watchlist API", version="1.0.0", lifespan=lifespan)
    api.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    def database():
        db = connect()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def authenticated(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer), db=Depends(database)):
        denied = HTTPException(401, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})
        if credentials is None:
            raise denied
        try:
            claims = jwt.decode(credentials.credentials, secret, algorithms=["HS256"],
                                issuer="watchlist-api", audience="watchlist-react",
                                options={"require": ["sub", "jti", "exp", "iat"]})
            user_id = int(claims["sub"])
        except (jwt.InvalidTokenError, ValueError, TypeError):
            raise denied
        row = db.execute(
            "SELECT u.*, s.jti FROM users u JOIN sessions s ON s.user_id=u.id "
            "WHERE u.id=? AND s.jti=? AND s.expires_at>?",
            (user_id, claims["jti"], int(time.time())),
        ).fetchone()
        if row is None:
            raise denied
        return row

    def user_view(row):
        return {"id": row["id"], "username": row["username"], "isOnline": bool(row["is_online"])}

    def owned(db, table, item_id, user_id):
        row = db.execute(f"SELECT * FROM {table} WHERE id=? AND user_id=?", (item_id, user_id)).fetchone()
        if row is None:
            raise HTTPException(404, "Item not found")
        return row

    def movie_view(row):
        return dict(id=row["id"], name=row["name"], year=row["year"], summary=row["summary"], isWatched=bool(row["is_watched"]))

    def book_view(row):
        return dict(id=row["id"], title=row["title"], author=row["author"], isRead=bool(row["is_read"]))

    @api.get("/health", response_model=HealthResponse, tags=["Public"])
    def health(db=Depends(database)):
        db.execute("SELECT 1")
        return {"status": "ok"}

    @api.get("/api/public/movies", response_model=list[PublicMovie], tags=["Public"])
    def examples():
        return [
            {"name": "Fargo", "year": 1996, "summary": "An artwork of suspense"},
            {"name": "The Hateful Eight", "year": 2015, "summary": "A group of strangers trapped in a cabin"},
            {"name": "Organize İşler", "year": 2004, "summary": "A comedy about a small-time con artist"},
        ]

    @api.post("/api/auth/register", response_model=User, status_code=201, tags=["Auth"])
    def register(body: Credentials, db=Depends(database)):
        try:
            cursor = db.execute("INSERT INTO users(username,password_hash) VALUES (?,?)",
                                (body.username.casefold(), passwords.hash(body.password)))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Username already registered")
        return user_view(db.execute("SELECT * FROM users WHERE id=?", (cursor.lastrowid,)).fetchone())

    @api.post("/api/auth/login", response_model=TokenResponse, tags=["Auth"])
    def login(body: Credentials, response: Response, db=Depends(database)):
        row = db.execute("SELECT * FROM users WHERE username=?", (body.username.casefold(),)).fetchone()
        valid = passwords.verify(body.password, row["password_hash"] if row else dummy_hash)
        if row is None or not valid:
            raise HTTPException(401, "Invalid username or password", headers={"WWW-Authenticate": "Bearer"})
        now = int(time.time())
        expires = now + lifetime * 60
        jti = str(uuid4())
        db.execute("DELETE FROM sessions WHERE expires_at<=?", (now,))
        db.execute("INSERT INTO sessions VALUES (?,?,?)", (jti, row["id"], expires))
        token = jwt.encode({"sub": str(row["id"]), "jti": jti, "iat": now, "exp": expires,
                            "iss": "watchlist-api", "aud": "watchlist-react"}, secret, algorithm="HS256")
        response.headers["Cache-Control"] = "no-store"
        return {"access_token": token, "token_type": "bearer", "expires_in": lifetime * 60}

    @api.post("/api/auth/logout", status_code=204, tags=["Auth"])
    def logout(user=Depends(authenticated), db=Depends(database)):
        db.execute("DELETE FROM sessions WHERE jti=?", (user["jti"],))
        return Response(status_code=204)

    @api.get("/api/users/me", response_model=User, tags=["User"])
    def me(user=Depends(authenticated)):
        return user_view(user)

    @api.patch("/api/users/me/status", response_model=User, tags=["User"])
    def status(body: UserStatus, user=Depends(authenticated), db=Depends(database)):
        db.execute("UPDATE users SET is_online=? WHERE id=?", (body.isOnline, user["id"]))
        return {**user_view(user), "isOnline": body.isOnline}

    @api.get("/api/movies", response_model=list[Movie], tags=["Movies"])
    def movies(search: str = Query("", max_length=200), watched: Optional[bool] = None,
               limit: int = Query(100, ge=1, le=200), offset: int = Query(0, ge=0),
               user=Depends(authenticated), db=Depends(database)):
        rows = db.execute("SELECT * FROM movies WHERE user_id=? ORDER BY id", (user["id"],)).fetchall()
        rows = [r for r in rows if (watched is None or bool(r["is_watched"]) == watched)
                and (search.casefold() in r["name"].casefold() or search.casefold() in r["summary"].casefold())]
        return [movie_view(r) for r in rows[offset:offset + limit]]

    @api.post("/api/movies", response_model=Movie, status_code=201, tags=["Movies"])
    def add_movie(body: MovieInput, user=Depends(authenticated), db=Depends(database)):
        try:
            cursor = db.execute("INSERT INTO movies(user_id,name,name_key,year,summary,is_watched) VALUES (?,?,?,?,?,?)",
                                (user["id"], body.name, body.name.casefold(), body.year, body.summary, body.isWatched))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Movie with this name and year already exists")
        return movie_view(owned(db, "movies", cursor.lastrowid, user["id"]))

    @api.get("/api/movies/{item_id}", response_model=Movie, tags=["Movies"])
    def get_movie(item_id: int, user=Depends(authenticated), db=Depends(database)):
        return movie_view(owned(db, "movies", item_id, user["id"]))

    @api.put("/api/movies/{item_id}", response_model=Movie, tags=["Movies"])
    def edit_movie(item_id: int, body: MovieInput, user=Depends(authenticated), db=Depends(database)):
        owned(db, "movies", item_id, user["id"])
        try:
            db.execute("UPDATE movies SET name=?,name_key=?,year=?,summary=?,is_watched=? WHERE id=? AND user_id=?",
                       (body.name, body.name.casefold(), body.year, body.summary, body.isWatched, item_id, user["id"]))
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Movie with this name and year already exists")
        return movie_view(owned(db, "movies", item_id, user["id"]))

    @api.patch("/api/movies/{item_id}/watched", response_model=Movie, tags=["Movies"])
    def watched_status(item_id: int, body: Watched, user=Depends(authenticated), db=Depends(database)):
        owned(db, "movies", item_id, user["id"])
        db.execute("UPDATE movies SET is_watched=? WHERE id=? AND user_id=?", (body.isWatched, item_id, user["id"]))
        return movie_view(owned(db, "movies", item_id, user["id"]))

    @api.delete("/api/movies/{item_id}", status_code=204, tags=["Movies"])
    def delete_movie(item_id: int, user=Depends(authenticated), db=Depends(database)):
        owned(db, "movies", item_id, user["id"])
        db.execute("DELETE FROM movies WHERE id=? AND user_id=?", (item_id, user["id"]))
        return Response(status_code=204)

    @api.get("/api/books", response_model=list[Book], tags=["Books"])
    def books(user=Depends(authenticated), db=Depends(database)):
        return [book_view(r) for r in db.execute("SELECT * FROM books WHERE user_id=? ORDER BY id", (user["id"],))]

    @api.post("/api/books", response_model=Book, status_code=201, tags=["Books"])
    def add_book(body: BookInput, user=Depends(authenticated), db=Depends(database)):
        cursor = db.execute("INSERT INTO books(user_id,title,author,is_read) VALUES (?,?,?,?)",
                            (user["id"], body.title, body.author, body.isRead))
        return book_view(owned(db, "books", cursor.lastrowid, user["id"]))

    @api.patch("/api/books/{item_id}/read", response_model=Book, tags=["Books"])
    def read_status(item_id: int, body: ReadStatus, user=Depends(authenticated), db=Depends(database)):
        owned(db, "books", item_id, user["id"])
        db.execute("UPDATE books SET is_read=? WHERE id=? AND user_id=?", (body.isRead, item_id, user["id"]))
        return book_view(owned(db, "books", item_id, user["id"]))

    @api.delete("/api/books/{item_id}", status_code=204, tags=["Books"])
    def delete_book(item_id: int, user=Depends(authenticated), db=Depends(database)):
        owned(db, "books", item_id, user["id"])
        db.execute("DELETE FROM books WHERE id=? AND user_id=?", (item_id, user["id"]))
        return Response(status_code=204)

    return api
