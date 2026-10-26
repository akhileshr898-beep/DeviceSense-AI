import React, { useState, useEffect, useCallback } from "react";
import { Search, Eye } from "lucide-react";
import { api } from "../services/api";

export default function ProcessInvestigator({ onInspectProcess }) {
  const [processes, setProcesses] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("cpu_percent");
  const [loading, setLoading] = useState(true);

  const loadProcesses = useCallback(async () => {
    try {
      const data = await api.getProcesses(sortBy);
      setProcesses(data.processes || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    let interval;
    const run = async () => {
      await loadProcesses();
      interval = setInterval(loadProcesses, 5000);
    };
    run();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadProcesses]);

  const filtered = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      String(p.pid).includes(search)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700 }}>Process Resource Investigator</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Non-intrusive live sampling of top CPU & Memory consumers (sampled every 5 seconds).
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-dim)" }} />
            <input
              type="text"
              placeholder="Search by name or PID..."
              style={{ paddingLeft: 34, width: 220 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="cpu_percent">Sort by CPU %</option>
            <option value="memory_percent">Sort by Memory %</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 80 }}>PID</th>
              <th>Process Name</th>
              <th style={{ width: 140 }}>CPU Utilization</th>
              <th style={{ width: 160 }}>Memory (RSS / %)</th>
              <th style={{ width: 110 }}>State</th>
              <th style={{ width: 100, textAlign: "right" }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {loading && processes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  Sampling active processes from local agent...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-dim)" }}>
                  No matching processes found.
                </td>
              </tr>
            ) : (
              filtered.map((proc) => {
                const memMb = proc.memory_rss_bytes
                  ? (proc.memory_rss_bytes / (1024 * 1024)).toFixed(1)
                  : "0";
                const isHeavyCpu = proc.cpu_percent > 30;
                const isHeavyMem = proc.memory_percent > 20;

                return (
                  <tr key={proc.pid}>
                    <td style={{ fontFamily: "monospace", color: "var(--text-dim)" }}>
                      {proc.pid}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{proc.name}</span>
                        {(isHeavyCpu || isHeavyMem) && (
                          <span className="badge badge-warning" style={{ fontSize: 9 }}>
                            Heavy
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 50, fontWeight: 600 }}>{proc.cpu_percent}%</div>
                        <div className="progress-bar-bg" style={{ width: 70, height: 4, margin: 0 }}>
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(proc.cpu_percent, 100)}%`,
                              backgroundColor: isHeavyCpu ? "var(--accent-red)" : "var(--accent-blue)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 65, fontSize: 13 }}>
                          {memMb} MB
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          ({proc.memory_percent}%)
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{proc.status}</span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() =>
                          onInspectProcess &&
                          onInspectProcess({
                            id: `rec_inspect_${proc.pid}`,
                            action_type: "inspect_process",
                            title: `Inspect Process: ${proc.name} (PID ${proc.pid})`,
                            description: `Query thread count, runtime privileges, and memory bounds for PID ${proc.pid}.`,
                            risk_level: "level_1_informational",
                            target_resource: `PID ${proc.pid}: ${proc.name}`,
                            expected_benefit: "Review detailed resource behavior without stopping the program.",
                            undo_guidance: "No system modification; read-only inspection."
                          })
                        }
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

