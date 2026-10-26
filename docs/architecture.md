# DeviceSense AI — System Architecture

DeviceSense AI is an evidence-based, local-first Windows PC diagnostic platform. It operates completely on the local loopback interface (`127.0.0.1`) without requiring paid APIs, external cloud connectivity, or intrusive privileges.

## Component Architecture

```mermaid
flowchart TD
    subgraph Agent["Local Python Monitoring Agent (psutil)"]
        CPU[CPU & RAM Collector]
        DISK[Disk I/O & Space Collector]
        NET[Network Rates & Latency]
        PROC[Process Iteration]
        BAT[Battery Sensors]
        BUF[Retry Queue & Buffer]
    end

    subgraph Backend["Flask Local Backend (127.0.0.1:5000)"]
        AUTH[Agent Authentication & Origin Guard]
        METRIC_ROUTE[Metrics Batch & History Ingestion]
        ML_ENG[IsolationForest Anomaly Detector]
        RULE_ENG[Deterministic Rule Engine]
        DB[(SQLite devicesense.db)]
        ACTION_CAT[Safe Action Catalogue]
        VERIF_ENG[Verification Engine]
    end

    subgraph Frontend["React 19 + Vite Dashboard (127.0.0.1:5173)"]
        OVERVIEW[Overview & Health Score]
        LIVE[Real-time Telemetry Charts]
        PROCS[Process Investigator]
        DIAG[Diagnostic Cards & Evidence]
        ACTIONS[Action Approval Modal]
        VERIF[Before / After Verification]
        REPORTS[Technician Export]
        SIM[Simulation Controls]
    end

    CPU & DISK & NET & PROC & BAT --> BUF
    BUF -- "POST /api/v1/metrics/batch (X-Agent-Token)" --> AUTH
    AUTH --> METRIC_ROUTE --> DB
    METRIC_ROUTE --> ML_ENG & RULE_ENG
    ML_ENG & RULE_ENG --> DB
    ACTION_CAT --> VERIF_ENG --> DB
    Frontend <== "REST API / 127.0.0.1" ==> Backend
```

## Core Components

### 1. Local Python Monitoring Agent (`agent/`)
- Runs as a standard, non-administrator user process.
- Gathers hardware and operating system telemetry using `psutil`.
- Sampling intervals:
  - CPU, RAM, Disk I/O throughput, Network throughput: 2 seconds.
  - Process resource ranking: 5 seconds.
  - Disk capacity & battery sensors: 30 seconds.
  - TCP connect latency to DNS gateway: 15 seconds.
- Computes throughput rates ($MB/s$ or $KB/s$) from the difference between cumulative counters divided by elapsed delta time ($dt$).
- In-memory ring buffer (up to 120 samples) queues data during server outages with exponential backoff.
- Catches and ignores `AccessDenied` errors for system-protected processes without crashing.

### 2. Flask API & Application Logic (`backend/`)
- Strictly bound to `127.0.0.1` (never exposed to `0.0.0.0`).
- Validates all incoming agent submissions with high-entropy HMAC tokens.
- Restricts browser origins to local development endpoints (`http://localhost:5173`).
- Orchestrates the diagnostic loop:
  1. Ingestion of raw samples.
  2. Rolling-window multi-dimensional ML anomaly scoring.
  3. Persistent-threshold rule evaluation.
  4. Generation of structured findings with confidence and action links.
  5. User authorization and verification measurement.

### 3. Database Layer (`backend/app/models/database.py`)
- SQLite persistence using SQLAlchemy ORM.
- Tables:
  - `device`: Device metadata (hostname, OS version, CPU cores, RAM).
  - `monitoring_session`: Tracks monitoring sessions and execution status.
  - `metric_sample`: Time-series telemetry (CPU, RAM, disk, network, latency, processes, anomaly score).
  - `diagnostic`: Active, resolved, and dismissed findings with evidence and root-cause hypotheses.
  - `recommendation`: Allowlisted safe corrective actions.
  - `action_event`: Audit log of approved and rejected operations.
  - `verification`: Pre-vs-post metric comparisons and outcome classifications.

### 4. React + Vite Dashboard (`frontend/`)
- Built with React, Vite, and Recharts.
- Features:
  - Real-time telemetry graphs for CPU, RAM, Disk I/O, Network, and Latency.
  - Process investigator with search and CPU/RAM sorting.
  - Diagnostic cards with calibrated confidence meters and evidence breakdowns.
  - Fix assistant with explicit authorization modals.
  - Verification cards detailing measured improvement or regression.
  - Exportable diagnostic audit reports in JSON and Markdown.
