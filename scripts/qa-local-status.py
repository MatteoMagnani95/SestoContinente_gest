"""Read local Supabase CLI status without shell execution or credential logging."""
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

def parse_status(text):
    values = {}
    aliases = {
        "api_url": "API_URL", "project url": "API_URL", "api url": "API_URL",
        "db_url": "DB_URL", "database url": "DB_URL", "db url": "DB_URL",
        "anon_key": "ANON_KEY", "anon key": "ANON_KEY", "anon": "ANON_KEY",
        "service_role_key": "SERVICE_ROLE_KEY", "service_role key": "SERVICE_ROLE_KEY",
        "service_role": "SERVICE_ROLE_KEY", "service role key": "SERVICE_ROLE_KEY",
        "publishable_key": "PUBLISHABLE_KEY", "publishable": "PUBLISHABLE_KEY",
        "publishable key": "PUBLISHABLE_KEY",
        "secret_key": "SECRET_KEY", "secret": "SECRET_KEY", "secret key": "SECRET_KEY",
    }

    def accept(label, raw):
        if not isinstance(raw, str):
            return
        val = raw.strip().strip("\"'")
        key = aliases.get(label.strip().rstrip(":").lower())
        # Recent CLI table format can use a generic URL label in each section.
        if key is None:
            if val.startswith(("postgresql://", "postgres://")):
                key = "DB_URL"
            elif re.fullmatch(r"https?://(?:127\.0\.0\.1|localhost):54321/?", val):
                key = "API_URL"
        if key and val:
            values[key] = val

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            for k, v in data.items():
                accept(k, v)
    except json.JSONDecodeError:
        pass
    for line in text.splitlines():
        # Strip ANSI formatting but never evaluate or source the output.
        line = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", line).strip()
        match = re.fullmatch(r"([A-Z_]+)=(.*)", line)
        if match:
            accept(*match.groups())
        elif "│" in line:
            cols = [part.strip() for part in line.split("│") if part.strip()]
            if len(cols) >= 2:
                accept(cols[0], cols[1])

    api, db = values.get("API_URL"), values.get("DB_URL")
    anon = values.get("ANON_KEY") or values.get("PUBLISHABLE_KEY")
    service = values.get("SERVICE_ROLE_KEY") or values.get("SECRET_KEY")
    if not all((api, db, anon, service)):
        raise ValueError("Credenziali locali richieste non presenti nel formato status")
    for raw, schemes, port in [(api, ("http", "https"), 54321),
                               (db, ("postgresql", "postgres"), 54322)]:
        u = urlparse(raw)
        if u.scheme not in schemes or u.hostname not in ("localhost", "127.0.0.1") or u.port != port:
            raise ValueError("Endpoint non locale o porta inattesa")
    if not all(re.fullmatch(r"[A-Za-z0-9._-]+", key) for key in (anon, service)):
        raise ValueError("Formato chiave inatteso")
    if any(c in db for c in "\r\n") or any(c in api for c in "\r\n"):
        raise ValueError("URL inatteso")
    return {"NEXT_PUBLIC_SUPABASE_URL": api.rstrip("/"),
            "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon,
            "SUPABASE_SERVICE_ROLE_KEY": service, "QA_DB_URL": db}



def self_test():
    sample = ('API_URL="http://127.0.0.1:54321"\n'
              'DB_URL="postgresql://postgres:synthetic@127.0.0.1:54322/postgres"\n'
              'ANON_KEY="synthetic.anon.key"\nSERVICE_ROLE_KEY="synthetic.service.key"\n')
    expected = parse_status(sample)
    table = ("│ Project URL │ http://127.0.0.1:54321 │\n"
             "│ URL │ postgresql://postgres:synthetic@127.0.0.1:54322/postgres │\n"
             "│ Publishable │ synthetic.anon.key │\n"
             "│ Secret │ synthetic.service.key │\n")
    assert parse_status(table) == expected
    assert parse_status(json.dumps(dict(line.split("=", 1) for line in sample.splitlines()))) == expected
    assert parse_status(sample + "\nINVALID COMMAND MUST NOT EXECUTE\n") == expected
    for invalid in [sample.replace("127.0.0.1:54321", "example.invalid:54321"),
                    sample.replace("synthetic.anon.key", "$(exit 1)"),
                    sample.replace("54322", "54323")]:
        try:
            parse_status(invalid)
        except ValueError:
            continue
        raise AssertionError("Invalid status accepted")
    print("OK parser status: env, tabella, JSON, endpoint remoto e input non valido")

if __name__ == "__main__":
    if sys.argv[1:] == ['--self-test']:
        self_test()
        raise SystemExit(0)
    if not (os.environ.get("QA_ISOLATED_ENV") == "true"
            and os.environ.get("SESTO_TEST_MODE") == "true"
            and os.environ.get("SESTO_EMAIL_MODE") == "simulate"):
        raise SystemExit("Solo QA isolato")
    status, work = map(Path, sys.argv[1:3])
    try:
        env = parse_status(status.read_text())
    except (ValueError, KeyError) as exc:
        # Never echo the status table, tokens or passwords.
        raise SystemExit("Status Supabase locale non valido: " + type(exc).__name__)
    for key in ("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "QA_DB_URL"):
        print("::add-mask::" + env[key])
    env["QA_WORK_DIR"] = str(work)
    with Path(os.environ["GITHUB_ENV"]).open("a") as out:
        for key, value in env.items():
            out.write(key + "=" + value + "\n")
    print("OK endpoint e credenziali Supabase locali acquisiti")
