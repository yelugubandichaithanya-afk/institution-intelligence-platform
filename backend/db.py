"""Supabase access + mapping between database rows and the frontend profile shape."""
import re

from supabase import Client, create_client

from config import Config
from errors import ApiError

_client = None

PROFILE_SELECT = (
    "*, regulatory_records(*), admissions(*), courses(*), placements(*), recruiter_profiles(*), "
    "nirf_rankings(*), promoter_profiles(*), legal_records(*), campus_metrics(*), "
    "commercial_metrics(*), internal_notes(*)"
)

SEARCH_FIELDS = {
    "name": "name_text",
    "university": "university_text",
    "aishe": "aishe_text",
    "city": "city_text",
    "promoter": "promoter_text",
}

MAX_RESULTS = 50


def client() -> Client:
    """Server-side client using the service-role key (never exposed to the browser)."""
    global _client
    if Config.missing():
        raise ApiError(503, "Server is not connected to Supabase yet.")
    if _client is None:
        _client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
    return _client


# ---------------------------------------------------------------- queries

def search_profiles(q, field="all"):
    q = re.sub(r"[^\w\s-]", " ", (q or "").lower()).strip()
    query = client().table("institutions").select(PROFILE_SELECT).order("name").limit(MAX_RESULTS)
    if q:
        cols = SEARCH_FIELDS.values() if field == "all" else [SEARCH_FIELDS[field]]
        ids = client().table("institution_search").select("id") \
            .or_(",".join(f"{c}.ilike.*{q}*" for c in cols)).limit(MAX_RESULTS).execute().data
        if not ids:
            return []
        query = query.in_("id", [r["id"] for r in ids])
    return [to_profile(r) for r in query.execute().data]


def get_profiles(ids):
    rows = client().table("institutions").select(PROFILE_SELECT).in_("id", ids).execute().data
    by_id = {r["id"]: to_profile(r) for r in rows}
    return [by_id[i] for i in ids if i in by_id]


# ---------------------------------------------------------------- row → profile

def _one(x):
    if isinstance(x, list):
        return x[0] if x else {}
    return x or {}


def _split(items):
    return {it["label"]: it["pct"] for it in items or []}


def to_profile(r):
    rec = _one(r.get("recruiter_profiles"))
    pro = _one(r.get("promoter_profiles"))
    cam = _one(r.get("campus_metrics"))
    com = _one(r.get("commercial_metrics"))
    note = _one(r.get("internal_notes"))

    nirf = {}
    for n in sorted(r.get("nirf_rankings") or [], key=lambda n: (n["sort_order"], n["year"])):
        nirf.setdefault(n["category"], []).append({"year": n["year"], "rank": n["rank"]})

    return {
        "id": r["id"],
        "name": r["name"],
        "shortName": r["short_name"],
        "aishe": r["aishe_code"],
        "city": r["city"],
        "state": r["state"],
        "established": r["established"],
        "ownership": r["ownership"],
        "category": r["category"],
        "university": r["university"],
        "campusStatus": r["campus_status"],
        "website": r["website"],
        "coursesSource": r["courses_source"],
        "regulatory": [
            {"body": x["body"], "item": x["item"], "value": x["value"], "validUntil": x["valid_until"],
             "state": x["state"], "affiliation": x["is_affiliation"], "naac": x["is_naac"]}
            for x in sorted(r.get("regulatory_records") or [], key=lambda x: x["sort_order"])
        ],
        "admissions": [
            {"year": a["academic_year"], "intake": a["approved_intake"], "claimed": a["claimed"], "verified": a["verified"]}
            for a in sorted(r.get("admissions") or [], key=lambda a: a["academic_year"])
        ],
        "courses": [
            {"name": c["name"], "level": c["level"], "duration": c["duration_years"], "intake": c["intake"],
             "admitted": c["admitted"], "status": c["status"], "since": c["since"]}
            for c in sorted(r.get("courses") or [], key=lambda c: c["sort_order"])
        ],
        "placements": [
            {"year": p["batch_year"], "eligible": p["eligible"], "placed": p["placed"], "claimedPct": p["claimed_pct"],
             "highest": p["highest"], "average": p["average"], "median": p["median"]}
            for p in sorted(r.get("placements") or [], key=lambda p: p["batch_year"])
        ],
        "recruiters": {
            "total": rec.get("total"), "repeat": rec.get("repeat_count"), "newCount": rec.get("new_count"),
            "international": rec.get("international"), "top": rec.get("top_recruiters") or [],
            "internships": rec.get("internship_companies") or [],
            "sectors": _split(rec.get("sector_split")), "locations": _split(rec.get("location_split")),
        },
        "nirf": nirf,
        "promoter": {
            "trust": pro.get("trust_name"), "entityType": pro.get("entity_type"),
            "trustEstablished": pro.get("trust_established"), "registration": pro.get("registration"),
            "insolvency": pro.get("insolvency"), "promoters": pro.get("promoters") or [],
            "board": pro.get("board_members") or [], "keyManagement": pro.get("key_management") or [],
            "otherInstitutions": pro.get("other_institutions") or [],
            "otherBusinesses": pro.get("other_businesses") or [],
            "previousInstitutions": pro.get("previous_institutions") or [],
            "legal": [
                {"type": l["record_type"], "party": l["party"], "title": l["title"], "forum": l["forum"],
                 "year": l["year"], "status": l["status"], "material": l["is_material"],
                 "src": l["source"], "date": l["source_date"]}
                for l in sorted(r.get("legal_records") or [], key=lambda l: l["id"])
            ],
        },
        "campus": {
            "students": cam.get("students"), "faculty": cam.get("faculty"),
            "facultyAttrition": cam.get("faculty_attrition"), "attendance": cam.get("attendance"),
            "passPct": cam.get("pass_pct"), "backlogs": cam.get("backlogs"), "dropouts": cam.get("dropouts"),
            "graduationRate": cam.get("graduation_rate"), "higherStudies": cam.get("higher_studies"),
            "land": cam.get("land_acres"), "builtUp": cam.get("built_up_sqft"), "classrooms": cam.get("classrooms"),
            "labs": cam.get("labs"), "library": cam.get("library_volumes"),
            "hostelCapacity": cam.get("hostel_capacity"), "hostelOccupancy": cam.get("hostel_occupancy"),
            "buses": cam.get("buses"), "sports": cam.get("sports"),
        },
        "commercial": {
            "capacity": com.get("capacity"), "avgFee": com.get("avg_fee_lakh"),
            "collectionEfficiency": com.get("collection_efficiency"), "outstanding": com.get("outstanding_cr"),
            "scholarshipPct": com.get("scholarship_pct"), "discountPct": com.get("discount_pct"),
            "refunds": com.get("refunds_cr"), "courseFees": com.get("course_fees") or [],
        },
        "internal": {
            "visitDate": note.get("visit_date"), "visitedBy": note.get("visited_by"),
            "notes": note.get("notes"), "partnershipHistory": note.get("partnership_history"),
        },
    }
