"""Adjust the generated local Supabase config. Never target a hosted project."""
from pathlib import Path
import os
import re
import tomllib

assert os.environ.get("QA_ISOLATED_ENV") == "true"
assert os.environ.get("SESTO_TEST_MODE") == "true"
assert os.environ.get("SESTO_EMAIL_MODE") == "simulate"
p = Path("supabase/config.toml")
s = p.read_text()

def setting(section, key, value):
    global s
    m = re.search(r"(?m)^\[" + re.escape(section) + r"\][ \t]*$", s)
    assert m, section
    rest = s[m.end():]
    n = re.search(r"(?m)^\[", rest)
    end = m.end() + (n.start() if n else len(rest))
    old = s[m.end():end]
    new, k = re.subn(r"(?m)^" + re.escape(key) + r"\s*=.*$", lambda _: key + " = " + value, old)
    assert k <= 1
    if not k:
        new = "\n" + key + " = " + value + old
    s = s[:m.end()] + new + s[end:]

setting("auth", "site_url", '"http://127.0.0.1:3314"')
setting("auth", "additional_redirect_urls", '["http://127.0.0.1:3314/**"]')
setting("auth.email", "enable_confirmations", "true")
cfg = tomllib.loads(s)
assert not cfg["auth"]["email"].get("smtp", {}).get("enabled", False)
assert cfg["auth"]["email"]["enable_confirmations"] is True
p.write_text(s)
print("OK configurazione Auth esclusivamente locale")
