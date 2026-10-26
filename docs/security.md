# DeviceSense AI — Security Architecture & Threat Model

DeviceSense AI is designed with privacy-first, zero-trust, and least-privilege principles for local Windows PC diagnostics. Because local diagnostic tools touch sensitive system performance data, security boundaries must be strictly enforced.

---

## 1. Threat Matrix & Audited Vulnerabilities

| Threat ID | Threat Category | Attack Vector | Security Measure & Mitigation | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **THREAT-01** | **DNS Rebinding** (CWE-350) | Attacker website resolves domain to `127.0.0.1` and sends HTTP requests to bypass loopback IP checks. | `validate_loopback_only` strictly verifies the HTTP `Host` header against `127.0.0.1`, `localhost`, and `::1`. Any foreign domain in `Host` is rejected with HTTP 403. | **Enforced & Tested** (`test_security.py`) |
| **THREAT-02** | **CORS Prefix Spoofing** (CWE-346 / CWE-942) | Attacker sets Origin to `http://localhost:5173.evil.com` to bypass naïve `.startswith()` prefix checks. | `validate_csrf_and_origin` parses the full URI with `urllib.parse.urlsplit` and performs exact match on scheme and `netloc`. | **Enforced & Tested** (`test_security.py`) |
| **THREAT-03** | **Cross-Site Request Forgery (CSRF)** (CWE-352) | Drive-by web script attempts mutating POST/PUT calls (e.g. dismiss alerts, trigger simulations). | Universal `@app.before_request` hook validates `Origin`/`Referer` on all state-changing methods (`POST`, `PUT`, `DELETE`, `PATCH`). | **Enforced & Tested** (`test_security.py`) |
| **THREAT-04** | **Command Injection / Protocol Hijack** (CWE-78 / CWE-88) | Arbitrary shell or protocol strings passed to Windows settings launcher. | `ActionCatalog` enforces a strict whitelist of permitted `ms-settings:` URIs. `os.system` is completely banned; uses `os.startfile` or fixed `subprocess.run(shell=False)`. | **Enforced & Tested** (`test_security.py`) |
| **THREAT-05** | **Path Traversal / Junction Escapes** (CWE-22 / CWE-59) | Symlinks or NTFS directory junctions in `%TEMP%` pointing to sensitive system files. | `ActionCatalog._clean_temp_cache` resolves `os.path.realpath`, rejects symlink targets, and verifies paths remain strictly within the user's canonical `%TEMP%`. | **Enforced & Tested** |
| **THREAT-06** | **Timing Attacks on Authentication** (CWE-208) | Attacker probes agent authorization token byte-by-byte using response latency. | `require_agent_token` decorator uses `hmac.compare_digest` for constant-time cryptographic comparison. | **Enforced & Tested** (`test_security.py`) |
| **THREAT-07** | **Secret / Credential Leakage** (CWE-200 / CWE-359) | Process monitor captures process command-line arguments exposing `--password` or API keys. | `collect_top_processes` strictly omits `cmdline` and `environ`, collecting only PID, process name, CPU%, memory%, and status. | **Enforced & Tested** |
| **THREAT-08** | **PID Spoofing / Negative Indexing** (CWE-20) | Malicious or malformed PID strings passed to process inspectors. | Regex validation ensures `1 <= PID <= 65535` and verifies process existence via `psutil.pid_exists`. | **Enforced & Tested** |
| **THREAT-09** | **Uncontrolled Mutation / Elevation** (CWE-250) | Arbitrary script attempting administrative elevation or disk formatting. | Strict 3-level action catalogue: Level 1 (Read-only), Level 2 (User-Approved Safe Fixes), Level 3 (Strictly Excluded Policy). | **Enforced & Tested** (`test_security.py`) |

---

## 2. Security Architecture Principles

### 1. Local Loopback Only
- Flask server binds exclusively to `127.0.0.1`.
- Any external request arriving from non-loopback network interfaces (`request.remote_addr != 127.0.0.1`) is blocked with HTTP 403 Forbidden.
- External internet access to the diagnostic daemon is not supported and explicitly disallowed.

### 2. High-Entropy Agent Authentication
- The backend generates a cryptographically random token (`secrets.token_hex(24)`) during initialization and stores it in Windows user-protected storage (`backend/data/.agent_token`).
- All agent metric submission requests must supply the token via the `X-Agent-Token` header.
- Token validation uses `hmac.compare_digest` to prevent timing attacks.

### 3. Universal Anti-CSRF & Origin Verification
- A common vulnerability of local HTTP services is cross-origin requests from malicious websites visited by the user.
- DeviceSense AI combines:
  - Restrictive CORS configuration (`http://localhost:5173` and `http://127.0.0.1:5173`).
  - Server-side `validate_csrf_and_origin()` checks registered globally in `@app.before_request`.
  - Requests with arbitrary origins (e.g., `https://evil-site.com`) are rejected before reaching any route handler.

### 4. Least Privilege Model
- The agent runs as the current logged-in Windows user.
- Administrator elevation is not required for core monitoring metrics.
- Inaccessible processes (e.g. system drivers, anti-malware services) throw `psutil.AccessDenied`, which the agent gracefully catches and handles without failing.

### 5. Allowlisted Actions & Excluded Commands
- Arbitrary command execution is strictly forbidden: model-generated or user-entered shell strings are never passed to `subprocess.Popen` or PowerShell.
- Only allowlisted operations are permissible:
  - **Level 1 (Informational)**:
    - `inspect_process`: Read process runtime stats, thread count, and memory allocation.
  - **Level 2 (User-Approved)**:
    - `clean_temp_cache`: Safe cleanup of user `%TEMP%` directory (symlinks unlinked safely, active/locked files preserved).
    - `open_startup_settings`: Launches `ms-settings:startupapps`.
    - `open_storage_sense`: Launches `ms-settings:storagesense`.
    - `open_battery_settings`: Launches `ms-settings:batterysaver`.
    - `flush_dns`: Fixed execution of `ipconfig /flushdns`.
    - `trim_process_working_set`: Safe Win32 API call to `EmptyWorkingSet`.
  - **Level 3 (Strictly Excluded Policy)**:
    - Registry editing (`reg.exe` or Win32 registry APIs).
    - Driver installation or removal.
    - System service termination or deletion.
    - Automatic arbitrary file deletion.
    - Uncontrolled administrator commands.

### 6. Automated Threat Remediation Engine
- `POST /api/v1/actions/correct-all`: Allows one-click mitigation of all active detected system threats.
- Takes each active diagnostic finding, captures a pre-fix baseline, executes the verified safe allowlisted remediation, measures post-fix verification metrics, and logs the outcome to the audit trail.
