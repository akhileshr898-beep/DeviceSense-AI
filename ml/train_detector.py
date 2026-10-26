import os
from pathlib import Path
import numpy as np
import joblib
from sklearn.ensemble import IsolationForest

ARTIFACT_DIR = Path(__file__).resolve().parent / "model_artifacts"
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
MODEL_OUT = ARTIFACT_DIR / "isolation_forest.joblib"


def generate_synthetic_dataset(n_samples=2500):
    """
    Generates representative synthetic training data representing healthy normal PC activity.
    """
    np.random.seed(42)

    # Normal CPU: idle to moderate (5% to 55%)
    cpu_mean = np.random.normal(loc=20.0, scale=10.0, size=n_samples).clip(2.0, 55.0)
    cpu_max = (cpu_mean + np.random.exponential(scale=8.0, size=n_samples)).clip(5.0, 80.0)

    # Normal RAM: 40% to 75%
    memory_pct = np.random.normal(loc=58.0, scale=10.0, size=n_samples).clip(25.0, 78.0)

    # Normal Disk I/O: 0.1 to 15 MB/s
    disk_io = np.random.exponential(scale=3.0, size=n_samples).clip(0.01, 25.0)

    # Normal Network I/O: 0.05 to 10 MB/s
    net_io = np.random.exponential(scale=2.0, size=n_samples).clip(0.01, 20.0)

    # Normal Latency: 15 to 45 ms
    net_latency = np.random.normal(loc=30.0, scale=8.0, size=n_samples).clip(8.0, 70.0)

    # Normal process count: 70 to 180
    process_count = np.random.normal(loc=125, scale=20, size=n_samples).clip(50, 200)

    X = np.column_stack([
        cpu_mean,
        cpu_max,
        memory_pct,
        disk_io,
        net_io,
        net_latency,
        process_count
    ])
    return X


def train_and_save():
    print("[ML] Generating synthetic training set for healthy baseline...")
    X_train = generate_synthetic_dataset(3000)

    print("[ML] Fitting IsolationForest model...")
    model = IsolationForest(
        n_estimators=150,
        contamination=0.03,
        max_samples="auto",
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train)

    joblib.dump(model, MODEL_OUT)
    print(f"[ML] Successfully saved trained IsolationForest model to: {MODEL_OUT}")
    return model


if __name__ == "__main__":
    train_and_save()
