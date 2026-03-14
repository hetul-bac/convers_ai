"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DeliveryPoint = {
  date: string;
  sms: number;
  whatsapp: number;
  rcs: number;
  telegram: number;
  viber: number;
};

type ChannelTotal = {
  channel: string;
  sent: number;
};

type DashboardChartsProps = {
  deliveryData: DeliveryPoint[];
  channelData: ChannelTotal[];
};

const channelColors = {
  sms: "#38bdf8",
  whatsapp: "#34d399",
  rcs: "#f59e0b",
  telegram: "#60a5fa",
  viber: "#c084fc",
};

export function DashboardCharts({
  deliveryData,
  channelData,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,1fr)]">
      <section className="surface-panel p-5">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
            Delivery Rate
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Last 30 Days By Channel
          </h2>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={deliveryData}>
              <CartesianGrid stroke="#e2edf8" />
              <XAxis dataKey="date" stroke="#7b8da5" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                stroke="#7b8da5"
                tick={{ fontSize: 12 }}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #dbe7f5",
                  borderRadius: "18px",
                  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.08)",
                }}
                formatter={(value) => {
                  const numericValue =
                    typeof value === "number" ? value : Number(value ?? 0);

                  return [`${numericValue.toFixed(1)}%`, "Rate"];
                }}
                labelStyle={{ color: "#0f172a" }}
              />
              <Legend />
              <Line dataKey="sms" dot={false} stroke={channelColors.sms} strokeWidth={2.5} />
              <Line
                dataKey="whatsapp"
                dot={false}
                stroke={channelColors.whatsapp}
                strokeWidth={2.5}
              />
              <Line dataKey="rcs" dot={false} stroke={channelColors.rcs} strokeWidth={2.5} />
              <Line
                dataKey="telegram"
                dot={false}
                stroke={channelColors.telegram}
                strokeWidth={2.5}
              />
              <Line
                dataKey="viber"
                dot={false}
                stroke={channelColors.viber}
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="surface-panel p-5">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
            Channel Mix
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Messages By Channel
          </h2>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={channelData}>
              <CartesianGrid stroke="#e2edf8" vertical={false} />
              <XAxis dataKey="channel" stroke="#7b8da5" tick={{ fontSize: 12 }} />
              <YAxis stroke="#7b8da5" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #dbe7f5",
                  borderRadius: "18px",
                  boxShadow: "0 14px 28px rgba(15, 23, 42, 0.08)",
                }}
                cursor={{ fill: "rgba(49, 130, 206, 0.08)" }}
              />
              <Bar dataKey="sent" fill="#3182ce" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
