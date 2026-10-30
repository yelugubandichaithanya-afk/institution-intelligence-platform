"""Create (or reset the password of) a login account — no email is sent.

    python create_user.py "Full Name" email@example.com [password]

If no password is given, a strong random one is generated and printed.
"""
import secrets
import string
import sys

import requests

from config import Config


def random_password(length=14):
    alphabet = string.ascii_letters + string.digits
    while True:
        pw = "".join(secrets.choice(alphabet) for _ in range(length - 1)) + secrets.choice("@#$%&*!")
        if any(c.isdigit() for c in pw) and any(c.isupper() for c in pw) and any(c.islower() for c in pw):
            return pw


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    if Config.missing():
        sys.exit(f"Missing in .env: {', '.join(Config.missing())}")
    full_name, email = sys.argv[1], sys.argv[2].strip().lower()
    password = sys.argv[3] if len(sys.argv) > 3 else random_password()

    base = f"{Config.SUPABASE_URL}/auth/v1/admin/users"
    headers = {"apikey": Config.SUPABASE_SERVICE_ROLE_KEY, "Authorization": f"Bearer {Config.SUPABASE_SERVICE_ROLE_KEY}"}
    body = {"password": password, "email_confirm": True, "user_metadata": {"full_name": full_name}}

    existing = next((u for u in requests.get(base, headers=headers, params={"per_page": 1000}, timeout=15).json()["users"]
                     if u["email"] == email), None)
    if existing:
        r = requests.put(f"{base}/{existing['id']}", headers=headers, json=body, timeout=15)
        action = "updated"
    else:
        r = requests.post(base, headers=headers, json={"email": email, **body}, timeout=15)
        action = "created"
    if not r.ok:
        sys.exit(f"Failed: {r.status_code} {r.text}")
    print(f"{action}: {full_name} <{email}>  password: {password}")


if __name__ == "__main__":
    main()
