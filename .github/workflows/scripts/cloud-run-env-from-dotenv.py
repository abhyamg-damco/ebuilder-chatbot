#!/usr/bin/env python3
"""
Reads a dotenv-style file and writes a YAML file suitable for
`gcloud run deploy --env-vars-file`. Skips blank lines, comments, and PORT.

Using a YAML file avoids `gcloud --set-env-vars` comma-splitting when values
contain commas (which produces invalid env entries with no name).
"""

from __future__ import annotations

import sys


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: cloud-run-env-from-dotenv.py <input.env> <output.yaml>", file=sys.stderr)
        return 2

    path, out_path = sys.argv[1], sys.argv[2]
    lines: list[str] = []

    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for raw in f:
            line = raw.rstrip("\n\r")
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if not key or not value:
                continue
            if key == "PORT":
                continue
            esc = (
                value.replace("\\", "\\\\")
                .replace('"', '\\"')
                .replace("\n", "\\n")
                .replace("\r", "\\r")
            )
            lines.append(f'{key}: "{esc}"')

    with open(out_path, "w", encoding="utf-8") as out:
        out.write("\n".join(lines))
        if lines:
            out.write("\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())