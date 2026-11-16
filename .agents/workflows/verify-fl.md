---
description: Run focused validation for changes in fl/ (Flower app and API callback services)
---

# Verify `fl/`

Run from `fl/`. Sources use Python 3.12 generic syntax (e.g. `def f[T](...)`), so use a Python >= 3.12 interpreter from the intended environment. In some shells `python` does not exist; check `python3 --version` first.

1. Check interpreter and installed dependencies.
   // turbo
   ```sh
   python3 --version
   ```

2. Run the unit tests.
   // turbo
   ```sh
   python3 -m unittest discover -s tests -v
   ```

3. Syntax-check changed modules without executing training.
   // turbo
   ```sh
   python3 -m compileall -q src sklearnexample tests
   ```

4. If run-config keys, payloads, or hashes changed, confirm the matching consumers (see the `api-contract-change` and `flower-callbacks` skills): `server/src/modules/training-jobs/training-jobs.worker.ts`, API DTOs, `server/infrastructure/docker-compose.*.yml`.

5. Do **not** run `flwr run` or start containers for validation unless the user asks and the SuperLink, API, database, and datasets are configured. Report that end-to-end training was not verified.

If dependencies (`flwr`, `scikit-learn`) are missing, report it as a blocker rather than installing into an unknown environment.
