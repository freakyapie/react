import sqlite3
import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from export_docs import inline_schema_references

SECRET = "test-secret-with-at-least-32-characters"


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(tmp_path / "test.db", SECRET)) as client:
        yield client


def login(client, username="alice"):
    credentials = {"username": username, "password": "a-long-password"}
    assert client.post("/api/auth/register", json=credentials).status_code == 201
    response = client.post("/api/auth/login", json=credentials)
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_public_and_auth(client):
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/health").status_code == 200
    assert len(client.get("/api/public/movies").json()) == 3
    assert client.get("/api/movies").status_code == 401
    headers = login(client)
    assert client.get("/api/users/me", headers=headers).json()["username"] == "alice"
    assert client.post("/api/auth/register", json={"username": "ALICE", "password": "a-long-password"}).status_code == 409
    assert client.post("/api/auth/login", json={"username": "alice", "password": "wrong-password"}).status_code == 401
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/users/me", headers=headers).status_code == 401


def test_success_response_schemas(client):
    schema = client.get("/openapi.json").json()
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            for code, response in operation["responses"].items():
                if code.startswith("2") and code != "204":
                    body = response["content"]["application/json"]["schema"]
                    assert "$ref" in body or body.get("type") == "array", (method, path)
    token = schema["components"]["schemas"]["TokenResponse"]
    assert set(token["required"]) == {"access_token", "token_type", "expires_in"}


def test_file_export_inlines_schemas(client):
    import json

    original = client.get("/openapi.json").json()
    exported = inline_schema_references(original)
    assert '"$ref"' not in json.dumps(exported)
    public = exported["paths"]["/api/public/movies"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    assert set(public["items"]["properties"]) == {"name", "year", "summary"}
    assert "$ref" in original["paths"]["/api/public/movies"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["items"]


def test_movies_and_isolation(client):
    alice, bob = login(client), login(client, "bob")
    movie = {"name": "Fargo", "year": 1996, "summary": "Suspense", "isWatched": False}
    response = client.post("/api/movies", json=movie, headers=alice)
    assert response.status_code == 201
    url = "/api/movies/" + str(response.json()["id"])
    assert client.post("/api/movies", json={**movie, "name": " fArGo "}, headers=alice).status_code == 409
    assert client.post("/api/movies", json=movie, headers=bob).status_code == 201
    assert client.get(url, headers=bob).status_code == 404
    assert client.put(url, json=movie, headers=bob).status_code == 404
    assert client.patch(url + "/watched", json={"isWatched": True}, headers=bob).status_code == 404
    assert client.delete(url, headers=bob).status_code == 404
    assert client.patch(url + "/watched", json={"isWatched": True}, headers=alice).json()["isWatched"] is True
    assert len(client.get("/api/movies?watched=true&search=SUSPENSE", headers=alice).json()) == 1
    assert client.get("/api/movies?watched=false", headers=alice).json() == []
    assert client.put(url, json={**movie, "name": "New title"}, headers=alice).json()["name"] == "New title"
    assert client.post("/api/movies", json={**movie, "name": "   "}, headers=alice).status_code == 422
    assert client.delete(url, headers=alice).status_code == 204
    assert client.get(url, headers=alice).status_code == 404


def test_books_and_status(client):
    alice, bob = login(client), login(client, "bob")
    response = client.post("/api/books", json={"title": "Crucial Conversations", "author": "Patterson Grenny"}, headers=alice)
    assert response.status_code == 201
    url = "/api/books/" + str(response.json()["id"])
    assert client.get("/api/books", headers=bob).json() == []
    assert client.patch(url + "/read", json={"isRead": True}, headers=bob).status_code == 404
    assert client.patch(url + "/read", json={"isRead": True}, headers=alice).json()["isRead"] is True
    assert client.patch("/api/users/me/status", json={"isOnline": False}, headers=alice).json()["isOnline"] is False
    assert client.get("/api/users/me", headers=alice).json()["isOnline"] is False
    assert client.delete(url, headers=alice).status_code == 204


def test_token_validation_and_independent_sessions(client):
    headers = login(client)
    second = client.post("/api/auth/login", json={"username": "alice", "password": "a-long-password"}).json()["access_token"]
    token = headers["Authorization"].split()[1]
    claims = jwt.decode(token, SECRET, algorithms=["HS256"], audience="watchlist-react")
    for changes, secret in [({"exp": int(time.time()) - 1}, SECRET), ({}, "different-secret-that-is-long-enough"), ({"aud": "other"}, SECRET), ({"jti": "unknown"}, SECRET)]:
        invalid = jwt.encode({**claims, **changes}, secret, algorithm="HS256")
        assert client.get("/api/users/me", headers={"Authorization": "Bearer " + invalid}).status_code == 401
    assert client.post("/api/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/users/me", headers={"Authorization": "Bearer " + second}).status_code == 200


def test_persistence_and_password_hash(tmp_path):
    path = tmp_path / "persistent.db"
    with TestClient(create_app(path, SECRET)) as client:
        headers = login(client)
        client.post("/api/movies", json={"name": "Persistent", "year": 2020}, headers=headers)
    with TestClient(create_app(path, SECRET)) as client:
        assert client.get("/api/movies", headers=headers).json()[0]["name"] == "Persistent"
    with sqlite3.connect(path) as db:
        assert db.execute("SELECT password_hash FROM users").fetchone()[0].startswith("$argon2")


def test_secret_required():
    with pytest.raises(RuntimeError):
        create_app(jwt_secret="short")
