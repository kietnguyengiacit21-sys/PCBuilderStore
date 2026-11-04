import { useEffect, useState } from "react";
import { fetchApiHealth } from "./api";
import type { ApiHealth } from "./api";

type HealthState =
  | { status: "loading" }
  | { status: "connected"; data: ApiHealth }
  | { status: "unavailable"; message: string };

export default function HealthPage() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    void fetchApiHealth(controller.signal).then(
      (data) => setHealth({ status: "connected", data }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setHealth({
            status: "unavailable",
            message:
              error instanceof Error ? error.message : "The API health check failed.",
          });
        }
      },
    );
    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Trạng thái API</h1>
      {health.status === "loading" && <p role="status">Đang kiểm tra API…</p>}
      {health.status === "connected" && (
        <section className="rounded border border-green-500 p-4" role="status">
          <p>API đang hoạt động.</p>
          <p>Dịch vụ: {health.data.service}</p>
          <p>Thời điểm kiểm tra: {health.data.timestamp}</p>
        </section>
      )}
      {health.status === "unavailable" && (
        <section className="rounded border border-red-500 p-4" role="alert">
          <p>Không thể kết nối API.</p>
          <p>{health.message}</p>
        </section>
      )}
      <a className="mt-6 inline-block text-primary underline" href="/customer/home">
        Quay lại trang chủ
      </a>
    </main>
  );
}
