"""Load seed_data.json into Supabase. Re-runnable: replaces the seeded institutions.

    python seed/seed.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import Config  # noqa: E402
from db import client  # noqa: E402

SEED_FILE = Path(__file__).with_name("seed_data.json")


def rows_for(inst):
    iid = inst["id"]
    p, c, cm, rec = inst["promoter"], inst["campus"], inst["commercial"], inst["recruiters"]
    return {
        "institutions": [{
            "id": iid, "name": inst["name"], "short_name": inst["shortName"], "aishe_code": inst["aishe"],
            "city": inst["city"], "state": inst["state"], "established": inst["established"],
            "ownership": inst["ownership"], "category": inst["category"], "university": inst["university"],
            "campus_status": inst["campusStatus"], "website": inst["website"], "courses_source": inst["coursesSource"],
        }],
        "regulatory_records": [{
            "institution_id": iid, "body": r["body"], "item": r["item"], "value": r["value"],
            "valid_until": r.get("validUntil"), "state": r["state"],
            "is_affiliation": bool(r.get("affiliation")), "is_naac": bool(r.get("naac")), "sort_order": n,
        } for n, r in enumerate(inst["regulatory"])],
        "admissions": [{
            "institution_id": iid, "academic_year": a["year"], "approved_intake": a["intake"],
            "claimed": a["claimed"], "verified": a["verified"],
        } for a in inst["admissions"]],
        "courses": [{
            "institution_id": iid, "name": x["name"], "level": x["level"], "duration_years": x["duration"],
            "intake": x["intake"], "admitted": x["admitted"], "status": x["status"], "since": x.get("since"), "sort_order": n,
        } for n, x in enumerate(inst["courses"])],
        "placements": [{
            "institution_id": iid, "batch_year": x["year"], "eligible": x["eligible"], "placed": x["placed"],
            "claimed_pct": x["claimedPct"], "highest": x["highest"], "average": x["average"], "median": x["median"],
        } for x in inst["placements"]],
        "recruiter_profiles": [{
            "institution_id": iid, "total": rec["total"], "repeat_count": rec["repeat"], "new_count": rec["newCount"],
            "international": rec["international"], "top_recruiters": rec["top"], "internship_companies": rec["internships"],
            "sector_split": [{"label": k, "pct": v} for k, v in rec["sectors"].items()],
            "location_split": [{"label": k, "pct": v} for k, v in rec["locations"].items()],
        }],
        "nirf_rankings": [{
            "institution_id": iid, "category": cat, "year": x["year"], "rank": x["rank"], "sort_order": n,
        } for n, (cat, rows) in enumerate(inst["nirf"].items()) for x in rows],
        "promoter_profiles": [{
            "institution_id": iid, "trust_name": p["trust"], "entity_type": p["entityType"],
            "trust_established": p["trustEstablished"], "registration": p["registration"], "insolvency": p["insolvency"],
            "promoters": p["promoters"], "board_members": p["board"], "key_management": p["keyManagement"],
            "other_institutions": p["otherInstitutions"], "other_businesses": p["otherBusinesses"],
            "previous_institutions": p["previousInstitutions"],
        }],
        "legal_records": [{
            "institution_id": iid, "record_type": l["type"], "party": l["party"], "title": l["title"],
            "forum": l["forum"], "year": l["year"], "status": l["status"], "is_material": l["material"],
            "source": l["src"], "source_date": l["date"],
        } for l in p["legal"]],
        "campus_metrics": [{
            "institution_id": iid, "students": c["students"], "faculty": c["faculty"],
            "faculty_attrition": c["facultyAttrition"], "attendance": c["attendance"], "pass_pct": c["passPct"],
            "backlogs": c["backlogs"], "dropouts": c["dropouts"], "graduation_rate": c["graduationRate"],
            "higher_studies": c["higherStudies"], "land_acres": c["land"], "built_up_sqft": c["builtUp"],
            "classrooms": c["classrooms"], "labs": c["labs"], "library_volumes": c["library"],
            "hostel_capacity": c["hostelCapacity"], "hostel_occupancy": c["hostelOccupancy"],
            "buses": c["buses"], "sports": c["sports"],
        }],
        "commercial_metrics": [{
            "institution_id": iid, "capacity": cm["capacity"], "avg_fee_lakh": cm["avgFee"],
            "collection_efficiency": cm["collectionEfficiency"], "outstanding_cr": cm["outstanding"],
            "scholarship_pct": cm["scholarshipPct"], "discount_pct": cm["discountPct"],
            "refunds_cr": cm["refunds"], "course_fees": cm["courseFees"],
        }],
        "internal_notes": [{
            "institution_id": iid, "visit_date": inst["internal"]["visitDate"],
            "visited_by": inst["internal"]["visitedBy"], "notes": inst["internal"]["notes"],
            "partnership_history": inst["internal"]["partnershipHistory"],
        }],
    }


def main():
    if Config.missing():
        sys.exit(f"Missing in .env: {', '.join(Config.missing())}")
    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))["institutions"]
    sb = client()

    ids = [i["id"] for i in data]
    sb.table("institutions").delete().in_("id", ids).execute()  # children cascade

    for inst in data:
        for table, rows in rows_for(inst).items():
            if rows:
                sb.table(table).insert(rows).execute()
        print(f"  seeded {inst['name']}")
    print(f"Done - {len(data)} institutions.")


if __name__ == "__main__":
    main()
