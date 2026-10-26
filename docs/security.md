# DeviceSense AI — Security Architecture & Threat Model

DeviceSense AI is designed with privacy-first and least-privilege principles for local Windows PC diagnostics. Because local diagnostic tools touch sensitive system performance data, security boundaries must be strictly enforced.

## Security Principles

### 1. Local Loopback Only
- Flask server binds exclusively to `127.0.0.1`.
- Any external request arriving from non-loopback network interfaces (`request.remote_addr != 127.0.0.1`) is blocked with HTTP 403 Forbidden.
- External internet access to the diagnostic daemon is not supported and explicitly disallowed.

### 2. High-Entropy Agent Authentication
- The backend generates a cryptographically random token (`secrets.token_hex(24)`) during initialization and stores it in Windows user-protected storage (`backend/data/.agent_token`).
- All agent metric submission requests must supply the token via the `X-Agent-Token` header.
- Token validation uses `hmac.compare_digest` to prevent timing attacks.

### 3. Browser Protection & Anti-CSRF
- A common vulnerability of local HTTP services is cross-origin requests from malicious websites visited by the user.
- DeviceSense AI combines:
  - Restrictive CORS configuration (`http://localhost:5173` and `http://127.0.0.1:5173`).
  - Server-side `validate_csrf_and_origin()` checks for state-changing endpoints (`POST`, `PUT`, `DELETE`).
  - Requests with arbitrary origins (e.g., `https://evil-site.com`) are rejected before reaching action execution logic.

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
    - `clean_temp_cache`: Safe cleanup of user `%TEMP%` directory (files currently open or locked are skipped).
    - `open_startup_settings`: Launches `ms-settings:startupapps`.
    - `open_storage_sense`: Launches `ms-settings:storagesense`.
    - `open_battery_settings`: Launches `ms-settings:batterysaver`.
    - `flush_dns`: Fixed execution of `ipconfig /flushdns`.
    - `trim_process_working_set`: Safe Win32 API call to `EmptyWorkingSet`.
  - **Level 3 (Strictly Excluded)**:
    - Registry editing (`reg.exe` or Win32 registry APIs).
    - Driver installation or removal.
    - System service termination or deletion.
    - Automatic arbitrary file deletion.
    - Uncontrolled administrator commands.

### 6. Data Minimization & Privacy
- DeviceSense AI does not capture:
  - Keystrokes or input events.
  - Browser history, cache contents, or visited URLs.
  - File contents, personal documents, or passwords.
  - Command-line arguments of processes that might expose secrets.
- Raw metric samples are retained for 7 days by default and stored locally in SQLite (`devicesense.db`). No telemetry leaves the local machine.
