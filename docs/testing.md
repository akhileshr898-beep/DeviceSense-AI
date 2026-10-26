# DeviceSense AI — Testing & Verification Guide

Testing ensures that diagnostic findings are meaningful, action recommendations are safe, and the agent never destabilizes the host operating system.

## Test Matrix

| Suite | File | Focus | Results |
| :--- | :--- | :--- | :--- |
| **Backend Metrics** | `backend/tests/test_metrics.py` | Payload validation, agent authentication, history queries, DB persistence | 5 passed |
| **Diagnostics & Rules**| `backend/tests/test_diagnostics.py` | CPU sustained overload, memory pressure, spike filtering, alert de-duplication | 4 passed |
| **Actions & Fixes** | `backend/tests/test_actions.py` | Allowlist checking, approval workflow, verification deltas, rejection audit | 3 passed |
| **Security Controls**| `backend/tests/test_security.py` | Token enforcement, origin checking, blocking arbitrary shell commands | 4 passed |
| **Monitoring Agent** | `agent/tests/test_agent.py` | Missing battery tolerance, process access error handling, buffer retry queue | 5 passed |
| **Total Automated** | `pytest backend/tests agent/tests` | All unit & integration tests across stack | **21 passed** |

---

## Running the Automated Test Suite

### 1. Run all backend and agent tests:
```powershell
cd "C:\Users\Akhilesh Rai\.gemini\antigravity\scratch\DeviceSense-AI"
python -m pytest backend/tests agent/tests -v -W ignore
```

### 2. Run the Machine Learning Anomaly Detector Evaluation:
```powershell
python "C:\Users\Akhilesh Rai\.gemini\antigravity\scratch\DeviceSense-AI\ml\evaluate_detector.py"
```
**Expected Output:**
```text
Total Test Samples: 1250 (Normal: 1000, Anomaly: 250)
Precision:          0.8562 (85.6%)
Recall:             1.0000 (100.0%)
False Positive Rate:0.0420 (4.2%)
Overall Accuracy:   0.9700 (97.0%)
```

### 3. Run the React Frontend Production Build:
```powershell
cd "C:\Users\Akhilesh Rai\.gemini\antigravity\scratch\DeviceSense-AI\frontend"
npm run build
```

---

## Simulated Diagnostic Scenarios

DeviceSense AI includes built-in scenario generators designed for repeatable demonstrations without harming the host system:

1. **Sustained CPU Overload**:
   - Injects samples with 94%+ CPU load.
   - Evaluates whether `sustained_cpu` alert triggers with `inspect_process` recommendation.
2. **High Memory Pressure**:
   - Injects samples with 93.8% RAM utilization and $< 1\text{ GB}$ available memory.
   - Evaluates whether `memory_pressure` triggers with `trim_process_working_set` and startup review recommendations.
3. **Storage Warning**:
   - Injects samples with $6.2\text{ GB}$ free disk space.
   - Evaluates whether `storage_warning` triggers with `clean_temp_cache` and `open_storage_sense` recommendations.
4. **Network Degradation**:
   - Injects samples with $285\text{ ms}$ latency and $8.5\%$ packet loss.
   - Evaluates whether `network_latency` triggers with `flush_dns` recommendation.
5. **Brief CPU Spike**:
   - Injects a single $95\%$ CPU sample surrounded by normal samples.
   - Verifies that no persistent critical alert is triggered.

