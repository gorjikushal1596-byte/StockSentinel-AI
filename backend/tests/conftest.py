"""Pytest configuration ensuring isolated test database and sys.path setup."""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
project_root = backend_dir.parent
test_db = project_root / "test_stocksentinel.db"

# Direct all test runs to an isolated test database so production/demo database is never polluted
os.environ["DATABASE_URL"] = f"sqlite:///{test_db.as_posix()}"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
