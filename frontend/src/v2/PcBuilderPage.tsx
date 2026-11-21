import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  canPurchaseOffer,
  customerVisibleOffers,
  fetchCatalogFacets,
  fetchCatalogProducts,
} from "../catalog-api";
import type { CatalogProduct } from "../catalog-api";
import { money } from "../demo/demo-store";
import {
  BUILD_SLOTS,
  RESOLUTION_LABEL,
  analyzeBuild,
  createCatalog,
  planBuild,
  slotOptions,
  suggestUpgrades,
} from "./build-planner";
import type {
  BuildAnalysis,
  BuildParts,
  BuildRequest,
  BuildSlot,
  Platform,
  PlannerProduct,
  Priority,
  Resolution,
  UpgradeSuggestion,
  UseCase,
} from "./build-planner";
import { CompatibilityAndCart } from "./BuilderCheckout";
import type { Listing } from "./BuilderCheckout";
import { ErrorState, LoadingState, PrimaryButton, SecondaryButton } from "./components";
import { ExpertBuilder } from "./PcBuilderExpert";
import { displayProductImages, preferredProductImage } from "./product-images";
import { ProductArtwork } from "./storefront-components";

const SLOT_TITLE: Record<BuildSlot, string> = {
  CPU: "Bộ vi xử lý (CPU)",
  MOTHERBOARD: "Bo mạch chủ",
  RAM: "Bộ nhớ RAM",
  GPU: "Card đồ họa (VGA)",
  STORAGE: "Ổ cứng SSD",
  PSU: "Nguồn",
  CASE: "Vỏ case",
  COOLER: "Tản nhiệt CPU",
};
const SLOT_TAG: Record<BuildSlot, string> = {
  CPU: "CPU", MOTHERBOARD: "MAIN", RAM: "RAM", GPU: "VGA", STORAGE: "SSD", PSU: "PSU", CASE: "CASE", COOLER: "FAN",
};
const SLOT_HELP: Record<BuildSlot, string> = {
  CPU: "Bộ não của máy, quyết định tốc độ xử lý và đa nhiệm.",
  MOTHERBOARD: "Nơi kết nối mọi linh kiện; phải đúng socket CPU và loại RAM.",
  RAM: "Bộ nhớ tạm để mở nhiều ứng dụng, game cùng lúc.",
  GPU: "Quyết định FPS khi chơi game và tốc độ render, AI.",
  STORAGE: "Nơi cài Windows, game và lưu dữ liệu.",
  PSU: "Cấp điện cho cả máy; cần đủ công suất và dư cho ổn định.",
  CASE: "Vỏ máy chứa linh kiện, phải đủ chỗ cho VGA và tản nhiệt.",
  COOLER: "Giữ CPU mát và êm khi chạy nặng.",
};

const USE_CASES: { value: UseCase; icon: string; title: string; detail: string }[] = [
  { value: "gaming", icon: "🎮", title: "Chơi game", detail: "Game AAA, eSports, FPS cao" },
  { value: "streaming", icon: "🎙️", title: "Game + Livestream", detail: "Vừa chơi vừa phát trực tiếp" },
  { value: "creator", icon: "🎬", title: "Đồ họa, dựng phim", detail: "Premiere, Photoshop, Blender" },
  { value: "ai", icon: "🤖", title: "Lập trình, AI", detail: "Code, Docker, chạy model AI" },
  { value: "office", icon: "💼", title: "Văn phòng, học tập", detail: "Word, Excel, học online" },
];
const BUDGET_PRESETS = [12, 18, 25, 35, 50, 80, 120];
const RESOLUTIONS: { value: Resolution; title: string; detail: string }[] = [
  { value: "1080p", title: "Full HD", detail: "1920×1080, phổ biến" },
  { value: "1440p", title: "2K", detail: "2560×1440, sắc nét" },
  { value: "2160p", title: "4K", detail: "3840×2160, đỉnh cao" },
];
const PLATFORMS: { value: Platform; title: string }[] = [
  { value: "any", title: "Không quan tâm" }, { value: "intel", title: "Intel" }, { value: "amd", title: "AMD" },
];
const PRIORITIES: { value: Priority; title: string; detail: string }[] = [
  { value: "performance", title: "Hiệu năng tối đa", detail: "Dồn tiền vào sức mạnh" },
  { value: "balanced", title: "Cân bằng", detail: "Mạnh, bền và đáng tiền" },
  { value: "quiet", title: "Mát và êm", detail: "Tản tốt, nguồn hiệu suất cao" },
];

const millions = (value: number) => `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
const signedMillions = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${millions(Math.abs(value))}`;

function coverImage(product: CatalogProduct) {
  return preferredProductImage(displayProductImages(
    product.images.filter((image) => image.mediaType !== "VIDEO"), product.productType));
}

function ratingWord(rating: number) {
  return rating >= 85 ? "Cực mạnh" : rating >= 65 ? "Rất mạnh" : rating >= 45 ? "Mạnh" : rating >= 25 ? "Khá" : "Cơ bản";
}

export function PcBuilderPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"advisor" | "expert">("advisor");
  /** Model codes of the suggested build when the analysis view was last opened. */
  const [analysisSeed, setAnalysisSeed] = useState<string>();
  const [request, setRequest] = useState<BuildRequest>({
    useCase: "gaming", budget: 25_000_000, resolution: "1080p", platform: "any", priority: "balanced",
  });
  const deferredRequest = useDeferredValue(request);
  const [customParts, setCustomParts] = useState<BuildParts>();
  const [openSlot, setOpenSlot] = useState<BuildSlot>();

  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogFacets(controller.signal).then(async ({ data: facets }) => {
      const types = BUILD_SLOTS.map((slot) => slot === "MOTHERBOARD"
        ? facets.productTypes.find((type) => type.value === "MOTHERBOARD" || type.value === "MAINBOARD")?.value
        : facets.productTypes.find((type) => type.value === slot)?.value)
        .filter((type): type is string => Boolean(type));
      const pages = await Promise.all(types.map((type) => fetchCatalogProducts(
        { page: 1, limit: 100, type, sort: "price", order: "asc" }, controller.signal)));
      if (controller.signal.aborted) return;
      setListings(pages.flatMap((page) => page.data).flatMap((product) => {
        const offer = customerVisibleOffers(product.offers).find((candidate) => canPurchaseOffer(candidate, 1));
        return offer ? [{ product, offer }] : [];
      }));
      setError("");
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Không thể tải linh kiện.");
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const byCode = useMemo(() => new Map(listings.map((listing) => [listing.product.modelCode, listing])), [listings]);
  const catalog = useMemo(() => createCatalog(listings.map((listing): PlannerProduct => ({
    modelCode: listing.product.modelCode,
    productName: listing.product.productName,
    productType: listing.product.productType,
    brandName: listing.product.brandName,
    price: Number(listing.offer.price),
    specifications: listing.product.specifications,
  }))), [listings]);
  const plan = useMemo(() => listings.length ? planBuild(catalog, deferredRequest) : undefined, [catalog, deferredRequest, listings.length]);
  useEffect(() => setCustomParts(undefined), [deferredRequest]);

  const advisorParts = useMemo(() => customParts ?? plan?.build?.parts ?? {}, [customParts, plan]);
  const analysis = useMemo(() => analyzeBuild(advisorParts, catalog, deferredRequest), [advisorParts, catalog, deferredRequest]);
  const upgrades = useMemo(() => customParts
    ? suggestUpgrades(advisorParts, catalog, deferredRequest)
    : plan?.upgrades ?? [], [advisorParts, catalog, customParts, deferredRequest, plan]);
  const updating = request !== deferredRequest;

  const setField = <K extends keyof BuildRequest>(key: K, value: BuildRequest[K]) =>
    setRequest((current) => ({ ...current, [key]: value }));
  // Re-seeds the analysis view only when the suggested build changed since it was last opened.
  const openAnalysis = () => {
    setAnalysisSeed(BUILD_SLOTS.map((slot) => advisorParts[slot]?.modelCode ?? "").join("|"));
    setMode("expert");
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="v2-page v2-builder-page">
      <div className="v2-page-title">
        {mode === "advisor" ? <div>
          <p className="v2-eyebrow">Build PC thông minh</p>
          <h1>Tự build PC theo đúng nhu cầu</h1>
          <p>Chọn mục đích, ngân sách và điều bạn ưu tiên. Hệ thống ghép cấu hình tương thích, đúng ngân sách và giải thích lý do chọn từng linh kiện.</p>
        </div> : <div>
          <p className="v2-eyebrow">Build PC thông minh</p>
          <h1>Phân tích cấu hình chi tiết</h1>
          <p>Benchmark chi tiết, cân bằng CPU/VGA theo độ phân giải, so sánh khi đổi từng linh kiện và so với cấu hình mốc.</p>
        </div>}
        {!loading && !error && (mode === "advisor"
          ? <button type="button" className="v2-builder-switch" onClick={openAnalysis}
            title="Benchmark, so sánh khi đổi linh kiện và thông số đầy đủ">⚙ Phân tích chi tiết</button>
          : <button type="button" className="v2-builder-switch" onClick={() => setMode("advisor")}>← Gợi ý theo nhu cầu</button>)}
      </div>

      {/* Stays mounted while the suggested build is unchanged, so a pinned baseline and edits survive switching views. */}
      {analysisSeed !== undefined && !loading && !error && <div hidden={mode !== "expert"}>
        <ExpertBuilder key={analysisSeed} catalog={catalog} byCode={byCode} suggestedParts={advisorParts}
          profile={{ useCase: request.useCase, resolution: request.resolution, priority: request.priority }} />
      </div>}

      {error && <ErrorState title="Không tải được linh kiện" message={error} />}
      {loading && <LoadingState message="Đang tải linh kiện đang bán…" />}

      {mode === "advisor" && !loading && !error && <div className="v2-advisor-layout">
        <aside className="v2-advisor-form" aria-label="Nhu cầu của bạn">
          <fieldset>
            <legend><span>1</span> Bạn dùng máy để làm gì?</legend>
            <div className="v2-advisor-usecases">
              {USE_CASES.map((option) => <button type="button" key={option.value}
                className={request.useCase === option.value ? "is-active" : undefined}
                aria-pressed={request.useCase === option.value}
                onClick={() => setField("useCase", option.value)}>
                <span aria-hidden="true">{option.icon}</span>
                <strong>{option.title}</strong>
                <small>{option.detail}</small>
              </button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>2</span> Ngân sách của bạn</legend>
            <output className="v2-advisor-budget" htmlFor="advisor-budget">{millions(request.budget)}</output>
            <input id="advisor-budget" type="range" min={8_000_000} max={150_000_000} step={500_000}
              value={request.budget} aria-label="Ngân sách"
              onChange={(event) => setField("budget", Number(event.target.value))} />
            <div className="v2-advisor-chips">
              {BUDGET_PRESETS.map((preset) => <button type="button" key={preset}
                className={request.budget === preset * 1_000_000 ? "is-active" : undefined}
                onClick={() => setField("budget", preset * 1_000_000)}>{preset} triệu</button>)}
            </div>
          </fieldset>
          {(request.useCase === "gaming" || request.useCase === "streaming") && <fieldset>
            <legend><span>3</span> Màn hình bạn chơi game</legend>
            <div className="v2-advisor-options">
              {RESOLUTIONS.map((option) => <button type="button" key={option.value}
                className={request.resolution === option.value ? "is-active" : undefined}
                aria-pressed={request.resolution === option.value}
                onClick={() => setField("resolution", option.value)}>
                <strong>{option.title}</strong><small>{option.detail}</small>
              </button>)}
            </div>
          </fieldset>}
          <fieldset>
            <legend><span>{request.useCase === "gaming" || request.useCase === "streaming" ? 4 : 3}</span> Hãng CPU</legend>
            <div className="v2-advisor-chips">
              {PLATFORMS.map((option) => <button type="button" key={option.value}
                className={request.platform === option.value ? "is-active" : undefined}
                onClick={() => setField("platform", option.value)}>{option.title}</button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend><span>{request.useCase === "gaming" || request.useCase === "streaming" ? 5 : 4}</span> Bạn ưu tiên</legend>
            <div className="v2-advisor-options">
              {PRIORITIES.map((option) => <button type="button" key={option.value}
                className={request.priority === option.value ? "is-active" : undefined}
                aria-pressed={request.priority === option.value}
                onClick={() => setField("priority", option.value)}>
                <strong>{option.title}</strong><small>{option.detail}</small>
              </button>)}
            </div>
          </fieldset>
        </aside>

        <section className={`v2-advisor-result${updating ? " is-updating" : ""}`} aria-live="polite">
          {mode === "advisor" && plan?.status === "no-build" && <ErrorState title="Chưa ghép được cấu hình"
            message="Danh mục hiện chưa đủ linh kiện tương thích cho nhu cầu này." />}
          {mode === "advisor" && plan?.status === "budget-too-low" && <div className="v2-advisor-alert">
            <strong>Ngân sách {millions(request.budget)} chưa đủ cho nhu cầu {USE_CASES.find((item) => item.value === request.useCase)?.title.toLowerCase()}.</strong>
            <p>Cấu hình tương thích rẻ nhất hiện có cần khoảng {millions(plan.minimumBudget ?? 0)}. Đây là cấu hình đó:</p>
            <PrimaryButton type="button" onClick={() => setField("budget", Math.ceil((plan.minimumBudget ?? 0) / 500_000) * 500_000)}>
              Dùng ngân sách {millions(Math.ceil((plan.minimumBudget ?? 0) / 500_000) * 500_000)}
            </PrimaryButton>
          </div>}

          {analysis.parts.CPU && <BuildSummary analysis={analysis} request={deferredRequest} customised={Boolean(customParts)} />}

          {mode === "advisor" && analysis.parts.CPU && <section className="v2-advisor-parts" aria-label="Linh kiện được chọn">
            <div className="v2-advisor-section-heading">
              <h2>Cấu hình đề xuất</h2>
              <div className="v2-advisor-heading-links">
                {customParts && <button type="button" className="v2-advisor-link" onClick={() => setCustomParts(undefined)}>↺ Về đề xuất gốc</button>}
                <button type="button" className="v2-builder-switch" onClick={openAnalysis}>Xem benchmark chi tiết →</button>
              </div>
            </div>
            {BUILD_SLOTS.map((slot) => {
              const part = analysis.parts[slot];
              const listing = part ? byCode.get(part.modelCode) : undefined;
              return <article key={slot} className={`v2-advisor-part${openSlot === slot ? " is-open" : ""}`}>
                <span className="v2-advisor-part-tag" aria-hidden="true">{SLOT_TAG[slot]}</span>
                {listing ? <Link className="v2-advisor-part-image" to={`/customer/product?modelCode=${encodeURIComponent(listing.product.modelCode)}`}>
                  <ProductArtwork image={coverImage(listing.product)} productName={listing.product.productName} productType={listing.product.productType} />
                </Link> : <span className="v2-advisor-part-image is-empty" aria-hidden="true">—</span>}
                <div className="v2-advisor-part-copy">
                  <small>{SLOT_TITLE[slot]}</small>
                  <strong>{part ? part.productName : slot === "GPU" ? "Không cần VGA rời" : "Chưa chọn"}</strong>
                  <p>{analysis.reasons[slot] ?? (slot === "GPU" && !part ? "CPU có đồ họa tích hợp, đủ cho nhu cầu này. Có thể thêm VGA sau." : SLOT_HELP[slot])}</p>
                </div>
                <div className="v2-advisor-part-side">
                  {part && <b>{money(part.price, "VND")}</b>}
                  <button type="button" className="v2-advisor-link" aria-expanded={openSlot === slot}
                    onClick={() => setOpenSlot(openSlot === slot ? undefined : slot)}>{part ? "Đổi" : "Thêm"}</button>
                </div>
                {openSlot === slot && <AlternativeList slot={slot} parts={analysis.parts} catalog={catalog} request={deferredRequest}
                  onPick={(product) => {
                    setCustomParts({ ...analysis.parts, [slot]: product });
                    setOpenSlot(undefined);
                  }} />}
              </article>;
            })}
          </section>}

          {analysis.parts.CPU && upgrades.length > 0 && <UpgradeList upgrades={upgrades} onApply={(suggestion) => {
            setCustomParts(suggestion.parts);
          }} />}

          {mode === "advisor" && plan?.status === "ok" && (plan.cheaper || plan.stronger) && <section className="v2-advisor-alternatives">
            <h2>Phương án khác</h2>
            <div>
              {plan.cheaper && <button type="button" onClick={() => setField("budget", Math.ceil(plan.cheaper!.total / 500_000) * 500_000)}>
                <small>Tiết kiệm hơn</small>
                <strong>{millions(plan.cheaper.total)}</strong>
                <span>Sức mạnh {plan.cheaper.performanceRating}/100 · {plan.cheaper.tierLabel}</span>
              </button>}
              {plan.stronger && <button type="button" onClick={() => setField("budget", Math.ceil(plan.stronger!.total / 500_000) * 500_000)}>
                <small>Mạnh hơn</small>
                <strong>{millions(plan.stronger.total)}</strong>
                <span>Sức mạnh {plan.stronger.performanceRating}/100 · {plan.stronger.tierLabel}</span>
              </button>}
            </div>
          </section>}

          {analysis.parts.CPU && <CompatibilityAndCart parts={analysis.parts} byCode={byCode} issues={analysis.issues} />}
        </section>
      </div>}
    </div>
  );
}

function BuildSummary({ analysis, request, customised }: { analysis: BuildAnalysis; request: BuildRequest; customised: boolean }) {
  const remaining = request.budget - analysis.total;
  const gaming = request.useCase === "gaming" || request.useCase === "streaming";
  return <section className="v2-advisor-summary">
    <div className="v2-advisor-summary-main">
      <small>{customised ? "Cấu hình đã chỉnh" : "Đề xuất cho bạn"}</small>
      <h2>{analysis.tierLabel}</h2>
      <div className="v2-advisor-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={analysis.performanceRating}
        aria-label="Sức mạnh so với cấu hình mạnh nhất có thể ghép">
        <span style={{ width: `${Math.max(4, analysis.performanceRating)}%` }} />
      </div>
      <p className="v2-advisor-meter-label"><b>{ratingWord(analysis.performanceRating)}</b> · {analysis.performanceRating}/100 so với cấu hình mạnh nhất cửa hàng ghép được</p>
    </div>
    <dl className="v2-advisor-facts">
      <div><dt>Tổng tiền</dt><dd>{money(analysis.total, "VND")}</dd></div>
      <div><dt>{remaining >= 0 ? "Còn dư so với ngân sách" : "Vượt ngân sách"}</dt><dd className={remaining < 0 ? "is-over" : undefined}>{money(Math.abs(remaining), "VND")}</dd></div>
      <div><dt>Điện năng khi tải nặng</dt><dd>~{analysis.powerEstimate} W</dd></div>
      <div><dt>Nguồn nên dùng</dt><dd>≥ {analysis.recommendedPsu} W</dd></div>
    </dl>
    {analysis.bottleneck && <p className={`v2-advisor-bottleneck is-${analysis.bottleneck.kind}`}>{analysis.bottleneck.message}</p>}
    {gaming && analysis.fps.length > 0 && <div className="v2-advisor-fps">
      <h3>FPS ước tính ở {RESOLUTION_LABEL[request.resolution]}, thiết lập cao</h3>
      <ul>
        {analysis.fps.map((game) => <li key={game.name} className={game.fps >= 100 ? "is-great" : game.fps >= 60 ? "is-good" : game.fps >= 35 ? "is-ok" : "is-low"}>
          <span>{game.name}</span><b>{game.fps}<small> FPS</small></b><em>{game.label}</em>
        </li>)}
      </ul>
      <p>Ước tính tham khảo từ chỉ số hiệu năng của CPU và VGA; FPS thực tế thay đổi theo phiên bản game, driver và thiết lập.</p>
    </div>}
  </section>;
}

function AlternativeList({ slot, parts, catalog, request, onPick }: {
  slot: BuildSlot;
  parts: BuildParts;
  catalog: ReturnType<typeof createCatalog>;
  request: BuildRequest;
  onPick: (product: PlannerProduct) => void;
}) {
  const current = parts[slot];
  const options = slotOptions(slot, parts, catalog, request)
    .filter((option) => option.problems.length === 0 && option.product.modelCode !== current?.modelCode);
  const currentPrice = current?.price ?? 0;
  const cheaper = options.filter((option) => option.product.price < currentPrice).slice(-3);
  const pricier = options.filter((option) => option.product.price >= currentPrice).slice(0, 5);
  const shown = [...cheaper, ...pricier];
  if (shown.length === 0) return <p className="v2-advisor-alt-empty">Không còn lựa chọn nào tương thích với các linh kiện khác.</p>;
  return <ul className="v2-advisor-alternative-list">
    {shown.map(({ product }) => <li key={product.modelCode}>
      <button type="button" onClick={() => onPick(product)}>
        <span>{product.productName}</span>
        <b className={product.price > currentPrice ? "is-up" : "is-down"}>{current ? signedMillions(product.price - currentPrice) : millions(product.price)}</b>
      </button>
    </li>)}
  </ul>;
}

function UpgradeList({ upgrades, onApply }: { upgrades: UpgradeSuggestion[]; onApply: (suggestion: UpgradeSuggestion) => void }) {
  return <section className="v2-advisor-upgrades">
    <h2>Nâng cấp đáng tiền nhất</h2>
    <p>Xếp theo hiệu năng tăng thêm trên mỗi triệu đồng. Linh kiện đi kèm (nguồn, case…) được đổi tự động để vẫn tương thích.</p>
    <ul>
      {upgrades.map((upgrade) => <li key={`${upgrade.slot}-${upgrade.title}`}>
        <span className="v2-advisor-part-tag" aria-hidden="true">{SLOT_TAG[upgrade.slot]}</span>
        <div><strong>{upgrade.title}</strong><small>{upgrade.detail}</small></div>
        <b>{signedMillions(upgrade.priceDelta)}</b>
        {upgrade.gainPercent > 0 && <em>+{upgrade.gainPercent}%</em>}
        <SecondaryButton type="button" onClick={() => onApply(upgrade)}>Áp dụng</SecondaryButton>
      </li>)}
    </ul>
  </section>;
}
