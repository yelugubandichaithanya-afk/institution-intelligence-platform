"""Institution data endpoints — all require a signed-in user."""
import re

from flask import Blueprint, jsonify, request

import db
from auth import require_auth
from errors import error_response

bp = Blueprint("institutions", __name__, url_prefix="/api/institutions")

ID_RE = re.compile(r"^[a-z0-9-]{1,40}$")
MAX_COMPARE = 4


@bp.get("")
@require_auth
def search():
    q = request.args.get("q", "")[:100]
    field = request.args.get("field", "all")
    if field != "all" and field not in db.SEARCH_FIELDS:
        return error_response(400, f"Unknown search field '{field}'.")
    return jsonify(db.search_profiles(q, field))


@bp.get("/compare")
@require_auth
def compare():
    ids = [i for i in request.args.get("ids", "").split(",") if i]
    ids = list(dict.fromkeys(ids))  # de-duplicate, keep order
    if not 2 <= len(ids) <= MAX_COMPARE:
        return error_response(400, f"Select between 2 and {MAX_COMPARE} institutions to compare.")
    if not all(ID_RE.match(i) for i in ids):
        return error_response(400, "Invalid institution id.")
    return jsonify(db.get_profiles(ids))


@bp.get("/<inst_id>")
@require_auth
def detail(inst_id):
    if not ID_RE.match(inst_id):
        return error_response(400, "Invalid institution id.")
    found = db.get_profiles([inst_id])
    if not found:
        return error_response(404, "Institution not found.")
    return jsonify(found[0])
