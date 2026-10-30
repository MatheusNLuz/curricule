import io
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from release_archive import extract_release, prune_backups

SHA = "a" * 40
VERSION = "v0.1.42"


class ReleaseArchiveTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.archive = self.root / "release.tgz"
        self.target = self.root / "stage"
        self.target.mkdir()

    def tearDown(self):
        self.temp.cleanup()

    def package(self, extra=None, sha=SHA, version=VERSION):
        with tarfile.open(self.archive, "w:gz") as archive:
            for name, text in [("./server.js", "// synthetic"), ("./RELEASE_COMMIT", sha + "\n"), ("./RELEASE_VERSION", version + "\n")]:
                item = tarfile.TarInfo(name)
                data = text.encode()
                item.size = len(data)
                item.mode = 0o644
                archive.addfile(item, io.BytesIO(data))
            if extra:
                item, data = extra
                archive.addfile(item, io.BytesIO(data) if data else None)

    def test_valid_release_preserves_manifest_and_internal_symlink(self):
        link = tarfile.TarInfo("./server-link.js")
        link.type = tarfile.SYMTYPE
        link.linkname = "server.js"
        self.package((link, b""))
        extract_release(self.archive, self.target, SHA, VERSION)
        self.assertEqual((self.target / "RELEASE_COMMIT").read_text().strip(), SHA)
        self.assertEqual((self.target / "server-link.js").read_text(), "// synthetic")

    def test_parent_and_absolute_paths_are_rejected(self):
        for name in ["../escape", "/tmp/curricule-escape-test", "a/../../escape"]:
            with self.subTest(name=name):
                item = tarfile.TarInfo(name)
                item.size = 1
                self.package((item, b"x"))
                with self.assertRaises(ValueError):
                    extract_release(self.archive, self.target, SHA, VERSION)
                self.assertFalse((self.root / "escape").exists())

    def test_links_outside_release_are_rejected(self):
        for kind in [tarfile.SYMTYPE, tarfile.LNKTYPE]:
            item = tarfile.TarInfo("./unsafe")
            item.type = kind
            item.linkname = "../../outside"
            self.package((item, b""))
            with self.assertRaises((ValueError, tarfile.FilterError)):
                extract_release(self.archive, self.target, SHA, VERSION)

    def test_environment_git_and_device_members_are_rejected(self):
        for name in ["./.env", "./.env.production", "./.git/config"]:
            item = tarfile.TarInfo(name)
            item.size = 1
            self.package((item, b"x"))
            with self.assertRaises(ValueError):
                extract_release(self.archive, self.target, SHA, VERSION)
        device = tarfile.TarInfo("./device")
        device.type = tarfile.CHRTYPE
        self.package((device, b""))
        with self.assertRaises(ValueError):
            extract_release(self.archive, self.target, SHA, VERSION)

    def test_manifest_mismatch_is_rejected(self):
        for sha, version in [("b" * 40, VERSION), (SHA, "v0.1.41")]:
            self.package(sha=sha, version=version)
            with self.assertRaises(ValueError):
                extract_release(self.archive, self.target, SHA, VERSION)

    def test_invalid_commit_or_version_is_rejected(self):
        self.package()
        for sha, version in [("master", VERSION), (SHA, "../../bad"), (SHA, "v0.1.1;id")]:
            with self.assertRaises(ValueError):
                extract_release(self.archive, self.target, sha, version)

    def test_retention_removes_only_owned_backups(self):
        backups = self.root / "backups"
        backups.mkdir()
        owned = []
        for index in range(5):
            path = backups / f"backup-2026103012000{index}-aaaaaaaaaaaa-123"
            path.mkdir()
            (path / "DEPLOY_BACKUP").write_text(SHA)
            owned.append(path)
        manual = backups / "manual-backup"
        manual.mkdir()
        outside = self.root / "outside"
        outside.mkdir()
        (backups / "backup-20261030110000-aaaaaaaaaaaa-456").symlink_to(outside, target_is_directory=True)
        prune_backups(backups, 3)
        self.assertTrue(manual.is_dir())
        self.assertTrue(outside.is_dir())
        self.assertFalse(owned[0].exists())
        self.assertFalse(owned[1].exists())
        self.assertTrue(all(path.is_dir() for path in owned[2:]))


if __name__ == "__main__":
    unittest.main()
