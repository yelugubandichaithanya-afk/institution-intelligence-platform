"""Authentication — proxies Supabase Auth (GoTrue) so the frontend needs no SDK."""
import hashlib
import re
import time
from functools import wraps

import requests
from flask import Blueprint, g, jsonify, request

from config import Config
from errors import ApiError, error_response

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD = 8
TOKEN_CACHE_SECONDS = 60
_token_cache = {}  # sha256(token) -> (user, expires_at)


def _gotrue(method, path, *, json=None, token=None, params=None):
    if Config.missing():
        raise ApiError(503, "Server is not connected to Supabase yet.")
    headers = {"apikey": Config.SUPABASE_ANON_KEY}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    try:
        r = requests.request(method, f"{Config.SUPABASE_URL}/auth/v1{path}",
                             json=json, params=params, headers=headers, timeout=10)
    except requests.RequestException:
        raise ApiError(502, "Authentication service is unavailable. Try again shortly.")
    try:
        data = r.json() if r.content else {}
    except ValueError:
        data = {}
    return r.status_code, data


def _message(data, fallback="Authentication failed"):
    return data.get("msg") or data.get("error_description") or data.get("message") or fallback


def _public_user(u):
    meta = u.get("user_metadata") or {}
    return {"id": u["id"], "email": u.get("email"), "full_name": meta.get("full_name")}


def _session(data):
    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "expires_at": data.get("expires_at"),
        "user": _public_user(data["user"]),
    }


def _body():
    return request.get_json(silent=True) or {}


def verify_token(token):
    key = hashlib.sha256(token.encode()).hexdigest()
    now = time.monotonic()
    hit = _token_cache.get(key)
    if hit and hit[1] > now:
        return hit[0]
    status, data = _gotrue("GET", "/user", token=token)
    if status != 200 or "id" not in data:
        _token_cache.pop(key, None)
        return None
    if len(_token_cache) > 1000:
        _token_cache.clear()
    user = _public_user(data)
    _token_cache[key] = (user, now + TOKEN_CACHE_SECONDS)
    return user


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return error_response(401, "Please sign in to view this data.")
        user = verify_token(header[7:].strip())
        if not user:
            return error_response(401, "Your session has expired. Please sign in again.")
        g.user = user
        return fn(*args, **kwargs)
    return wrapper


@bp.post("/signup")
def signup():
    body = _body()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    full_name = (body.get("full_name") or "").strip()

    if not full_name:
        return error_response(400, "Full name is required.")
    if not EMAIL_RE.match(email):
        return error_response(400, "Enter a valid email address.")
    if len(password) < MIN_PASSWORD:
        return error_response(400, f"Password must be at least {MIN_PASSWORD} characters.")

    params = {"redirect_to": f"{Config.SITE_URL}/login.html"} if Config.SITE_URL else None
    status, data = _gotrue("POST", "/signup", params=params, json={
        "email": email, "password": password, "data": {"full_name": full_name},
    })
    if status >= 400:
        return error_response(400 if status < 500 else 502, _message(data, "Could not create account."))

    # With email confirmation enabled Supabase returns no session.
    if data.get("access_token"):
        return jsonify({"session": _session(data)}), 201
    return jsonify({"session": None,
                    "message": "Account created. Check your email to confirm, then sign in."}), 201


@bp.post("/login")
def login():
    body = _body()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return error_response(400, "Email and password are required.")

    status, data = _gotrue("POST", "/token", params={"grant_type": "password"},
                           json={"email": email, "password": password})
    if status >= 400:
        msg = _message(data, "Invalid email or password.")
        if "invalid login credentials" in msg.lower():
            msg = "Invalid email or password."
        return error_response(401 if status < 500 else 502, msg)
    return jsonify({"session": _session(data)})


@bp.post("/refresh")
def refresh():
    token = _body().get("refresh_token")
    if not token:
        return error_response(400, "refresh_token is required.")
    status, data = _gotrue("POST", "/token", params={"grant_type": "refresh_token"},
                           json={"refresh_token": token})
    if status >= 400:
        return error_response(401, "Your session has expired. Please sign in again.")
    return jsonify({"session": _session(data)})


@bp.post("/logout")
@require_auth
def logout():
    token = request.headers["Authorization"][7:].strip()
    _gotrue("POST", "/logout", token=token, params={"scope": "local"})
    _token_cache.pop(hashlib.sha256(token.encode()).hexdigest(), None)
    return "", 204


@bp.get("/me")
@require_auth
def me():
    return jsonify({"user": g.user})
