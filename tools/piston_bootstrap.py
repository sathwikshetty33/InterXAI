#!/usr/bin/env python3
"""
One-shot Piston runtime installer, run automatically by the piston_bootstrap
service in docker-compose.yml every time the stack starts.

Piston ships with zero language runtimes installed — a fresh piston_data
volume answers GET /api/v2/runtimes with []. Every language the DSA code
editor offers 400s at /sessions/{id}/dsa/run|test|submit until its runtime is
installed via POST /api/v2/packages. This script waits for Piston to come up,
then installs whatever from PACKAGES is still missing (already-installed ones
are skipped, so re-running on every `docker compose up` is a fast no-op).

Keep PACKAGES in sync with:
  - frontend/src/features/interview/components/DsaPanel.tsx (LANGUAGES)
  - backend/app/utils/piston_client.py (LANGUAGE_ALIASES)
Versions below are pinned to what's been verified to install cleanly and
resolve to the right Piston language name (see the comment per entry).
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

PISTON_URL = os.environ.get("PISTON_URL", "http://piston:2000")

# (piston package name, version) -> registers these LANGUAGE_ALIASES targets:
PACKAGES = [
    ("python", "3.12.0"),  # -> "python"
    ("gcc", "10.2.0"),  # -> "c", "c++" (also d, fortran as a bonus)
    ("java", "15.0.2"),  # -> "java"
    ("node", "20.11.1"),  # -> "javascript"
    ("typescript", "5.0.3"),  # -> "typescript"
    ("go", "1.16.2"),  # -> "go"
    ("bash", "5.2.0"),  # -> "bash"
    ("mono", "6.12.0"),  # -> "csharp"
]

WAIT_TIMEOUT_S = 180
INSTALL_TIMEOUT_S = 600


def request(method: str, path: str, body: dict | None = None, timeout: int = 30) -> object:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"{PISTON_URL}{path}",
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if data else {},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def wait_for_piston() -> None:
    print(f"Waiting for Piston at {PISTON_URL}...")
    deadline = time.time() + WAIT_TIMEOUT_S
    while time.time() < deadline:
        try:
            request("GET", "/api/v2/runtimes")
            return
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            time.sleep(2)
    raise RuntimeError(f"Piston did not become reachable at {PISTON_URL} within {WAIT_TIMEOUT_S}s")


def main() -> None:
    wait_for_piston()

    # /api/v2/packages is keyed by (package language, package version) — the
    # exact identity we install by — and carries its own authoritative
    # "installed" flag. /api/v2/runtimes instead lists the RUNTIME language
    # names a package registers (e.g. installing "gcc" registers "c"/"c++",
    # installing "node" registers "javascript", installing "mono" registers
    # "csharp"/"basic") — a different namespace that doesn't line up with our
    # package names for gcc/node/mono, so checking against it here would
    # think those three are missing even once installed, and Piston 500s on
    # a repeat install of an already-installed package.
    installed = {
        (p["language"], p["language_version"])
        for p in request("GET", "/api/v2/packages")
        if p.get("installed")
    }
    failures: list[str] = []

    for language, version in PACKAGES:
        if (language, version) in installed:
            print(f"{language} {version} already installed, skipping")
            continue
        print(f"Installing {language} {version}...")
        try:
            request(
                "POST",
                "/api/v2/packages",
                {"language": language, "version": version},
                timeout=INSTALL_TIMEOUT_S,
            )
            print(f"  {language} {version} installed")
        except (urllib.error.HTTPError, TimeoutError) as e:
            # Non-fatal: one bad/slow package shouldn't block the rest.
            print(f"  FAILED to install {language} {version}: {e}", file=sys.stderr)
            failures.append(language)

    if failures:
        print(f"Piston runtime setup finished with failures: {failures}", file=sys.stderr)
        sys.exit(1)
    print("Piston runtime setup complete.")


if __name__ == "__main__":
    main()
