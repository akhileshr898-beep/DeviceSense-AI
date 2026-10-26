import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function LiveCharts({ samples = [] }) {
  const chartData = samples.map((s) => {
    const timeStr = s.timestamp ? s.timestamp.substring(11, 19) : "";
    return {
      time: timeStr,
      cpu: s.cpu_percent,
      memory: s.memory_percent,
      disk_read_mb: (s.disk_read_bytes_sec / (1024 * 1024)).toFixed(2),
      disk_write_mb: (s.disk_write_bytes_sec / (1024 * 1024)).toFixed(2),
      net_in_kb: (s.net_bytes_recv_sec / 1024).toFixed(1),
      net_out_kb: (s.net_bytes_sent_sec / 1024).toFixed(1),
      latency: s.net_latency_ms,
      anomaly_score: (s.anomaly_score * 100).toFixed(1),
    };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* CPU and RAM Area Chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Real-time CPU & RAM Utilization (%)</span>
          <span className="card-subtext">Last {samples.length} cycles (2s intervals)</span>
        </div>
        <div style={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#23314d" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#162033",
                  border: "1px solid #23314d",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU Utilization"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#cpuGrad)"
              />
              <Area
                type="monotone"
                dataKey="memory"
                name="RAM Utilization"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#memGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Disk and Network Throughput */}
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Disk Activity (MB/s)</span>
          </div>
          <div style={{ height: 220, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23314d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" MB" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#162033",
                    border: "1px solid #23314d",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend verticalAlign="top" height={30} />
                <Line
                  type="monotone"
                  dataKey="disk_read_mb"
                  name="Read Rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="disk_write_mb"
                  name="Write Rate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Network Throughput (KB/s) & Latency</span>
          </div>
          <div style={{ height: 220, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23314d" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#162033",
                    border: "1px solid #23314d",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend verticalAlign="top" height={30} />
                <Line
                  type="monotone"
                  dataKey="net_in_kb"
                  name="Inbound (KB/s)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  name="Latency (ms)"
                  stroke="#ec4899"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
