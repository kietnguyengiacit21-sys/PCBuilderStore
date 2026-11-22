import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { money } from "../money";
import {
  BUILD_SLOTS,
  KEY_SPECS,
  RESOLUTIONS,
  RESOLUTION_LABEL,
  TASK_HEADLINE,
  WORKLOAD_GROUPS,
  analyzeBuild,
  benchmarkBuild,
  slotOptions,
  whatIfRows,
  workloadBench,
} from "./build-planner";
import type {
  Benchmark,
  BuildParts,
  BuildRequest,
  BuildSlot,
  PlannerCatalog,
  PlannerProduct,
  Priority,
  Resolution,
  UseCase,
  WhatIfRow,
  WorkloadGroup,
  WorkloadMetric,
} from "./build-planner";
import { CompatibilityAndCart } from "./BuilderCheckout";
import type { Listing } from "./BuilderCheckout";
import { useCatalogAttributeDefinitions } from "./catalog-metadata";
import { attributeLabel, findAttributeDefinition, formatSpecificationValue } from "./product-information";
import { PrimaryButton, SecondaryButton } from "./components";

const SLOT_NAME: Record<BuildSlot, string> = {
  CPU: "CPU", MOTHERBOARD: "Mainboard", RAM: "RAM", GPU: "VGA", STORAGE: "SSD", PSU: "PSU", CASE: "Case", COOLER: "Tản nhiệt",
};
const PROFILE_LABEL: Record<UseCase, string> = {
  gaming: "Chơi game", streaming: "Game + livestream", creator: "Dựng video, đồ họa", ai: "Lập trình, AI", office: "Văn phòng, học tập",
};
const WORKLOAD_ICON: Record<WorkloadGroup, string> = { video: "🎬", ai: "🤖", dev: "💻" };
/**
 * The AI card has about as many rows as the other two together, so it gets a column of
 * its own and the video and developer cards stack in the other; the more relevant column
 * comes first.
 */
const WORKLOAD_LAYOUT: Record<UseCase, { aiFirst: boolean; stack: WorkloadGroup[] }> = {
  gaming: { aiFirst: false, stack: ["video", "dev"] },
  streaming: { aiFirst: false, stack: ["video", "dev"] },
  creator: { aiFirst: false, stack: ["video", "dev"] },
  ai: { aiFirst: true, stack: ["dev", "video"] },
  office: { aiFirst: false, stack: ["dev", "video"] },
};
const PRIORITY_LABEL: Record<Priority, string> = { performance: "Hiệu năng", balanced: "Cân bằng", quiet: "Mát / êm" };
type SortKey = "perf" | "task" | "value" | "price";

const pct = (value: number | undefined, digits = 0) => value === undefined ? "—"
  : `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
const signedMoney = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${money(Math.abs(value), "VND")}`;
const round = (value: number | undefined) => value === undefined ? undefined : Math.round(value * 10) / 10;

interface Metric {
  label: string;
  read: (bench: Benchmark) => number | undefined;
  format: (value: number, bench: Benchmark) => string;
  /** true when a larger number is better. */
  higher: boolean;
}

const METRICS: Metric[] = [
  { label: "CPU · chơi game", read: (b) => b.cpuGaming, format: (v) => `${Math.round(v)}/100`, higher: true },
  { label: "CPU · đa nhân", read: (b) => b.cpuMulti, format: (v) => `${Math.round(v)}/100`, higher: true },
  { label: "VGA · raster", read: (b) => b.gpuIndex, format: (v) => `${Math.round(v)}/100`, higher: true },
  { label: "VRAM", read: (b) => b.vram, format: (v) => `${v} GB`, higher: true },
  { label: "RAM", read: (b) => b.ramGb, format: (v, b) => `${v} GB${b.ramRate ? ` · ${b.ramRate} MT/s` : ""}`, higher: true },
  { label: "SSD đọc tuần tự", read: (b) => b.storageRead, format: (v) => `${v.toLocaleString("vi-VN")} MB/s`, higher: true },
  { label: "Điện năng tải nặng", read: (b) => b.power, format: (v) => `~${v} W`, higher: false },
  { label: "Tải nguồn", read: (b) => b.psuLoad === undefined ? undefined : b.psuLoad * 100, format: (v, b) => `${Math.round(v)}% của ${b.psuWattage} W`, higher: false },
  { label: "Dư tản nhiệt", read: (b) => b.coolingHeadroom, format: (v) => `×${v.toFixed(2)}`, higher: true },
  { label: "Điểm theo mục đích", read: (b) => b.useCaseScore, format: (v) => v.toFixed(1), higher: true },
  { label: "Tổng giá", read: (b) => b.total, format: (v) => money(v, "VND"), higher: false },
];

function Delta({ now, before, higher, money: isMoney }: { now?: number; before?: number; higher: boolean; money?: boolean }) {
  if (now === undefined || before === undefined || Math.abs(now - before) < 1e-6) return null;
  const better = higher ? now > before : now < before;
  const text = isMoney ? signedMoney(now - before) : before === 0 ? `${now > before ? "+" : ""}${round(now - before)}` : pct((now / before - 1) * 100, 1);
  return <span className={`v2-expert-delta ${better ? "is-better" : "is-worse"}`}>{text}</span>;
}

/** Change of one workload metric, including tasks that start or stop being possible. */
function WorkDelta({ now, before }: { now: WorkloadMetric; before?: WorkloadMetric }) {
  if (!before) return null;
  if ((now.value === undefined) !== (before.value === undefined)) {
    return now.value !== undefined
      ? <span className="v2-expert-delta is-better">giờ chạy được</span>
      : <span className="v2-expert-delta is-worse">không còn chạy được</span>;
  }
  return <Delta now={now.value} before={before.value} higher={now.higher} />;
}

export function ExpertBuilder({ catalog, byCode, suggestedParts, profile }: {
  catalog: PlannerCatalog;
  byCode: Map<string, Listing>;
  /** The advisor's current build; loaded on mount and again via "Nạp cấu hình đề xuất". */
  suggestedParts: BuildParts;
  /** The advisor's answers, used only as the lab's starting settings. */
  profile: Pick<BuildRequest, "useCase" | "resolution" | "priority">;
}) {
  const { definitions } = useCatalogAttributeDefinitions();
  const [parts, setParts] = useState<BuildParts>(suggestedParts);
  const [useCase, setUseCase] = useState<UseCase>(profile.useCase);
  const [resolution, setResolution] = useState<Resolution>(profile.resolution);
  const [priority, setPriority] = useState<Priority>(profile.priority);
  const [baseline, setBaseline] = useState<BuildParts>();
  const [slot, setSlot] = useState<BuildSlot>("GPU");
  const [sort, setSort] = useState<SortKey>("perf");
  const [showBlocked, setShowBlocked] = useState(false);
  const [selected, setSelected] = useState<string>();

  const request = useMemo<BuildRequest>(() => ({
    useCase, resolution, priority, platform: "any", budget: Number.MAX_SAFE_INTEGER,
  }), [priority, resolution, useCase]);
  const analysis = useMemo(() => analyzeBuild(parts, catalog, request), [catalog, parts, request]);
  const bench = useMemo(() => benchmarkBuild(parts, catalog, request), [catalog, parts, request]);
  const baseBench = useMemo(() => baseline ? benchmarkBuild(baseline, catalog, request) : undefined, [baseline, catalog, request]);
  const work = useMemo(() => workloadBench(parts, catalog), [catalog, parts]);
  const baseWork = useMemo(() => baseline ? workloadBench(baseline, catalog) : undefined, [baseline, catalog]);
  const headline = TASK_HEADLINE[useCase];
  const gamingHeadline = useCase === "gaming" || useCase === "streaming";
  const rows = useMemo(() => whatIfRows(slot, parts, catalog, request), [catalog, parts, request, slot]);
  // "task" has no meaning for purposes without a headline task (office).
  const activeSort: SortKey = headline || sort !== "task" ? sort : "perf";
  const visibleRows = useMemo(() => {
    const rank = (row: WhatIfRow) => row.status === "current" ? 0 : row.status === "blocked" ? 2 : 1;
    return rows.filter((row) => showBlocked || row.status !== "blocked").sort((left, right) => {
      if (rank(left) !== rank(right)) return rank(left) - rank(right);
      if (activeSort === "price") return left.priceDelta - right.priceDelta;
      if (activeSort === "task") return (right.taskDelta ?? -Infinity) - (left.taskDelta ?? -Infinity) || left.priceDelta - right.priceDelta;
      if (activeSort === "value") return (right.valuePerMillion ?? -Infinity) - (left.valuePerMillion ?? -Infinity) || right.perfDelta - left.perfDelta;
      return right.perfDelta - left.perfDelta || left.priceDelta - right.priceDelta;
    });
  }, [activeSort, rows, showBlocked]);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const selectedRow = rows.find((row) => row.product.modelCode === selected && row.status !== "current");
  const selectedBench = useMemo(() => selectedRow?.parts ? benchmarkBuild(selectedRow.parts, catalog, request) : undefined,
    [catalog, request, selectedRow]);
  const selectedWork = useMemo(() => selectedRow?.parts ? workloadBench(selectedRow.parts, catalog) : undefined,
    [catalog, selectedRow]);
  const changedWork = selectedWork?.filter((metric) => {
    const before = work.find((item) => item.key === metric.key);
    return !before || before.text !== metric.text;
  }) ?? [];

  const spec = (product: PlannerProduct, code: string) =>
    formatSpecificationValue(product.specifications[code], findAttributeDefinition(definitions, product.productType, code));
  const label = (product: PlannerProduct, code: string) => attributeLabel(definitions, product.productType, code);

  return <div className="v2-expert">
    <div className="v2-expert-toolbar">
      <label>Mục đích sử dụng
        <select className="v2-form-input" value={useCase} onChange={(event) => setUseCase(event.target.value as UseCase)}>
          {Object.entries(PROFILE_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      </label>
      <div className="v2-expert-segment" role="group" aria-label="Độ phân giải tham chiếu">
        <span>Độ phân giải tham chiếu</span>
        <div>{RESOLUTIONS.map((value) => <button type="button" key={value} className={resolution === value ? "is-active" : undefined}
          aria-pressed={resolution === value} onClick={() => setResolution(value)}>{RESOLUTION_LABEL[value]}</button>)}</div>
      </div>
      <label>Ưu tiên
        <select className="v2-form-input" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
          {Object.entries(PRIORITY_LABEL).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
        </select>
      </label>
      <div className="v2-expert-actions">
        <SecondaryButton type="button" onClick={() => { setParts(suggestedParts); setSelected(undefined); }}>Nạp cấu hình đề xuất</SecondaryButton>
        {baseline
          ? <SecondaryButton type="button" onClick={() => setBaseline(undefined)}>Bỏ mốc so sánh</SecondaryButton>
          : <PrimaryButton type="button" disabled={!parts.CPU} onClick={() => setBaseline(parts)}>📌 Ghim làm mốc</PrimaryButton>}
      </div>
    </div>
    {baseline && <p className="v2-expert-baseline">📌 Đang so với mốc đã ghim ({money(baseBench?.total ?? 0, "VND")}). Mọi Δ bên dưới là chênh lệch của cấu hình hiện tại so với mốc.</p>}

    <div className="v2-expert-grid">
      <section className="v2-expert-panel v2-expert-sheet" aria-label="Cấu hình">
        <header><h2>Cấu hình</h2><button type="button" className="v2-advisor-link" onClick={() => setParts({})}>Xóa hết</button></header>
        {BUILD_SLOTS.map((part) => {
          const options = slotOptions(part, parts, catalog, request);
          const chosen = parts[part];
          return <div className={`v2-expert-sheet-row${slot === part ? " is-focus" : ""}`} key={part}>
            <button type="button" className="v2-expert-slot-tag" onClick={() => { setSlot(part); setSelected(undefined); }}
              title="Phân tích what-if cho nhóm này">{SLOT_NAME[part]}</button>
            <select className="v2-form-input" value={chosen?.modelCode ?? ""} aria-label={SLOT_NAME[part]} onChange={(event) => {
              const next = { ...parts };
              const product = options.find((option) => option.product.modelCode === event.target.value)?.product;
              if (product) next[part] = product; else delete next[part];
              setParts(next);
              setSelected(undefined);
            }}>
              <option value="">{part === "GPU" ? "— Không dùng VGA rời —" : "— Chưa chọn —"}</option>
              {options.map(({ product, problems }) => <option key={product.modelCode} value={product.modelCode} disabled={problems.length > 0}>
                {product.productName} · {money(product.price, "VND")}{problems.length ? ` ✗ ${problems[0]}` : ""}
              </option>)}
            </select>
            <b>{chosen ? money(chosen.price, "VND") : "—"}</b>
          </div>;
        })}
        <div className="v2-expert-sheet-total"><span>Tổng</span><b>{money(analysis.total, "VND")}</b></div>
        {analysis.issues.length > 0 && <ul className="v2-expert-issues">{analysis.issues.map((issue) => <li key={issue}>✗ {issue}</li>)}</ul>}
      </section>

      <section className="v2-expert-panel" aria-label="Benchmark">
        <header><h2>Benchmark cấu hình</h2><small>Chỉ số tương đối tham khảo · {PROFILE_LABEL[useCase]}</small></header>
        <div className="v2-expert-metrics">
          {METRICS.map((metric) => {
            const value = metric.read(bench);
            return <div key={metric.label}>
              <small>{metric.label}</small>
              <b>{value === undefined ? "—" : metric.format(value, bench)}</b>
              {baseBench && <Delta now={value} before={metric.read(baseBench)} higher={metric.higher} money={metric.label === "Tổng giá"} />}
            </div>;
          })}
        </div>
        {Object.keys(bench.balance).length > 0 && <div className="v2-expert-balance">
          <h3>Cân bằng CPU ↔ VGA</h3>
          {RESOLUTIONS.map((res) => {
            const balance = bench.balance[res];
            if (!balance) return null;
            return <div key={res} className="v2-expert-balance-row">
              <span>{RESOLUTION_LABEL[res]}</span>
              <em className={`is-${balance.kind}`}>{balance.kind === "cpu" ? "Nghẽn CPU" : balance.kind === "gpu" ? "Giới hạn VGA" : "Cân bằng"}</em>
              <Bar label="VGA dùng" value={balance.gpuUtilization} />
              <Bar label="CPU dùng" value={balance.cpuUtilization} />
            </div>;
          })}
        </div>}
        <FpsMatrix bench={bench} base={baseBench} />
      </section>
    </div>

    {work.length > 0 && <section className="v2-expert-panel" aria-label="Hiệu năng công việc">
      <header>
        <h2>Hiệu năng công việc</h2>
        <small>Ước tính tham khảo từ thông số linh kiện, không phải kết quả đo trên máy thật</small>
      </header>
      <div className={`v2-expert-work${WORKLOAD_LAYOUT[useCase].aiFirst ? " is-ai-first" : ""}`}>
        <WorkloadCard group="ai" metrics={work} base={baseWork} />
        <div className="v2-expert-work-stack">
          {WORKLOAD_LAYOUT[useCase].stack.map((group) => <WorkloadCard key={group} group={group} metrics={work} base={baseWork} />)}
        </div>
      </div>
    </section>}

    <section className="v2-expert-panel v2-expert-whatif" aria-label="So sánh khi đổi linh kiện">
      <header>
        <h2>What-if: đổi linh kiện</h2>
        <small>Δ tính trên toàn bộ cấu hình, kể cả linh kiện phải đổi kèm để giữ tương thích</small>
      </header>
      <div className="v2-expert-tabs" role="tablist" aria-label="Nhóm linh kiện">
        {BUILD_SLOTS.map((part) => <button type="button" role="tab" key={part} aria-selected={slot === part}
          className={slot === part ? "is-active" : undefined} onClick={() => { setSlot(part); setSelected(undefined); }}>{SLOT_NAME[part]}</button>)}
      </div>
      <div className="v2-expert-table-tools">
        <label>Sắp xếp
          <select className="v2-form-input" value={activeSort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="perf">Δ hiệu năng cao nhất</option>
            {headline && <option value="task">{headline} cao nhất</option>}
            <option value="value">Hiệu năng / triệu đồng</option>
            <option value="price">Giá thấp → cao</option>
          </select>
        </label>
        <label className="v2-expert-check"><input type="checkbox" checked={showBlocked} onChange={(event) => setShowBlocked(event.target.checked)} />
          Hiện cả lựa chọn không lắp được ({blockedCount})</label>
      </div>
      <div className="v2-expert-table-wrap">
        <table className="v2-expert-table">
          <thead><tr>
            <th>{SLOT_NAME[slot]}</th><th>Thông số chính</th><th>Giá</th><th>Δ tổng giá</th>
            <th>Δ hiệu năng</th>
            {headline && <th>{headline}{gamingHeadline ? ` ${RESOLUTION_LABEL[resolution]}` : ""}</th>}
            <th>%/triệu</th><th>Tương thích</th>
          </tr></thead>
          <tbody>{visibleRows.map((row) => <tr key={row.product.modelCode}
            className={`is-${row.status}${selected === row.product.modelCode ? " is-selected" : ""}`}
            onClick={() => row.status !== "current" && setSelected(row.product.modelCode)}>
            <td><strong>{row.product.productName}</strong></td>
            <td className="v2-expert-mono">{row.metric}</td>
            <td className="v2-expert-num">{money(row.product.price, "VND")}</td>
            <td className={`v2-expert-num ${row.priceDelta > 0 ? "is-worse" : row.priceDelta < 0 ? "is-better" : ""}`}>{row.status === "current" ? "—" : signedMoney(row.priceDelta)}</td>
            <td className={`v2-expert-num ${row.perfDelta > 0.5 ? "is-better" : row.perfDelta < -0.5 ? "is-worse" : ""}`}>{row.status === "current" ? "—" : row.status === "blocked" ? "" : pct(row.perfDelta, 1)}</td>
            {headline && <td className={`v2-expert-num ${(row.taskDelta ?? 0) > 0.5 ? "is-better" : (row.taskDelta ?? 0) < -0.5 ? "is-worse" : ""}`}>
              {row.status === "current" || row.status === "blocked" ? "" : row.taskDelta === undefined ? "—" : pct(row.taskDelta, 1)}
              {gamingHeadline && row.cpuCapped && <small className="v2-expert-limit"
                title="Mọi game AAA đã chạm trần FPS của CPU ở độ phân giải này; VGA mạnh hơn nữa không tăng thêm khung hình">chạm trần CPU</small>}
            </td>}
            <td className="v2-expert-num">{row.valuePerMillion ? row.valuePerMillion.toFixed(1) : ""}</td>
            <td>{row.status === "current" ? <span className="v2-expert-status is-current">Đang dùng</span>
              : row.status === "ok" ? <span className="v2-expert-status is-ok">✓ Lắp được</span>
                : row.status === "repair" ? <span className="v2-expert-status is-repair">⚙ Đổi kèm {row.repairs.map((part) => SLOT_NAME[part]).join(", ")}</span>
                  : <span className="v2-expert-status is-blocked">✗ {row.problems[0]}</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>

      {selectedRow && <div className="v2-expert-compare">
        <header>
          <div>
            <small>So sánh chi tiết</small>
            <h3>{parts[slot]?.productName ?? "Không có"} → {selectedRow.product.productName}</h3>
          </div>
          {selectedRow.parts && <PrimaryButton type="button" onClick={() => { setParts(selectedRow.parts!); setSelected(undefined); }}>
            Áp dụng thay đổi ({signedMoney(selectedRow.priceDelta)})
          </PrimaryButton>}
        </header>
        {selectedRow.status === "blocked" && <p className="v2-expert-issues">✗ {selectedRow.problems.join("; ")}</p>}
        {selectedRow.repairs.length > 0 && selectedRow.parts && <p className="v2-expert-repairs">⚙ Để vẫn tương thích, đổi kèm: {selectedRow.repairs.map((part) =>
          `${SLOT_NAME[part]} ${parts[part]?.productName ?? "—"} → ${selectedRow.parts![part]?.productName ?? "—"}`).join("; ")}</p>}
        {selectedBench && <div className="v2-expert-metrics is-compact">
          {METRICS.map((metric) => {
            const after = metric.read(selectedBench);
            const before = metric.read(bench);
            if (after === undefined && before === undefined) return null;
            return <div key={metric.label}>
              <small>{metric.label}</small>
              <b>{after === undefined ? "—" : metric.format(after, selectedBench)}</b>
              <Delta now={after} before={before} higher={metric.higher} money={metric.label === "Tổng giá"} />
            </div>;
          })}
        </div>}
        {changedWork.length > 0 && <>
          <h4 className="v2-expert-subhead">Ảnh hưởng tới công việc</h4>
          <div className="v2-expert-metrics is-compact">
            {changedWork.map((metric) => <div key={metric.key}>
              <small>{metric.label}</small>
              <b>{metric.text}</b>
              <WorkDelta now={metric} before={work.find((item) => item.key === metric.key)} />
            </div>)}
          </div>
        </>}
        <div className="v2-expert-compare-grid">
          <div className="v2-expert-table-wrap">
            <table className="v2-expert-table v2-expert-spec-diff">
              <thead><tr><th>Thông số</th><th>Hiện tại</th><th>Thay thế</th></tr></thead>
              <tbody>{KEY_SPECS[slot].map((code) => {
                const before = parts[slot] ? spec(parts[slot]!, code) : "—";
                const after = spec(selectedRow.product, code);
                if (before === "—" && after === "—") return null;
                return <tr key={code} className={before !== after ? "is-diff" : undefined}>
                  <th scope="row">{label(selectedRow.product, code)}</th><td>{before}</td><td>{after}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          {selectedBench && <FpsMatrix bench={selectedBench} base={bench} />}
        </div>
      </div>}
    </section>

    <section className="v2-expert-panel" aria-label="Bảng thông số">
      <header><h2>Bảng thông số kỹ thuật</h2><small>Lấy từ dữ liệu sản phẩm trong catalog</small></header>
      <div className="v2-expert-specs">
        {BUILD_SLOTS.map((part) => {
          const product = parts[part];
          if (!product) return null;
          const rowsForPart = KEY_SPECS[part].map((code) => [code, spec(product, code)] as const).filter(([, value]) => value !== "—");
          return <article key={part}>
            <header>
              <span className="v2-expert-slot-tag">{SLOT_NAME[part]}</span>
              <Link to={`/customer/product?modelCode=${encodeURIComponent(product.modelCode)}`}>{product.productName}</Link>
            </header>
            <dl>{rowsForPart.map(([code, value]) => <div key={code}><dt>{label(product, code)}</dt><dd>{value}</dd></div>)}</dl>
          </article>;
        })}
      </div>
    </section>

    {parts.CPU && <CompatibilityAndCart parts={parts} byCode={byCode} issues={analysis.issues}
      resolution={resolution} suggestedName={`PC ${PROFILE_LABEL[useCase].toLowerCase()} (tự cấu hình)`} />}
  </div>;
}

function WorkloadCard({ group, metrics, base }: { group: WorkloadGroup; metrics: WorkloadMetric[]; base?: WorkloadMetric[] }) {
  return <article>
    <header>
      <span aria-hidden="true">{WORKLOAD_ICON[group]}</span>
      <div><h3>{WORKLOAD_GROUPS[group].title}</h3><small>{WORKLOAD_GROUPS[group].detail}</small></div>
    </header>
    <dl>{metrics.filter((metric) => metric.group === group).map((metric) => <div key={metric.key}>
      <dt>{metric.label}{metric.note && <small>{metric.note}</small>}</dt>
      <dd>
        <b className={metric.value === undefined && metric.key !== "encoder" ? "is-unavailable" : undefined}>{metric.text}</b>
        <WorkDelta now={metric} before={base?.find((item) => item.key === metric.key)} />
      </dd>
    </div>)}</dl>
  </article>;
}

function Bar({ label, value }: { label: string; value: number }) {
  return <span className="v2-expert-bar" title={`${label} ${Math.round(value * 100)}%`}>
    <small>{label}</small>
    <span><i style={{ width: `${Math.round(value * 100)}%` }} /></span>
    <b>{Math.round(value * 100)}%</b>
  </span>;
}

function FpsMatrix({ bench, base }: { bench: Benchmark; base?: Benchmark }): ReactNode {
  const games = bench.fps["1080p"];
  if (!games.length) return null;
  return <div className="v2-expert-table-wrap">
    <table className="v2-expert-table v2-expert-fps">
      <thead><tr><th>FPS ước tính (High)</th>{RESOLUTIONS.map((res) => <th key={res}>{RESOLUTION_LABEL[res]}</th>)}</tr></thead>
      <tbody>{games.map((game, index) => <tr key={game.name}>
        <th scope="row">{game.name}<small>{game.category === "AAA" ? "AAA" : "eSports"}</small></th>
        {RESOLUTIONS.map((res) => {
          const cell = bench.fps[res][index];
          const now = cell?.fps;
          const before = base?.fps[res][index]?.fps;
          return <td key={res} className={`v2-expert-num ${now >= 100 ? "is-great" : now >= 60 ? "is-good" : now >= 35 ? "is-ok" : "is-low"}`}>
            <span className={cell?.limit === "cpu" ? "is-capped" : undefined}
              title={cell?.limit === "cpu" ? "Bị CPU giới hạn: VGA mạnh hơn không tăng FPS ở ô này" : "Bị VGA giới hạn"}>{now}</span>
            {before !== undefined && <Delta now={now} before={before} higher />}
          </td>;
        })}
      </tr>)}</tbody>
    </table>
    <p className="v2-expert-caption">Số gạch chân chấm: FPS đang bị CPU giới hạn (VGA mạnh hơn không tăng thêm). Còn lại: VGA là giới hạn.</p>
  </div>;
}
