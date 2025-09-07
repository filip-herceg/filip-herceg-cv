Ephemeral SQLite fixtures live here.

- tmp/: test-created sqlite files; ignored by git via root rules (e.g. *.sqlite, *.db-wal, *.db-shm)
- Committed fixtures (if ever needed) should have a clear name and a short note in this README.
- Tests must not rely on repo-root sqlite paths anymore.
