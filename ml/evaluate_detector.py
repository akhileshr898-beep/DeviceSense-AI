from pathlib import Path
import numpy as np
import joblib
from sklearn.metrics import classification_report, confusion_matrix

ARTIFACT_DIR = Path(__file__).resolve().parent / "model_artifacts"
MODEL_PATH = ARTIFACT_DIR / "isolation_forest.joblib"


def generate_evaluation_sets(n_normal=1000, n_anomaly=250):
    """
    Generates labelled held-out test data for both normal and known abnormal conditions:
    Label: 0 = Normal, 1 = Anomaly
    """
    np.random.seed(99)

    # Normal distribution
    norm_cpu_mean = np.random.normal(loc=20.0, scale=10.0, size=n_normal).clip(2.0, 55.0)
    norm_cpu_max = (norm_cpu_mean + np.random.exponential(scale=8.0, size=n_normal)).clip(5.0, 75.0)
    norm_mem = np.random.normal(loc=58.0, scale=10.0, size=n_normal).clip(25.0, 78.0)
    norm_disk = np.random.exponential(scale=3.0, size=n_normal).clip(0.01, 25.0)
    norm_net = np.random.exponential(scale=2.0, size=n_normal).clip(0.01, 20.0)
    norm_lat = np.random.normal(loc=30.0, scale=8.0, size=n_normal).clip(8.0, 70.0)
    norm_procs = np.random.normal(loc=125, scale=20, size=n_normal).clip(50, 200)

    X_normal = np.column_stack([
        norm_cpu_mean, norm_cpu_max, norm_mem, norm_disk, norm_net, norm_lat, norm_procs
    ])
    y_normal = np.zeros(n_normal, dtype=int)

    # Anomaly cases:
    # 1. Sustained CPU overload
    anom_cpu_mean = np.random.uniform(90.0, 99.0, size=n_anomaly)
    anom_cpu_max = np.random.uniform(95.0, 100.0, size=n_anomaly)
    anom_mem = np.random.uniform(91.0, 98.0, size=n_anomaly)
    anom_disk = np.random.uniform(40.0, 120.0, size=n_anomaly)
    anom_net = np.random.uniform(30.0, 80.0, size=n_anomaly)
    anom_lat = np.random.uniform(180.0, 500.0, size=n_anomaly)
    anom_procs = np.random.uniform(250.0, 400.0, size=n_anomaly)

    X_anomaly = np.column_stack([
        anom_cpu_mean, anom_cpu_max, anom_mem, anom_disk, anom_net, anom_lat, anom_procs
    ])
    y_anomaly = np.ones(n_anomaly, dtype=int)

    X = np.vstack([X_normal, X_anomaly])
    y = np.concatenate([y_normal, y_anomaly])
    return X, y


def evaluate():
    if not MODEL_PATH.exists():
        print(f"Model {MODEL_PATH} not found. Running training first...")
        from train_detector import train_and_save
        model = train_and_save()
    else:
        model = joblib.load(MODEL_PATH)

    X_test, y_true = generate_evaluation_sets()

    # IsolationForest outputs -1 for anomaly, 1 for normal
    preds_raw = model.predict(X_test)
    y_pred = np.where(preds_raw == -1, 1, 0)

    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    tpr_recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0

    print("==================================================")
    print(" DeviceSense AI - Anomaly Detector Evaluation")
    print("==================================================")
    print(f" Total Test Samples: {len(y_true)} (Normal: {tn+fp}, Anomaly: {tp+fn})")
    print(f" True Positives (Detected Anomalies): {tp}")
    print(f" False Positives (False Alarms):      {fp}")
    print(f" True Negatives:                     {tn}")
    print(f" False Negatives:                    {fn}")
    print("--------------------------------------------------")
    print(f" Precision:          {precision:.4f} ({precision*100:.1f}%)")
    print(f" Recall:             {tpr_recall:.4f} ({tpr_recall*100:.1f}%)")
    print(f" False Positive Rate:{fpr:.4f} ({fpr*100:.1f}%)")
    print("==================================================")
    print(classification_report(y_true, y_pred, target_names=["Normal", "Anomaly"]))

    return {
        "precision": precision,
        "recall": tpr_recall,
        "fpr": fpr,
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}
    }


if __name__ == "__main__":
    evaluate()
