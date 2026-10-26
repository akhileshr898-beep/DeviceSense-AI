const API_BASE = "http://127.0.0.1:5000/api/v1";

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `API error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`Request to ${endpoint} failed:`, err);
    throw err;
  }
}

export const api = {
  checkHealth: () => request("/health"),
  getStorage: () => request("/storage"),
  getLatestMetrics: () => request("/metrics/latest"),
  getMetricHistory: (limit = 60, minutes = 15) =>
    request(`/metrics/history?limit=${limit}&minutes=${minutes}`),
  getProcesses: (sortBy = "cpu_percent") =>
    request(`/processes?sort_by=${sortBy}`),
  getDiagnostics: (status = "all") =>
    request(`/diagnostics?status=${status}`),
  getDiagnosticDetail: (diagId) =>
    request(`/diagnostics/${diagId}`),
  dismissDiagnostic: (diagId) =>
    request(`/diagnostics/${diagId}/dismiss`, { method: "POST" }),
  approveAction: (actionId) =>
    request(`/actions/${actionId}/approve`, { method: "POST" }),
  rejectAction: (actionId, reason = "User rejected") =>
    request(`/actions/${actionId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  getActionVerification: (actionId) =>
    request(`/actions/${actionId}/verification`),
  getActionHistory: () => request("/actions/history"),
  getActionCatalog: () => request("/actions/catalog"),
  getSecurityStatus: () => request("/security/status"),
  correctAllThreats: () =>
    request("/actions/correct-all", {
      method: "POST",
    }),
  getTechnicianReport: () => request("/reports"),
  triggerSimulation: (scenario = "cpu_overload", count = 3) =>
    request("/simulate", {
      method: "POST",
      body: JSON.stringify({ scenario, count }),
    }),
};

