# DeviceSense AI — Diagnostics & Machine Learning Engine

DeviceSense AI pairs deterministic rule-based analysis with machine learning anomaly detection to separate temporary spikes from genuine performance bottlenecks.

## Diagnostic Workflow

```mermaid
flowchart TD
    M[Agent Raw Metrics Batch] --> FE[Rolling Window Feature Extractor]
    FE --> ML[IsolationForest Detector]
    M --> RULE[Persistent-Threshold Rule Engine]
    
    ML --> SCORE[Anomaly Score & Pattern Flag]
    RULE --> DIAG[Diagnostic Findings Generator]
    
    SCORE & DIAG --> MERGE[Evidence Synthesizer & Cause Ranking]
    MERGE --> CARD[Structured Diagnostic Findings]
    CARD --> REC[Safe Recommended Actions]
```

## 1. Machine Learning Anomaly Detection

### Feature Vector Formulation
The ML detector extracts 7 rolling-window features for each incoming sample:
1. `cpu_mean`: Average CPU utilization over the rolling observation window (last 5 samples).
2. `cpu_max`: Peak CPU spike observed in the window.
3. `memory_percent`: Current physical RAM usage percentage.
4. `disk_io_mbps`: Aggregate disk throughput ($\text{Read} + \text{Write}$ in $MB/s$).
5. `net_io_mbps`: Aggregate network throughput ($\text{Sent} + \text{Received}$ in $MB/s$).
6. `net_latency_ms`: Round-trip TCP connect latency to DNS gateway (in $ms$).
7. `process_count`: Total active processes registered in the current sampling cycle.

### IsolationForest Model
- Algorithm: `sklearn.ensemble.IsolationForest`
- Contamination parameter: `0.03` (calibrated on baseline healthy usage)
- Trees: 150 estimators
- Normalization: Raw decision scores are transformed via sigmoid scaling into a probability-style index ($0.0 \to 1.0$), where values above $0.70$ represent significant behavioral deviation.

### Evaluation Results on Held-out Set
Evaluated across 1,250 test cycles (1,000 normal, 250 anomalies):
- **Precision**: 85.6%
- **Recall**: 100.0%
- **False Positive Rate (FPR)**: 4.2%
- **Overall Accuracy**: 97.0%

---

## 2. Deterministic Diagnostic Rules

Rule-based checks enforce persistence constraints so that brief, normal bursts do not trigger false alerts:

| Diagnostic Case | Threshold Condition | Persistence Requirement | Hypotheses & Evidence |
| :--- | :--- | :--- | :--- |
| **Sustained CPU Overload** | CPU $\ge 88.0\%$ | $\ge 3$ consecutive samples ($\sim 6\text{s}$) | Identifies highest CPU consumer PID; estimates run-away loop or heavy batch job. |
| **High Memory Pressure** | RAM $\ge 88.0\%$ and Available $< 1.5\text{ GB}$ | $\ge 3$ consecutive samples | Checks active process working sets; flags memory bloat or insufficient physical RAM. |
| **Storage Warning** | Free Space $< 10\text{ GB}$ or Usage $\ge 92\%$ | Immediate upon detection | Computes volume percent; highlights user temp buildup and storage exhaustion risk. |
| **Network Degradation** | Latency $> 160\text{ ms}$ or Packet Loss $\ge 5\%$ | Immediate upon probe | Flags local Wi-Fi congestion, bad routing, or DNS resolver cache staleness. |
| **Battery Drain** | Battery $\le 20\%$ and Unplugged | Immediate upon battery check | Warns about critical depletion and recommends Battery Saver mode. |

---

## 3. Verification Engine Lifecycle

Every approved action undergoes formal before-and-after verification:
1. **Pre-Action Baseline Window**: Captures rolling average of the target metric (e.g., RAM %, Disk Free MB, Latency ms) over recent samples.
2. **Action Execution**: Triggers allowlisted operation with structured outcome payload.
3. **Post-Action Observation Window**: Collects new measurements under comparable conditions.
4. **Delta Classification**:
   - `improved`: Metric delta shifted in the desired direction beyond the minimum threshold.
   - `unchanged`: Metric delta remained within noise margin ($\pm 1.0$).
   - `worsened`: Metric delta worsened.
   - `inconclusive`: Fluctuations in unrelated background tasks rendered measurement ambiguous.
5. **Transparency Rule**: Short-term improvements are explicitly distinguished from permanent fixes in the generated audit record.
