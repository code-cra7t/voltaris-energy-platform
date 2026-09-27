from pathlib import Path
import json
root = Path(__file__).resolve().parents[1]
seed = (root / "database/seed.sql").read_text() + "\n" + (root / "database/sandbox_overlay.sql").read_text()
(root / "packages/core/src/sandbox-fixture.ts").write_text("// Generated from database/seed.sql and database/sandbox_overlay.sql.\n// Regenerate with scripts/generate-sandbox-fixture.py after changing either file.\nexport const SANDBOX_SEED_SQL = " + json.dumps(seed) + ";\n")
