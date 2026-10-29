#!/usr/bin/env python3
"""
StockSentinel AI — Official Release Packaging & Verification Script
Prepares the clean, judge-ready, self-contained ZIP distribution for
TalentAP Mega Hackathon 2026.

Rules:
- Standard library only (zipfile, hashlib, os, pathlib, shutil, sys).
- Strict exclusion of .git, node_modules, .venv, *.db, caches, and local secrets.
- Verification of checksums and self-contained clean-room test.
"""

import os
import sys
import shutil
import zipfile
import hashlib
import tempfile
import subprocess
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent
RELEASE_DIR = ROOT_DIR / "release"
ZIP_NAME = "StockSentinel_AI_TalentAP2026.zip"
ZIP_PATH = RELEASE_DIR / ZIP_NAME

# Exclusion rules
EXCLUDE_DIRS = {
    ".git",
    "node_modules",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "dist-ssr",
    "build",
    "release",
    ".idea",
    ".vscode",
    ".system_generated",
}

EXCLUDE_FILES = {
    ".env",
    ".DS_Store",
    "Thumbs.db",
    "stocksentinel.db",
    "test_stocksentinel.db",
    "stocksentinel.db-wal",
    "stocksentinel.db-shm",
}

EXCLUDE_EXTENSIONS = {
    ".pyc",
    ".pyo",
    ".pyd",
    ".db",
    ".db-wal",
    ".db-shm",
    ".log",
}


def should_include(rel_path: Path) -> bool:
    """Evaluates whether a relative path should be included in the release ZIP."""
    parts = rel_path.parts
    # Exclude any path that touches an excluded directory
    for part in parts:
        if part in EXCLUDE_DIRS:
            return False

    name = rel_path.name
    if name in EXCLUDE_FILES:
        return False

    # Never include real .env files (keep .env.example)
    if name.startswith(".env") and not name.endswith(".example"):
        return False

    if rel_path.suffix.lower() in EXCLUDE_EXTENSIONS:
        return False

    return True


def create_release_zip() -> tuple[Path, str, int, int]:
    """Creates the sanitized release ZIP archive and returns (path, sha256, file_count, total_bytes)."""
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()

    file_count = 0
    total_uncompressed = 0

    print(f"[*] Packaging project from {ROOT_DIR} into {ZIP_PATH}...")
    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # Prune excluded directories in-place for speed
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                abs_path = Path(root) / file
                rel_path = abs_path.relative_to(ROOT_DIR)

                if should_include(rel_path):
                    zipf.write(abs_path, arcname=str(rel_path).replace("\\", "/"))
                    file_count += 1
                    total_uncompressed += abs_path.stat().st_size

    # Compute SHA256
    hasher = hashlib.sha256()
    with open(ZIP_PATH, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    sha256_hash = hasher.hexdigest()

    return ZIP_PATH, sha256_hash, file_count, total_uncompressed


def verify_clean_room(zip_path: Path) -> bool:
    """Extracts ZIP into an isolated temp directory and executes evaluate.py to verify self-containment."""
    print("\n[*] Starting Clean-Room Verification...")
    temp_dir = Path(tempfile.mkdtemp(prefix="stocksentinel_cleanroom_"))
    try:
        print(f"[*] Extracting {zip_path.name} to {temp_dir}...")
        with zipfile.ZipFile(zip_path, "r") as zipf:
            zipf.extractall(temp_dir)

        # 1. Check critical files exist
        critical_files = [
            "package.json",
            "vite.config.ts",
            "index.html",
            "evaluate.py",
            "backend/app/main.py",
            "backend/requirements.txt",
            "backend/.env.example",
            "data/daily_sales_inventory.csv",
            "data/ground_truth_labels_EVALUATION_ONLY.csv",
            "data/testing_datasets/01_case_phantom_stockout.csv",
            "PROJECT_STATUS.md",
            "REQUIREMENTS_AUDIT.md",
            "README.md",
        ]

        missing = [f for f in critical_files if not (temp_dir / f).exists()]
        if missing:
            print(f"[-] Clean-room check FAILED: Missing critical files: {missing}")
            return False
        print(f"[+] All {len(critical_files)} critical files confirmed in archive.")

        # 2. Check no excluded files leaked
        leaked = []
        for root, _, files in os.walk(temp_dir):
            for file in files:
                rel = (Path(root) / file).relative_to(temp_dir)
                if not should_include(rel):
                    leaked.append(str(rel))

        if leaked:
            print(f"[-] Clean-room check FAILED: Leaked excluded files: {leaked[:5]}...")
            return False
        print("[+] Zero leaked artifacts, databases, or local .env files.")

        # 3. Run evaluate.py in clean-room directory
        print("[*] Running 'python evaluate.py' in clean-room environment...")
        eval_script = temp_dir / "evaluate.py"
        res = subprocess.run(
            [sys.executable, str(eval_script)],
            cwd=str(temp_dir),
            capture_output=True,
            text=True,
        )

        if res.returncode != 0:
            print("[-] evaluate.py FAILED in clean-room test:")
            print(res.stderr)
            return False

        if "Mean Precision@20" in res.stdout and "Overall Recall" in res.stdout:
            print("[+] evaluate.py PASSED in clean-room test! Output verified:")
            for line in res.stdout.strip().splitlines()[-15:]:
                print(f"    {line}")
        else:
            print(f"[-] Unexpected output from evaluate.py:\n{res.stdout}")
            return False

        return True

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"[*] Clean-room directory purged.")


def main():
    print("=" * 70)
    print(" StockSentinel AI — TalentAP Mega Hackathon 2026 Release Packaging")
    print("=" * 70)

    zip_path, sha256, count, uncompressed = create_release_zip()
    compressed = zip_path.stat().st_size

    print(f"\n[+] Archive created successfully: {zip_path.name}")
    print(f"    Location       : {zip_path}")
    print(f"    Total files    : {count}")
    print(f"    Uncompressed   : {uncompressed / (1024 * 1024):.2f} MB")
    print(f"    Compressed     : {compressed / (1024 * 1024):.2f} MB")
    print(f"    SHA256 Checksum: {sha256}")

    # Clean-room verification
    success = verify_clean_room(zip_path)
    if success:
        print("\n" + "=" * 70)
        print(" [SUCCESS] RELEASE PACKAGING & CLEAN-ROOM VERIFICATION 100% PASSED")
        print(f" Checksum (SHA256): {sha256}")
        print("=" * 70)
        sys.exit(0)
    else:
        print("\n" + "=" * 70)
        print(" [FAILURE] Clean-room verification failed. Please inspect issues above.")
        print("=" * 70)
        sys.exit(1)


if __name__ == "__main__":
    main()
