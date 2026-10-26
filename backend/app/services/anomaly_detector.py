import os
from pathlib import Path
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest

MODEL_DIR = Path(__file__).resolve().parent.parent.parent.parent / "ml" / "model_artifacts"
MODEL_PATH = MODEL_DIR / "isolation_forest.joblib"


class AnomalyDetector:
    """
    ML Anomaly Detector using Isolation Forest on rolling window multi-metric features.
    Features:
    [cpu_mean, cpu_max, memory_percent, disk_io_mbps, net_io_mbps, net_latency_ms, process_count]
    """

    def __init__(self):
        self.model = None
        self.feature_names = [
            "cpu_mean",
            "cpu_max",
            "memory_percent",
            "disk_io_mbps",
            "net_io_mbps",
            "net_latency_ms",
            "process_count",
        ]
        self._load_or_initialize()

    def _load_or_initialize(self):
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        if MODEL_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
                return
            except Exception as e:
                print(f"[AnomalyDetector] Failed to load saved model: {e}. Reinitializing.")

        # Train a calibrated baseline model
        self.train_baseline()

    def train_baseline(self, num_samples=1000):
        """
        Trains IsolationForest on calibrated synthetic baseline normal operating conditions.
        """
        np.random.seed(42)
        # Normal CPU: mean 8-28%, max 15-45%
        cpu_mean = np.random.normal(loc=18.0, scale=8.0, size=num_samples).clip(2.0, 50.0)
        cpu_max = (cpu_mean + np.random.uniform(5.0, 20.0, size=num_samples)).clip(5.0, 75.0)
        # Normal Memory: 35-75%
        memory_percent = np.random.normal(loc=55.0, scale=12.0, size=num_samples).clip(20.0, 78.0)
        # Normal Disk I/O: 0.1 - 15 MB/s
        disk_io_mbps = np.random.exponential(scale=3.5, size=num_samples).clip(0.05, 30.0)
        # Normal Network I/O: 0.05 - 10 MB/s
        net_io_mbps = np.random.exponential(scale=2.0, size=num_samples).clip(0.01, 20.0)
        # Normal Latency: 15 - 50 ms
        net_latency = np.random.normal(loc=30.0, scale=10.0, size=num_samples).clip(5.0, 80.0)
        # Normal process count: 80 - 180
        process_count = np.random.normal(loc=120, scale=25, size=num_samples).clip(40, 220)

        X_train = np.column_stack([
            cpu_mean, cpu_max, memory_percent, disk_io_mbps, net_io_mbps, net_latency, process_count
        ])

        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.03,  # 3% expected anomaly rate on clean data
            random_state=42
        )
        self.model.fit(X_train)

        try:
            joblib.dump(self.model, MODEL_PATH)
        except Exception as e:
            print(f"[AnomalyDetector] Warning: Could not save model artifact: {e}")

    def extract_features(self, sample, recent_samples=None):
        """
        Extracts feature vector from current sample and rolling window.
        """
        recent = recent_samples or [sample]
        cpu_history = [s.get("cpu_percent", 0.0) for s in recent]
        cpu_mean = float(np.mean(cpu_history))
        cpu_max = float(np.max(cpu_history))
        mem = float(sample.get("memory_percent", 0.0))

        # Convert I/O bytes to MB/s
        disk_read = sample.get("disk_read_bytes_sec", 0.0)
        disk_write = sample.get("disk_write_bytes_sec", 0.0)
        disk_io_mbps = (disk_read + disk_write) / (1024 * 1024)

        net_sent = sample.get("net_bytes_sent_sec", 0.0)
        net_recv = sample.get("net_bytes_recv_sec", 0.0)
        net_io_mbps = (net_sent + net_recv) / (1024 * 1024)

        latency = float(sample.get("net_latency_ms", 25.0))
        top_procs = sample.get("top_processes", [])
        proc_count = len(top_procs) if top_procs else 100

        features = np.array([[
            cpu_mean, cpu_max, mem, disk_io_mbps, net_io_mbps, latency, proc_count
        ]], dtype=np.float32)

        return features

    def score_sample(self, sample, recent_samples=None):
        """
        Returns anomaly_score (0.0 to 1.0, higher is more anomalous) and is_anomaly (bool).
        """
        if self.model is None:
            self._load_or_initialize()

        features = self.extract_features(sample, recent_samples)

        # decision_function: lower means more anomalous (negative values are outliers)
        raw_score = self.model.decision_function(features)[0]
        prediction = self.model.predict(features)[0]  # -1 for anomaly, 1 for normal

        # Normalize score into a friendly 0.0 - 1.0 confidence index
        # raw_score typically falls in [-0.5, 0.5]
        normalized_score = float(1.0 / (1.0 + np.exp(raw_score * 8.0)))
        is_anomaly = bool(prediction == -1 or normalized_score >= 0.70)

        return normalized_score, is_anomaly


# Singleton instance
anomaly_detector = AnomalyDetector()

