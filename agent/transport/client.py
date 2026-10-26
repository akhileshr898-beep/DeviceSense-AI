import time
from collections import deque
import requests


class TransportClient:
    """
    Submits authenticated metric batches to the DeviceSense Flask backend.
    Buffers metrics locally during brief network/server outages and retries with backoff.
    """

    def __init__(self, api_url: str, token: str, max_buffer_size: int = 120):
        self.api_url = api_url
        self.token = token
        self.buffer = deque(maxlen=max_buffer_size)
        self.backoff_sec = 1.0
        self.max_backoff_sec = 20.0
        self.consecutive_failures = 0

    def queue_sample(self, sample: dict):
        self.buffer.append(sample)

    def flush(self, device_metadata: dict, session_id: str) -> bool:
        """
        Attempts to submit all queued samples. Returns True if successful.
        """
        if not self.buffer:
            return True

        samples_to_send = list(self.buffer)
        payload = {
            "device": device_metadata,
            "session_id": session_id,
            "samples": samples_to_send,
        }

        headers = {
            "Content-Type": "application/json",
            "X-Agent-Token": self.token,
        }

        try:
            resp = requests.post(self.api_url, json=payload, headers=headers, timeout=5.0)
            if resp.status_code in (200, 201):
                # Successfully submitted: clear the sent samples
                for _ in range(len(samples_to_send)):
                    if self.buffer:
                        self.buffer.popleft()

                self.consecutive_failures = 0
                self.backoff_sec = 1.0
                return True
            else:
                self._handle_failure(f"HTTP {resp.status_code}: {resp.text[:100]}")
                return False
        except requests.exceptions.RequestException as e:
            self._handle_failure(f"Network/Server unreachable: {str(e)}")
            return False

    def _handle_failure(self, reason: str):
        self.consecutive_failures += 1
        print(f"[Agent Transport] Batch delivery failed ({reason}). Queued samples: {len(self.buffer)}. Backoff: {self.backoff_sec:.1f}s")
        time.sleep(self.backoff_sec)
        self.backoff_sec = min(self.backoff_sec * 1.5, self.max_backoff_sec)

