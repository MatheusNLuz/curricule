"""Validate standalone packages and retain only deployment-owned backups."""
import re
import shutil
import sys
import tarfile
from pathlib import Path, PurePosixPath

MAX_UNPACKED_BYTES = 2 * 1024 * 1024 * 1024
MAX_MEMBERS = 100_000


def extract_release(archive_path, destination, expected_sha, version):
    if not re.fullmatch(r"[0-9a-f]{40}", expected_sha) or not re.fullmatch(r"v\d+\.\d+\.\d+", version):
        raise ValueError("Invalid release identity")
    target = Path(destination).resolve()
    if not target.is_dir():
        raise ValueError("Staging directory does not exist")
    with tarfile.open(archive_path, "r:gz") as archive:
        members = archive.getmembers()
        if len(members) > MAX_MEMBERS or sum(item.size for item in members) > MAX_UNPACKED_BYTES:
            raise ValueError("Package exceeds extraction budget")
        for item in members:
            path = PurePosixPath(item.name)
            if path.is_absolute() or ".." in path.parts or any(ord(c) < 32 for c in item.name):
                raise ValueError("Unsafe archive path")
            if path.parts and (path.parts[0] == ".git" or path.parts[0] == ".env" or path.parts[0].startswith(".env.")):
                raise ValueError("Environment or repository data in package")
            if not (item.isfile() or item.isdir() or item.issym() or item.islnk()):
                raise ValueError("Unsupported archive member")
            tarfile.data_filter(item, str(target))
        archive.extractall(target, members=members, filter="data")
    for name, expected in [("RELEASE_COMMIT", expected_sha), ("RELEASE_VERSION", version)]:
        manifest = target / name
        if manifest.is_symlink() or manifest.read_text().strip() != expected:
            raise ValueError("Release manifest mismatch")
    if (target / "server.js").is_symlink() or not (target / "server.js").is_file():
        raise ValueError("Missing standalone entrypoint")


def prune_backups(directory, keep=3):
    root = Path(directory).resolve()
    candidates = sorted((path for path in root.iterdir()
                         if re.fullmatch(r"backup-\d{14}-[0-9a-f]{12}-\d+", path.name)
                         and not path.is_symlink() and path.is_dir()
                         and (path / "DEPLOY_BACKUP").is_file()
                         and not (path / "DEPLOY_BACKUP").is_symlink()), reverse=True)
    for path in candidates[keep:]:
        if path.resolve().parent != root:
            raise ValueError("Backup outside deployment directory")
        shutil.rmtree(path)


if __name__ == "__main__":
    if len(sys.argv) == 6 and sys.argv[1] == "extract":
        extract_release(*sys.argv[2:])
    elif len(sys.argv) == 3 and sys.argv[1] == "prune":
        prune_backups(sys.argv[2])
    else:
        raise SystemExit("Usage: release_archive.py extract ARCHIVE STAGE SHA VERSION | prune BACKUPS")
