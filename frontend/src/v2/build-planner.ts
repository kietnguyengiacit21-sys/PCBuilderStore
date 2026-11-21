/**
 * Build PC advisor: plans a complete, compatible PC for a budget and a use case,
 * explains every pick in plain language and proposes the upgrades that buy the most
 * performance per million VND.
 *
 * Pure functions only (no I/O) so the page and the tests share the same logic.
 * The algorithm is described step by step in docs/system-design/pc-build-advisor.md.
 */

export type BuildSlot = "CPU" | "MOTHERBOARD" | "RAM" | "GPU" | "STORAGE" | "PSU" | "CASE" | "COOLER";
export const BUILD_SLOTS: BuildSlot[] = ["CPU", "MOTHERBOARD", "RAM", "GPU", "STORAGE", "PSU", "CASE", "COOLER"];

export type UseCase = "gaming" | "streaming" | "creator" | "ai" | "office";
export type Resolution = "1080p" | "1440p" | "2160p";
export type Platform = "any" | "intel" | "amd";
export type Priority = "performance" | "balanced" | "quiet";

export interface PlannerProduct {
  modelCode: string;
  productName: string;
  productType: string;
  brandName?: string | null;
  /** Price of the purchasable offer the build would use, in VND. */
  price: number;
  specifications: Record<string, unknown>;
}

export interface BuildRequest {
  useCase: UseCase;
  budget: number;
  resolution: Resolution;
  platform: Platform;
  priority: Priority;
}

export type BuildParts = Partial<Record<BuildSlot, PlannerProduct>>;

export interface GameFps {
  name: string;
  category: "AAA" | "ESPORTS";
  fps: number;
  label: string;
  /** Which part sets the frame rate: "cpu" means a faster GPU would not raise it. */
  limit: "cpu" | "gpu";
}

export interface BuildAnalysis {
  parts: BuildParts;
  total: number;
  score: number;
  /** 0–100 position of the build within what the catalog can offer for this use case. */
  performanceRating: number;
  tierLabel: string;
  powerEstimate: number;
  recommendedPsu: number;
  bottleneck?: { kind: "cpu" | "gpu" | "balanced"; message: string };
  fps: GameFps[];
  reasons: Partial<Record<BuildSlot, string>>;
  issues: string[];
}

export interface UpgradeSuggestion {
  slot: BuildSlot;
  title: string;
  detail: string;
  priceDelta: number;
  gainPercent: number;
  parts: BuildParts;
}

export interface PlanResult {
  status: "ok" | "budget-too-low" | "no-build";
  build?: BuildAnalysis;
  /** Cheapest complete build the catalog allows for this use case. */
  minimumBudget?: number;
  upgrades: UpgradeSuggestion[];
  cheaper?: BuildAnalysis;
  stronger?: BuildAnalysis;
}

// ---------------------------------------------------------------------------
// Reference performance indices.
// Catalog specs (shader counts, cache sizes) are too inconsistent to rank chips, so the
// advisor uses relative indices from public benchmark consensus (approximate, rounded):
// GPU = 1440p raster performance with RTX 5090 = 100; CPU gaming with 9800X3D = 100,
// CPU multi-thread with 9950X = 100. Unknown chips fall back to a spec-based estimate.
// ---------------------------------------------------------------------------
const GPU_INDEX: [RegExp, number][] = [
  [/5090/, 100], [/5080/, 74], [/7900\s*XTX/, 70], [/5070\s*TI/, 66], [/9070\s*XT/, 65],
  [/9070/, 58], [/5070/, 55], [/4070\s*(SUPER|S\b)/, 52], [/7800\s*XT/, 50], [/4070/, 45],
  [/7700\s*XT/, 42], [/5060\s*TI/, 40], [/9060\s*XT/, 40], [/4060\s*TI/, 36], [/5060/, 34],
  [/4060/, 29], [/7600/, 28], [/5050/, 25], [/3060/, 24], [/3050/, 15],
];

const CPU_INDEX: [RegExp, number, number][] = [
  [/9950X3D/, 98, 97], [/9800X3D/, 100, 52], [/7800X3D/, 90, 42], [/5800X3D/, 74, 34],
  [/9950X/, 82, 100], [/9900X/, 80, 76], [/9700X/, 80, 52], [/7700/, 76, 47],
  [/7600/, 72, 35], [/7500F/, 70, 34], [/5700X/, 62, 35], [/5600X/, 61, 27], [/5600/, 59, 26],
  [/14900KS/, 86, 90], [/14900K/, 84, 87], [/14700K/, 81, 77], [/13700K/, 78, 68],
  [/14600K/, 76, 54], [/14500/, 70, 47], [/14400/, 66, 38], [/13400/, 64, 36],
  [/12400/, 60, 27], [/12100/, 50, 18],
];

/** Games and base FPS (1080p High on an index-25 GPU), shared with the prebuilt-PC estimator. */
const GAMES: { name: string; category: "AAA" | "ESPORTS"; base: number }[] = [
  { name: "Cyberpunk 2077", category: "AAA", base: 42 },
  { name: "Black Myth: Wukong", category: "AAA", base: 35 },
  { name: "Elden Ring", category: "AAA", base: 60 },
  { name: "Red Dead Redemption 2", category: "AAA", base: 52 },
  { name: "Valorant", category: "ESPORTS", base: 260 },
  { name: "Counter-Strike 2", category: "ESPORTS", base: 190 },
  { name: "League of Legends", category: "ESPORTS", base: 280 },
  { name: "PUBG: Battlegrounds", category: "ESPORTS", base: 125 },
];

const RESOLUTION_LOAD: Record<Resolution, number> = { "1080p": 1, "1440p": 0.75, "2160p": 0.45 };
const RESOLUTION_FPS: Record<Resolution, number> = { "1080p": 1, "1440p": 0.72, "2160p": 0.48 };
const RESOLUTION_LABEL: Record<Resolution, string> = { "1080p": "Full HD", "1440p": "2K", "2160p": "4K" };

interface Profile {
  label: string;
  needsGpu: boolean;
  minRam: number;
  minStorage: number;
  /** Score points one million VND must earn to be worth spending. */
  costWeight: number;
  ram: Record<number, number>;
  storage: Record<number, number>;
}

const PROFILES: Record<UseCase, Profile> = {
  gaming: {
    label: "chơi game", needsGpu: true, minRam: 16, minStorage: 500, costWeight: 0.45,
    ram: { 8: -15, 16: 0, 32: 5, 64: 6 },
    storage: { 256: -8, 500: 0, 1000: 3, 2000: 5, 4000: 6 },
  },
  streaming: {
    label: "chơi game và livestream", needsGpu: true, minRam: 16, minStorage: 1000, costWeight: 0.45,
    ram: { 8: -15, 16: -2, 32: 6, 64: 7 },
    storage: { 500: -3, 1000: 2, 2000: 5, 4000: 6 },
  },
  creator: {
    label: "đồ họa và dựng phim", needsGpu: true, minRam: 32, minStorage: 1000, costWeight: 0.35,
    ram: { 16: -8, 32: 0, 64: 8, 96: 9, 128: 10 },
    storage: { 500: -4, 1000: 1, 2000: 6, 4000: 8, 8000: 9 },
  },
  ai: {
    label: "lập trình và AI", needsGpu: true, minRam: 32, minStorage: 1000, costWeight: 0.35,
    ram: { 16: -12, 32: 0, 64: 8, 128: 12, 192: 13 },
    storage: { 500: -4, 1000: 1, 2000: 6, 4000: 8, 8000: 9 },
  },
  office: {
    label: "văn phòng và học tập", needsGpu: false, minRam: 8, minStorage: 256, costWeight: 3,
    ram: { 8: -4, 16: 0, 32: 1 },
    storage: { 256: -2, 500: 0, 1000: 1 },
  },
};

const PSU_HEADROOM: Record<Priority, number> = { performance: 1.2, balanced: 1.3, quiet: 1.4 };
const BASE_SYSTEM_WATT = 100;

// ---------------------------------------------------------------------------
// Normalisation: turn catalog specifications into typed facts.
// ---------------------------------------------------------------------------
function text(product: PlannerProduct, code: string): string {
  const value = product.specifications[code];
  return typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
}

function num(product: PlannerProduct, code: string): number | undefined {
  const value = product.specifications[code];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function list(product: PlannerProduct, code: string): string[] {
  const value = product.specifications[code];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") {
    return Object.values(value).filter((item): item is string => typeof item === "string");
  }
  return [];
}

const upper = (value: string) => value.toUpperCase();
const socketKey = (value: string) => upper(value).replace(/^(INTEL|AMD)\s+/, "").replace(/\s+/g, "");

function formFactorKey(value: string): string {
  const normalized = upper(value).replace(/\s+/g, "");
  if (normalized.startsWith("E-ATX") || normalized.startsWith("EATX")) return "EATX";
  if (normalized.includes("MICRO") || normalized === "MATX" || normalized === "M-ATX") return "MATX";
  if (normalized.includes("ITX")) return "ITX";
  if (normalized.startsWith("ATX")) return "ATX";
  return normalized;
}

function snapRadiator(length: number | undefined): number | undefined {
  if (!length) return undefined;
  const sizes = [120, 140, 240, 280, 360, 420, 480].filter((size) => size <= length);
  return sizes.length ? sizes[sizes.length - 1] : length;
}

function radiatorSupport(product: PlannerProduct): number | undefined {
  let maximum: number | undefined;
  for (const entry of list(product, "radiator_support")) {
    for (const match of entry.matchAll(/(?<![\d.])(\d{3})(?=\s*(?:mm|\/))/gi)) {
      const size = Number(match[1]);
      if (!maximum || size > maximum) maximum = size;
    }
  }
  return maximum;
}

function atxLength(product: PlannerProduct): number | undefined {
  const value = product.specifications.dimensions_mm;
  if (!Array.isArray(value) || value.length !== 3 || !value.every((side) => typeof side === "number")) return undefined;
  const sides = [...value] as number[];
  for (const standard of [150, 86]) {
    const index = sides.indexOf(standard);
    if (index < 0) return undefined;
    sides.splice(index, 1);
  }
  return sides[0];
}

function countPattern(values: string[], pattern: RegExp): number {
  let total = 0;
  for (const value of values) {
    for (const match of upper(value).matchAll(pattern)) total += Number(match[1]);
  }
  return total;
}

const SIXTEEN_PIN = /16-PIN|12VHPWR|12V-2X6/;
const firmSixteenPin = (value: string) => SIXTEEN_PIN.test(upper(value))
  && !/KHÔNG|ADAPTER|TÙY/.test(upper(value));

export interface CpuFacts { socket: string; memoryTypes: string[]; gaming: number; multi: number; power: number; igpu: boolean; unlocked: boolean; vendor: "intel" | "amd" | "other"; cores?: number; threads?: number }
export interface GpuFacts {
  perf: number; vram: number; power: number; length?: number; recommendedPsu: number; sixteenPin: boolean; eightPins: number; nvidia: boolean;
  vendor: "nvidia" | "amd" | "intel" | "other";
  /** Memory bandwidth in GB/s: the main limit on local LLM speed. */
  bandwidth: number;
  /** Hardware AV1 encoder (RTX 40/50, Radeon RX 7000/9000, Intel Arc). */
  av1Encode: boolean;
}
export interface BoardFacts { socket: string; memoryType: string; formFactor: string; memorySlots: number; maxMemory: number; m2Slots: number; sataPorts: number; wifi: boolean; chipset: string }
export interface RamFacts { capacity: number; modules: number; memoryType: string; rate: number }
export interface StorageFacts { capacity: number; nvme: boolean; generation: number }
export interface PsuFacts { wattage: number; efficiency: number; efficiencyLabel: string; length?: number; nativeSixteenPin: boolean; pcieConnectors?: number }
export interface CaseFacts { formFactors: Set<string>; maxGpu?: number; maxCooler?: number; maxPsu?: number; maxRadiator?: number; fans: number; usbC: boolean }
export interface CoolerFacts { liquid: boolean; height?: number; radiator?: number; sockets: Set<string>; capacity: number }

export function cpuFacts(product: PlannerProduct): CpuFacts {
  const name = upper(product.productName);
  const row = CPU_INDEX.find(([pattern]) => pattern.test(name))
    ?? CPU_INDEX.find(([pattern]) => pattern.test(upper(product.modelCode)));
  const boost = num(product, "max_boost_clock_ghz") ?? 4.5;
  const cores = num(product, "core_count");
  const threads = num(product, "thread_count");
  const graphics = text(product, "integrated_graphics");
  return {
    socket: socketKey(text(product, "socket")),
    memoryTypes: list(product, "memory_types_supported").map(upper),
    gaming: row?.[1] ?? Math.min(85, Math.max(30, 30 + boost * 7 + Math.min(cores ?? 6, 8) * 1.5)),
    multi: row?.[2] ?? Math.min(90, Math.max(10, ((threads ?? 12) * 2.2 * boost) / 5)),
    power: num(product, "max_turbo_power_watt") ?? num(product, "tdp_watt") ?? 125,
    igpu: graphics !== "" && !/^KHÔNG|^NONE|^NO$|^FALSE$/.test(upper(graphics)),
    unlocked: product.specifications.unlocked_multiplier === true,
    vendor: /RYZEN|AMD/.test(name) ? "amd" : /CORE|INTEL/.test(name) ? "intel" : "other",
    cores,
    threads,
  };
}

export function gpuFacts(product: PlannerProduct): GpuFacts {
  const name = upper(`${text(product, "gpu_chip")} ${product.productName}`);
  const row = GPU_INDEX.find(([pattern]) => pattern.test(name));
  const connectors = list(product, "power_connectors");
  const nvidia = /NVIDIA|GEFORCE|RTX|GTX/.test(name);
  const perf = row?.[1] ?? Math.min(60, (num(product, "board_power_watt") ?? 150) / 5);
  return {
    perf,
    vendor: nvidia ? "nvidia" : /RADEON|\bRX\s*\d/.test(name) ? "amd" : /\bARC\b|INTEL/.test(name) ? "intel" : "other",
    // Catalog flags are unreliable for AV1 (Ampere cards are marked true), so decide by generation.
    av1Encode: /RTX\s*(40|50)\d{2}|\bRX\s*[79]\d{3}|\bARC\b/.test(name),
    bandwidth: num(product, "memory_bandwidth_gbs") ?? perf * 12,
    vram: num(product, "vram_gb") ?? 8,
    power: num(product, "board_power_watt") ?? 200,
    length: num(product, "board_length_mm"),
    recommendedPsu: num(product, "recommended_psu_watt") ?? 550,
    sixteenPin: connectors.some((value) => SIXTEEN_PIN.test(upper(value))),
    eightPins: countPattern(connectors, /(\d+)\s*X\s*8-PIN/g),
    nvidia,
  };
}

export function boardFacts(product: PlannerProduct): BoardFacts {
  const wireless = list(product, "wireless_standards");
  return {
    socket: socketKey(text(product, "socket")),
    memoryType: upper(text(product, "memory_type")),
    formFactor: formFactorKey(text(product, "form_factor")),
    memorySlots: num(product, "memory_slot_count") ?? 2,
    maxMemory: num(product, "max_memory_gb") ?? 64,
    m2Slots: num(product, "m2_slot_count") ?? 1,
    sataPorts: num(product, "sata_port_count") ?? 0,
    wifi: wireless.some((value) => !/KHÔNG/.test(upper(value))),
    chipset: upper(text(product, "chipset")).replace(/^(INTEL|AMD)\s+/, ""),
  };
}

export function ramFacts(product: PlannerProduct): RamFacts {
  return {
    capacity: num(product, "capacity_gb") ?? 16,
    modules: num(product, "modules_per_kit") ?? 2,
    memoryType: upper(text(product, "memory_type")),
    rate: num(product, "data_rate_mt_s") ?? 0,
  };
}

export function storageFacts(product: PlannerProduct): StorageFacts {
  const description = upper(`${text(product, "interface")} ${text(product, "form_factor")}`);
  const generation = Number(/PCIE\s*(\d)/.exec(description)?.[1] ?? 0);
  return {
    capacity: num(product, "capacity_gb") ?? 500,
    nvme: /PCIE|NVME/.test(description),
    generation,
  };
}

export function psuFacts(product: PlannerProduct): PsuFacts {
  const rating = upper(text(product, "efficiency_rating"));
  const efficiency = rating.includes("TITANIUM") ? 4 : rating.includes("PLATINUM") ? 3
    : rating.includes("GOLD") ? 2 : rating.includes("SILVER") ? 1.5 : rating.includes("BRONZE") ? 1 : 0;
  const connectors = list(product, "connectors");
  const pcie = connectors.filter((value) => /PCIE/.test(upper(value)));
  const counts = pcie.map((value) => /^(\d+)\s*X\b/.exec(upper(value))?.[1] ?? /\bX\s*(\d+)$/.exec(upper(value))?.[1]);
  return {
    wattage: num(product, "wattage") ?? 0,
    efficiency,
    efficiencyLabel: text(product, "efficiency_rating"),
    length: atxLength(product),
    nativeSixteenPin: firmSixteenPin(text(product, "native_16pin_connector")) || connectors.some(firmSixteenPin),
    pcieConnectors: pcie.length && counts.every(Boolean) ? counts.reduce((sum, value) => sum + Number(value), 0) : undefined,
  };
}

export function caseFacts(product: PlannerProduct): CaseFacts {
  const fans = list(product, "included_fans");
  return {
    formFactors: new Set(list(product, "motherboard_form_factors").map(formFactorKey)),
    maxGpu: num(product, "max_gpu_length_mm"),
    maxCooler: num(product, "max_cooler_height_mm"),
    maxPsu: num(product, "max_psu_length_mm"),
    maxRadiator: radiatorSupport(product),
    fans: fans.some((value) => /KHÔNG/.test(upper(value))) ? 0 : Math.max(countPattern(fans, /(\d+)\s*X\b/g), fans.length),
    usbC: product.specifications.front_usb_c === true,
  };
}

export function coolerFacts(product: PlannerProduct): CoolerFacts {
  const type = upper(text(product, "cooler_type"));
  const liquid = /AIO|LIQUID|NƯỚC/.test(type);
  const dimensions = product.specifications.radiator_dimensions_mm;
  const radiator = liquid && Array.isArray(dimensions) && typeof dimensions[0] === "number"
    ? snapRadiator(dimensions[0]) : undefined;
  const height = liquid ? undefined : num(product, "cooler_height_mm");
  const fanCount = num(product, "fan_count") ?? 1;
  // Typical sustained cooling capacity by class (watts); vendors rarely publish one figure.
  const capacity = liquid
    ? (radiator ?? 240) >= 360 ? 320 : (radiator ?? 240) >= 280 ? 260 : (radiator ?? 240) >= 240 ? 230 : 170
    : fanCount >= 2 || (height ?? 0) >= 158 ? 220 : (height ?? 0) >= 150 ? 180 : 120;
  return {
    liquid,
    height,
    radiator,
    sockets: new Set(list(product, "supported_sockets").map(socketKey)),
    capacity,
  };
}

// ---------------------------------------------------------------------------
// Catalog view with cached facts.
// ---------------------------------------------------------------------------
interface Part<F> { product: PlannerProduct; facts: F }

export interface PlannerCatalog {
  CPU: Part<CpuFacts>[];
  GPU: Part<GpuFacts>[];
  MOTHERBOARD: Part<BoardFacts>[];
  RAM: Part<RamFacts>[];
  STORAGE: Part<StorageFacts>[];
  PSU: Part<PsuFacts>[];
  CASE: Part<CaseFacts>[];
  COOLER: Part<CoolerFacts>[];
}

export function slotForProductType(productType: string): BuildSlot | undefined {
  const type = upper(productType);
  if (type === "MAINBOARD") return "MOTHERBOARD";
  return (BUILD_SLOTS as string[]).includes(type) ? type as BuildSlot : undefined;
}

export function createCatalog(products: PlannerProduct[]): PlannerCatalog {
  const catalog: PlannerCatalog = { CPU: [], GPU: [], MOTHERBOARD: [], RAM: [], STORAGE: [], PSU: [], CASE: [], COOLER: [] };
  for (const product of products) {
    if (!(product.price > 0)) continue;
    switch (slotForProductType(product.productType)) {
      case "CPU": catalog.CPU.push({ product, facts: cpuFacts(product) }); break;
      case "GPU": catalog.GPU.push({ product, facts: gpuFacts(product) }); break;
      case "MOTHERBOARD": catalog.MOTHERBOARD.push({ product, facts: boardFacts(product) }); break;
      case "RAM": catalog.RAM.push({ product, facts: ramFacts(product) }); break;
      case "STORAGE": catalog.STORAGE.push({ product, facts: storageFacts(product) }); break;
      case "PSU": catalog.PSU.push({ product, facts: psuFacts(product) }); break;
      case "CASE": catalog.CASE.push({ product, facts: caseFacts(product) }); break;
      case "COOLER": catalog.COOLER.push({ product, facts: coolerFacts(product) }); break;
      default: break;
    }
  }
  for (const slot of BUILD_SLOTS) catalog[slot].sort((left, right) => left.product.price - right.product.price);
  return catalog;
}

// ---------------------------------------------------------------------------
// Compatibility: the same rules the backend checks, used to filter candidates.
// ---------------------------------------------------------------------------
interface Facts {
  CPU?: Part<CpuFacts>; GPU?: Part<GpuFacts>; MOTHERBOARD?: Part<BoardFacts>; RAM?: Part<RamFacts>;
  STORAGE?: Part<StorageFacts>; PSU?: Part<PsuFacts>; CASE?: Part<CaseFacts>; COOLER?: Part<CoolerFacts>;
}

export function powerEstimate(cpu?: CpuFacts, gpu?: GpuFacts): number {
  return BASE_SYSTEM_WATT + (cpu?.power ?? 0) + (gpu?.power ?? 0);
}

export function requiredPsuWatt(cpu: CpuFacts | undefined, gpu: GpuFacts | undefined, priority: Priority): number {
  const needed = Math.max(powerEstimate(cpu, gpu) * PSU_HEADROOM[priority], gpu?.recommendedPsu ?? 0);
  return Math.ceil(needed / 50) * 50;
}

/**
 * Reasons the part in `slot` cannot sit with the other parts; empty when it fits.
 * Only rules that involve `slot` are reported, so a problem between two other parts
 * (say the PSU and the GPU) is never blamed on, or blocks, an unrelated SSD.
 */
function conflicts(slot: BuildSlot, candidate: Part<unknown>, build: Facts, priority: Priority): string[] {
  const next = { ...build, [slot]: candidate } as Facts;
  const { CPU: cpu, GPU: gpu, MOTHERBOARD: board, RAM: ram, STORAGE: storage, PSU: psu, CASE: pcCase, COOLER: cooler } = next;
  const problems: string[] = [];
  const add = (involved: BuildSlot[], message: string) => {
    if (involved.includes(slot)) problems.push(message);
  };
  if (cpu && board) {
    if (cpu.facts.socket !== board.facts.socket) add(["CPU", "MOTHERBOARD"], `Socket CPU ${cpu.facts.socket} khác bo mạch ${board.facts.socket}`);
    if (cpu.facts.memoryTypes.length && !cpu.facts.memoryTypes.includes(board.facts.memoryType)) {
      add(["CPU", "MOTHERBOARD"], `CPU không hỗ trợ RAM ${board.facts.memoryType} của bo mạch`);
    }
    // Entry chipsets ship with small power stages that throttle high-wattage CPUs.
    if (cpu.facts.power >= 150 && /^(H6|A5|A6)\d/.test(board.facts.chipset)) {
      add(["CPU", "MOTHERBOARD"], `Bo mạch ${board.facts.chipset} phổ thông, không nên dùng với CPU ${cpu.facts.power}W`);
    }
  }
  if (ram && board) {
    if (ram.facts.memoryType !== board.facts.memoryType) add(["RAM", "MOTHERBOARD"], `RAM ${ram.facts.memoryType} không lắp được bo mạch ${board.facts.memoryType}`);
    if (ram.facts.modules > board.facts.memorySlots) add(["RAM", "MOTHERBOARD"], `Kit ${ram.facts.modules} thanh nhưng bo mạch có ${board.facts.memorySlots} khe`);
    if (ram.facts.capacity > board.facts.maxMemory) add(["RAM", "MOTHERBOARD"], `RAM ${ram.facts.capacity}GB vượt mức ${board.facts.maxMemory}GB của bo mạch`);
  }
  if (storage && board && (storage.facts.nvme ? board.facts.m2Slots < 1 : board.facts.sataPorts < 1)) {
    add(["STORAGE", "MOTHERBOARD"], "Bo mạch không có cổng cho ổ này");
  }
  if (pcCase && board && pcCase.facts.formFactors.size && !pcCase.facts.formFactors.has(board.facts.formFactor)) {
    add(["CASE", "MOTHERBOARD"], `Case không hỗ trợ bo mạch ${board.facts.formFactor}`);
  }
  if (pcCase && gpu && pcCase.facts.maxGpu && gpu.facts.length && gpu.facts.length > pcCase.facts.maxGpu) {
    add(["CASE", "GPU"], `VGA dài ${gpu.facts.length}mm, case chỉ chứa ${pcCase.facts.maxGpu}mm`);
  }
  if (pcCase && psu && pcCase.facts.maxPsu && psu.facts.length && psu.facts.length > pcCase.facts.maxPsu) {
    add(["CASE", "PSU"], `Nguồn dài ${psu.facts.length}mm, case chỉ chứa ${pcCase.facts.maxPsu}mm`);
  }
  if (cooler && cpu && cooler.facts.sockets.size && !cooler.facts.sockets.has(cpu.facts.socket)) {
    add(["COOLER", "CPU"], `Tản nhiệt không hỗ trợ socket ${cpu.facts.socket}`);
  }
  if (cooler && cpu && cooler.facts.capacity < cpu.facts.power * (priority === "quiet" ? 1 : 0.85)) {
    add(["COOLER", "CPU"], `Tản nhiệt yếu so với CPU ${cpu.facts.power}W`);
  }
  if (cooler && pcCase) {
    if (cooler.facts.liquid && cooler.facts.radiator && pcCase.facts.maxRadiator && cooler.facts.radiator > pcCase.facts.maxRadiator) {
      add(["COOLER", "CASE"], `Radiator ${cooler.facts.radiator}mm lớn hơn vị trí ${pcCase.facts.maxRadiator}mm của case`);
    }
    if (!cooler.facts.liquid && cooler.facts.height && pcCase.facts.maxCooler && cooler.facts.height > pcCase.facts.maxCooler) {
      add(["COOLER", "CASE"], `Tản cao ${cooler.facts.height}mm, case chỉ chứa ${pcCase.facts.maxCooler}mm`);
    }
  }
  if (psu) {
    const required = requiredPsuWatt(cpu?.facts, gpu?.facts, priority);
    if ((cpu || gpu) && psu.facts.wattage < required) add(["PSU", "CPU", "GPU"], `Nguồn ${psu.facts.wattage}W thấp hơn mức nên dùng ${required}W`);
    if (gpu && gpu.facts.eightPins && psu.facts.pcieConnectors !== undefined && psu.facts.pcieConnectors < gpu.facts.eightPins) {
      add(["PSU", "GPU"], `VGA cần ${gpu.facts.eightPins} đầu 8-pin, nguồn có ${psu.facts.pcieConnectors}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Scoring: performance for the use case + quality of the supporting parts − cost.
// ---------------------------------------------------------------------------
function stepValue(table: Record<number, number>, value: number): number {
  const keys = Object.keys(table).map(Number).sort((left, right) => left - right);
  let result = table[keys[0]] - 6;
  for (const key of keys) if (value >= key) result = table[key];
  return result;
}

function vramFactor(vram: number, resolution: Resolution): number {
  if (resolution === "2160p") return vram < 12 ? 0.8 : vram < 16 ? 0.95 : 1;
  if (resolution === "1440p") return vram < 8 ? 0.85 : vram < 12 ? 0.96 : 1;
  return vram < 8 ? 0.92 : 1;
}

/** Frame-rate index: the slower of GPU (scaled by resolution) and CPU decides, as in a real frame. */
function gamingIndex(cpu: CpuFacts, gpu: GpuFacts | undefined, resolution: Resolution): number {
  const gpuSide = (gpu?.perf ?? 6) * RESOLUTION_LOAD[resolution] * (gpu ? vramFactor(gpu.vram, resolution) : 1);
  const cpuSide = cpu.gaming * 1.2;
  return (Math.min(gpuSide, cpuSide) + 0.08 * cpu.gaming) / RESOLUTION_LOAD[resolution];
}

function performancePoints(build: Facts, request: BuildRequest): number {
  const cpu = build.CPU?.facts;
  if (!cpu) return 0;
  const gpu = build.GPU?.facts;
  switch (request.useCase) {
    case "gaming": return gamingIndex(cpu, gpu, request.resolution);
    case "streaming": return 0.7 * gamingIndex(cpu, gpu, request.resolution) + 0.3 * cpu.multi;
    case "creator": return 0.55 * cpu.multi + 0.35 * (gpu?.perf ?? 8) + 0.1 * cpu.gaming;
    case "ai": {
      const gpuAi = gpu ? gpu.perf * (0.55 + 0.45 * Math.min(gpu.vram, 24) / 24) * (gpu.nvidia ? 1.1 : 0.85) : 4;
      return 0.6 * gpuAi + 0.4 * cpu.multi;
    }
    case "office": {
      // "Fast enough" saturates: beyond ~40 extra speed is barely noticeable for office work.
      const everyday = 0.5 * cpu.gaming + 0.5 * cpu.multi;
      return Math.min(everyday, 40) + 0.2 * Math.max(0, everyday - 40);
    }
  }
}

function qualityPoints(build: Facts, request: BuildRequest): number {
  const profile = PROFILES[request.useCase];
  const quietBoost = request.priority === "quiet" ? 2 : 1;
  const { CPU: cpu, GPU: gpu, MOTHERBOARD: board, RAM: ram, STORAGE: storage, PSU: psu, CASE: pcCase, COOLER: cooler } = build;
  let points = 0;
  if (ram) {
    points += stepValue(profile.ram, ram.facts.capacity);
    if ((request.useCase === "gaming" || request.useCase === "streaming") && ram.facts.memoryType === "DDR5" && ram.facts.rate >= 6000) points += 0.5;
  }
  if (storage) {
    points += stepValue(profile.storage, storage.facts.capacity);
    points += storage.facts.nvme ? (storage.facts.generation >= 4 ? 1.5 : 0.5) : -2;
  }
  if (psu) {
    points += psu.facts.efficiency * 0.75 * quietBoost;
    const headroom = psu.facts.wattage / Math.max(1, powerEstimate(cpu?.facts, gpu?.facts));
    points += headroom >= 1.6 ? 1 : headroom >= 1.35 ? 0.5 : 0;
    if (gpu?.facts.sixteenPin && psu.facts.nativeSixteenPin) points += 1;
  }
  if (cooler && cpu) {
    const headroom = cooler.facts.capacity / cpu.facts.power;
    points += (headroom >= 1.4 ? 2 : headroom >= 1.15 ? 1 : 0) * quietBoost;
  }
  if (board) {
    points += (board.facts.wifi ? 1 : 0) + (board.facts.m2Slots >= 3 ? 0.5 : 0) + (board.facts.memorySlots >= 4 ? 0.5 : 0);
    if (board.facts.memoryType === "DDR5") points += 1;
    if (cpu?.facts.unlocked && /^[ZX]/.test(board.facts.chipset)) points += 1;
  }
  if (pcCase) {
    points += Math.min(pcCase.facts.fans, 4) * 0.4 * quietBoost + (pcCase.facts.usbC ? 0.5 : 0);
  }
  return points;
}

function totalPrice(build: Facts): number {
  return BUILD_SLOTS.reduce((sum, slot) => sum + (build[slot]?.product.price ?? 0), 0);
}

function costWeight(request: BuildRequest): number {
  return PROFILES[request.useCase].costWeight * (request.priority === "performance" ? 0.6 : 1);
}

function score(build: Facts, request: BuildRequest): number {
  return performancePoints(build, request) + qualityPoints(build, request) - costWeight(request) * totalPrice(build) / 1_000_000;
}

// ---------------------------------------------------------------------------
// Search.
// ---------------------------------------------------------------------------
const COMPLETION_ORDER: BuildSlot[] = ["MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE", "COOLER"];

/** Cheapest valid part for every empty slot, respecting the profile minimums. */
function completeCheapest(base: Facts, catalog: PlannerCatalog, request: BuildRequest, memoryType?: string): Facts | undefined {
  const profile = PROFILES[request.useCase];
  const build: Facts = { ...base };
  for (const slot of COMPLETION_ORDER) {
    if (build[slot]) continue;
    const candidates = catalog[slot] as Part<unknown>[];
    const pick = candidates.find((candidate) => {
      if (slot === "MOTHERBOARD" && memoryType && (candidate as Part<BoardFacts>).facts.memoryType !== memoryType) return false;
      if (slot === "RAM" && (candidate as Part<RamFacts>).facts.capacity < profile.minRam) return false;
      if (slot === "STORAGE" && (candidate as Part<StorageFacts>).facts.capacity < profile.minStorage) return false;
      return conflicts(slot, candidate, build, request.priority).length === 0;
    });
    if (!pick) return undefined;
    (build as Record<BuildSlot, Part<unknown>>)[slot] = pick;
  }
  return build;
}

/**
 * Spend what is left of the budget: repeatedly take the single-part swap with the best
 * score gain per VND (score already charges for cost), until no swap is affordable and
 * worth it. Swaps that would break compatibility are never considered.
 */
function spendRemainder(start: Facts, catalog: PlannerCatalog, request: BuildRequest, slots: BuildSlot[]): Facts {
  let build = start;
  let current = score(build, request);
  for (let step = 0; step < 40; step++) {
    let best: { build: Facts; gain: number; ratio: number } | undefined;
    const price = totalPrice(build);
    for (const slot of slots) {
      const existing = build[slot];
      if (!existing) continue;
      for (const candidate of catalog[slot] as Part<unknown>[]) {
        if (candidate === existing) continue;
        const delta = candidate.product.price - existing.product.price;
        if (price + delta > request.budget) continue;
        if (conflicts(slot, candidate, build, request.priority).length) continue;
        const next = { ...build, [slot]: candidate } as Facts;
        if (!meetsMinimums(next, request)) continue;
        const gain = score(next, request) - current;
        if (gain <= 0.05) continue;
        const ratio = delta <= 0 ? Number.POSITIVE_INFINITY : gain / delta;
        if (!best || ratio > best.ratio || (ratio === best.ratio && gain > best.gain)) best = { build: next, gain, ratio };
      }
    }
    if (!best) break;
    build = best.build;
    current += best.gain;
  }
  return build;
}

function meetsMinimums(build: Facts, request: BuildRequest): boolean {
  const profile = PROFILES[request.useCase];
  return (!build.RAM || build.RAM.facts.capacity >= profile.minRam)
    && (!build.STORAGE || build.STORAGE.facts.capacity >= profile.minStorage);
}

interface Core { cpu: Part<CpuFacts>; gpu?: Part<GpuFacts>; memoryType: string; minimum: Facts; minimumScore: number }

function enumerateCores(catalog: PlannerCatalog, request: BuildRequest, budget: number): Core[] {
  const profile = PROFILES[request.useCase];
  const cores: Core[] = [];
  const cpus = catalog.CPU.filter((cpu) => request.platform === "any" || cpu.facts.vendor === request.platform);
  for (const cpu of cpus) {
    const gpus: (Part<GpuFacts> | undefined)[] = profile.needsGpu || !cpu.facts.igpu
      ? catalog.GPU
      : [undefined, ...(request.useCase === "office" ? [] : catalog.GPU)];
    const memoryTypes = cpu.facts.memoryTypes.length ? cpu.facts.memoryTypes : ["DDR4", "DDR5"];
    for (const gpu of gpus) {
      if (gpu && cpu.product.price + gpu.product.price > budget) continue;
      for (const memoryType of memoryTypes) {
        const base: Facts = gpu ? { CPU: cpu, GPU: gpu } : { CPU: cpu };
        const minimum = completeCheapest(base, catalog, request, memoryType);
        if (!minimum || totalPrice(minimum) > budget) continue;
        cores.push({ cpu, gpu, memoryType, minimum, minimumScore: score(minimum, request) });
      }
    }
  }
  return cores.sort((left, right) => right.minimumScore - left.minimumScore);
}

function bestBuild(catalog: PlannerCatalog, request: BuildRequest): Facts | undefined {
  const cores = enumerateCores(catalog, request, request.budget);
  let best: { build: Facts; score: number } | undefined;
  for (const core of cores.slice(0, 30)) {
    const build = spendRemainder(core.minimum, catalog, request, COMPLETION_ORDER);
    const value = score(build, request);
    if (!best || value > best.score || (value === best.score && totalPrice(build) < totalPrice(best.build))) {
      best = { build, score: value };
    }
  }
  return best?.build;
}

function cheapestBuild(catalog: PlannerCatalog, request: BuildRequest): Facts | undefined {
  const cores = enumerateCores(catalog, request, Number.POSITIVE_INFINITY);
  return cores.sort((left, right) => totalPrice(left.minimum) - totalPrice(right.minimum))[0]?.minimum;
}

// ---------------------------------------------------------------------------
// Analysis and explanations.
// ---------------------------------------------------------------------------
function factsFromParts(parts: BuildParts, catalog: PlannerCatalog): Facts {
  const facts: Facts = {};
  for (const slot of BUILD_SLOTS) {
    const product = parts[slot];
    if (!product) continue;
    const match = (catalog[slot] as Part<unknown>[]).find((part) => part.product.modelCode === product.modelCode);
    if (match) (facts as Record<BuildSlot, Part<unknown>>)[slot] = match;
  }
  return facts;
}

function partsFromFacts(build: Facts): BuildParts {
  const parts: BuildParts = {};
  for (const slot of BUILD_SLOTS) {
    const part = build[slot];
    if (part) parts[slot] = part.product;
  }
  return parts;
}

function fpsLabel(fps: number): string {
  return fps >= 120 ? "Rất mượt" : fps >= 60 ? "Mượt" : fps >= 35 ? "Chơi được, nên giảm thiết lập" : "Không đủ mượt";
}

export function estimateFps(cpu: CpuFacts, gpu: GpuFacts | undefined, ramGb: number, resolution: Resolution): GameFps[] {
  const gpuPerf = gpu?.perf ?? 6;
  const memory = ramGb < 16 ? 0.72 : ramGb < 32 ? 1 : 1.04;
  return GAMES.map((game) => {
    const gpuFps = game.base * (gpuPerf / 25) * RESOLUTION_FPS[resolution]
      * (gpu ? vramFactor(gpu.vram, resolution) : 1) * memory * (game.category === "ESPORTS" ? 1.45 : 1);
    const cpuCap = cpu.gaming * (game.category === "ESPORTS" ? 5 : 1.8);
    const fps = Math.max(1, Math.round(Math.min(gpuFps, cpuCap)));
    return { name: game.name, category: game.category, fps, label: fpsLabel(fps), limit: gpuFps >= cpuCap ? "cpu" : "gpu" };
  });
}

function bottleneck(cpu: CpuFacts, gpu: GpuFacts | undefined, resolution: Resolution): BuildAnalysis["bottleneck"] {
  if (!gpu) return undefined;
  const ratio = (gpu.perf * RESOLUTION_LOAD[resolution]) / (cpu.gaming * 1.2);
  if (ratio > 1.15) {
    return { kind: "cpu", message: `CPU đang giới hạn VGA ở ${RESOLUTION_LABEL[resolution]}: VGA còn khoảng ${Math.round((1 - 1 / ratio) * 100)}% sức mạnh chưa dùng hết. Nâng CPU hoặc chơi độ phân giải cao hơn sẽ khai thác tốt hơn.` };
  }
  if (ratio < 0.5) {
    return { kind: "gpu", message: `VGA là giới hạn chính ở ${RESOLUTION_LABEL[resolution]} (bình thường với game nặng). Nâng VGA sẽ tăng FPS rõ nhất.` };
  }
  return { kind: "balanced", message: `CPU và VGA cân bằng tốt ở ${RESOLUTION_LABEL[resolution]}, không linh kiện nào kìm hãm linh kiện nào.` };
}

function tierLabel(build: Facts, request: BuildRequest, fps: GameFps[]): string {
  if (request.useCase === "gaming" || request.useCase === "streaming") {
    const aaa = fps.filter((game) => game.category === "AAA");
    const average = aaa.reduce((sum, game) => sum + game.fps, 0) / Math.max(1, aaa.length);
    const where = RESOLUTION_LABEL[request.resolution];
    if (average >= 100) return `Chiến mọi game AAA ở ${where} rất mượt`;
    if (average >= 60) return `Chơi mượt game AAA ở ${where}`;
    if (average >= 40) return `Chơi tốt game AAA ở ${where} (thiết lập trung bình)`;
    return `Hợp game eSports, game AAA cần giảm thiết lập ở ${where}`;
  }
  const cpu = build.CPU?.facts;
  if (request.useCase === "office") return cpu && cpu.multi >= 35 ? "Văn phòng, học tập rất nhanh và đa nhiệm thoải mái" : "Đủ mượt cho văn phòng, học tập, xem phim";
  if (request.useCase === "creator") return (cpu?.multi ?? 0) >= 70 ? "Dựng phim 4K, render 3D chuyên nghiệp" : (cpu?.multi ?? 0) >= 45 ? "Dựng phim Full HD/2K và thiết kế mượt" : "Thiết kế 2D và dựng phim cơ bản";
  const vram = build.GPU?.facts.vram ?? 0;
  return vram >= 16 ? "Chạy và tinh chỉnh model AI cỡ vừa, lập trình nặng" : vram >= 12 ? "Chạy model AI nhỏ, lập trình và Docker thoải mái" : "Lập trình, học AI cơ bản";
}

function reasons(build: Facts, request: BuildRequest, fps: GameFps[]): Partial<Record<BuildSlot, string>> {
  const { CPU: cpu, GPU: gpu, MOTHERBOARD: board, RAM: ram, STORAGE: storage, PSU: psu, CASE: pcCase, COOLER: cooler } = build;
  const result: Partial<Record<BuildSlot, string>> = {};
  const power = powerEstimate(cpu?.facts, gpu?.facts);
  if (cpu) {
    const cores = cpu.facts.cores && cpu.facts.threads ? `${cpu.facts.cores} nhân ${cpu.facts.threads} luồng, ` : "";
    result.CPU = `${cores}sức mạnh chơi game ${Math.round(cpu.facts.gaming)}/100, đa nhiệm ${Math.round(cpu.facts.multi)}/100.`
      + (!gpu && cpu.facts.igpu ? " Có sẵn đồ họa tích hợp nên không cần mua VGA." : "");
  }
  if (gpu) {
    const aaa = fps.filter((game) => game.category === "AAA");
    const average = Math.round(aaa.reduce((sum, game) => sum + game.fps, 0) / Math.max(1, aaa.length));
    result.GPU = request.useCase === "ai"
      ? `${gpu.facts.vram}GB VRAM${gpu.facts.nvidia ? ", hỗ trợ CUDA cho hầu hết công cụ AI" : ""}; sức mạnh đồ họa ${gpu.facts.perf}/100.`
      : `Khoảng ${average} FPS trung bình game AAA ở ${RESOLUTION_LABEL[request.resolution]}, ${gpu.facts.vram}GB VRAM.`;
  }
  if (board) {
    result.MOTHERBOARD = `Đúng socket ${board.facts.socket} và RAM ${board.facts.memoryType}`
      + `${board.facts.wifi ? ", có Wi-Fi" : ""}; ${board.facts.m2Slots} khe M.2, ${board.facts.memorySlots} khe RAM để nâng cấp sau.`;
  }
  if (ram) {
    const need = { gaming: "chơi game kèm Discord, trình duyệt", streaming: "vừa chơi vừa stream", creator: "timeline dựng phim và file đồ họa lớn", ai: "dữ liệu và container khi lập trình", office: "mở nhiều tab và ứng dụng văn phòng" }[request.useCase];
    result.RAM = `${ram.facts.capacity}GB ${ram.facts.memoryType}${ram.facts.rate ? ` ${ram.facts.rate} MT/s` : ""}: đủ cho ${need}.`;
  }
  if (storage) {
    const games = Math.floor(storage.facts.capacity / 100);
    result.STORAGE = `${storage.facts.capacity >= 1000 ? `${storage.facts.capacity / 1000}TB` : `${storage.facts.capacity}GB`} `
      + `${storage.facts.nvme ? `NVMe PCIe ${storage.facts.generation || ""}`.trim() : "SATA"}: khởi động Windows vài giây`
      + (request.useCase === "gaming" || request.useCase === "streaming" ? `, chứa khoảng ${games} game AAA.` : ".");
  }
  if (psu) {
    result.PSU = `${psu.facts.wattage}W ${psu.facts.efficiencyLabel}: máy cần khoảng ${power}W khi tải nặng, `
      + `dư ${Math.max(0, Math.round((psu.facts.wattage / power - 1) * 100))}% cho ổn định và nâng cấp.`;
  }
  if (pcCase) {
    result.CASE = `${gpu?.facts.length && pcCase.facts.maxGpu ? `Chứa VGA dài ${gpu.facts.length}mm (tối đa ${pcCase.facts.maxGpu}mm)` : "Vừa bo mạch và linh kiện đã chọn"}`
      + `${pcCase.facts.fans ? `, có sẵn ${pcCase.facts.fans} quạt` : ""}${pcCase.facts.usbC ? ", cổng USB-C phía trước" : ""}.`;
  }
  if (cooler && cpu) {
    result.COOLER = `${cooler.facts.liquid ? `Tản nước AIO ${cooler.facts.radiator ?? ""}mm` : "Tản khí tháp"}: giải nhiệt khoảng ${cooler.facts.capacity}W, `
      + `đủ cho CPU ${cpu.facts.power}W lúc tải nặng.`;
  }
  return result;
}

/** Ceiling used to express a build's strength as a 0–100 rating for this use case. */
function performanceCeiling(catalog: PlannerCatalog, request: BuildRequest): number {
  const bestCpu = catalog.CPU.reduce<Part<CpuFacts> | undefined>((best, cpu) =>
    !best || cpu.facts.gaming + cpu.facts.multi > best.facts.gaming + best.facts.multi ? cpu : best, undefined);
  const bestGpu = catalog.GPU.reduce<Part<GpuFacts> | undefined>((best, gpu) => !best || gpu.facts.perf > best.facts.perf ? gpu : best, undefined);
  if (!bestCpu) return 1;
  return Math.max(1, performancePoints({ CPU: bestCpu, GPU: bestGpu }, request));
}

export function analyzeBuild(parts: BuildParts, catalog: PlannerCatalog, request: BuildRequest): BuildAnalysis {
  const build = factsFromParts(parts, catalog);
  const cpu = build.CPU?.facts;
  const gpu = build.GPU?.facts;
  const fps = cpu && (gpu || cpu.igpu) ? estimateFps(cpu, gpu, build.RAM?.facts.capacity ?? 16, request.resolution) : [];
  const issues: string[] = [];
  for (const slot of BUILD_SLOTS) {
    const part = build[slot];
    if (part) issues.push(...conflicts(slot, part, build, request.priority));
  }
  if (cpu && !gpu && !cpu.igpu) issues.push("CPU không có đồ họa tích hợp: cần thêm card đồ họa để có hình.");
  return {
    parts: partsFromFacts(build),
    total: totalPrice(build),
    score: score(build, request),
    performanceRating: Math.round(Math.min(100, performancePoints(build, request) / performanceCeiling(catalog, request) * 100)),
    tierLabel: cpu ? tierLabel(build, request, fps) : "",
    powerEstimate: powerEstimate(cpu, gpu),
    recommendedPsu: requiredPsuWatt(cpu, gpu, request.priority),
    bottleneck: cpu && (request.useCase === "gaming" || request.useCase === "streaming") ? bottleneck(cpu, gpu, request.resolution) : undefined,
    fps: request.useCase === "office" ? fps.filter((game) => game.category === "ESPORTS") : fps,
    reasons: reasons(build, request, fps),
    issues: [...new Set(issues)],
  };
}

function buildIsValid(build: Facts, request: BuildRequest): boolean {
  return BUILD_SLOTS.every((slot) => !build[slot] || conflicts(slot, build[slot] as Part<unknown>, build, request.priority).length === 0);
}

/**
 * Smallest set of follow-up swaps that makes a changed build valid again: a new platform
 * (board, then RAM of the same capacity), then storage, PSU, case and cooler, each time the
 * cheapest part that fits without being a silly downgrade.
 */
function repair(build: Facts, catalog: PlannerCatalog, request: BuildRequest): Facts | undefined {
  let next = { ...build };
  const board = next.MOTHERBOARD;
  if (board && next.CPU && conflicts("MOTHERBOARD", board, { CPU: next.CPU }, request.priority).length) {
    const options = catalog.MOTHERBOARD.filter((candidate) => candidate.product.price >= board.product.price * 0.6
      && conflicts("MOTHERBOARD", candidate, { CPU: next.CPU }, request.priority).length === 0);
    const replacement = options.find((candidate) => candidate.facts.formFactor === board.facts.formFactor) ?? options[0];
    if (!replacement) return undefined;
    next = { ...next, MOTHERBOARD: replacement };
  }
  const ram = next.RAM;
  if (ram && conflicts("RAM", ram, next, request.priority).length) {
    const options = catalog.RAM.filter((candidate) => conflicts("RAM", candidate, next, request.priority).length === 0);
    const replacement = options.find((candidate) => candidate.facts.capacity >= ram.facts.capacity) ?? options[options.length - 1];
    if (!replacement) return undefined;
    next = { ...next, RAM: replacement };
  }
  for (const slot of ["STORAGE", "PSU", "CASE", "COOLER"] as BuildSlot[]) {
    const current = next[slot];
    if (!current || conflicts(slot, current, next, request.priority).length === 0) continue;
    const replacement = (catalog[slot] as Part<unknown>[])
      .find((candidate) => candidate.product.price >= current.product.price * 0.6
        && conflicts(slot, candidate, next, request.priority).length === 0);
    if (!replacement) return undefined;
    next = { ...next, [slot]: replacement } as Facts;
  }
  return buildIsValid(next, request) ? next : undefined;
}

const SLOT_LABEL: Record<BuildSlot, string> = {
  CPU: "CPU", MOTHERBOARD: "bo mạch chủ", RAM: "RAM", GPU: "VGA", STORAGE: "SSD", PSU: "nguồn", CASE: "case", COOLER: "tản nhiệt",
};

const capacityLabel = (gb: number) => gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`;

/** Plain-language benefit of an upgrade that does not raise the performance index. */
function comfortGain(slot: BuildSlot, current: Part<unknown> | undefined, candidate: Part<unknown>): string {
  if (slot === "STORAGE" && current) {
    const from = (current as Part<StorageFacts>).facts.capacity;
    const to = (candidate as Part<StorageFacts>).facts.capacity;
    return to > from ? `Dung lượng ${capacityLabel(from)} → ${capacityLabel(to)}, chứa nhiều game và dữ liệu hơn` : "Ổ nhanh và bền hơn";
  }
  if (slot === "RAM" && current) {
    const from = (current as Part<RamFacts>).facts.capacity;
    const to = (candidate as Part<RamFacts>).facts.capacity;
    return to > from ? `RAM ${from}GB → ${to}GB, mở nhiều ứng dụng cùng lúc thoải mái hơn` : "RAM nhanh hơn";
  }
  if (slot === "COOLER") return "CPU mát và êm hơn khi chạy nặng lâu";
  if (slot === "PSU") return "Nguồn hiệu suất cao hơn, dư công suất để nâng cấp sau";
  return "Bền và thoải mái hơn khi dùng lâu dài";
}

/** Single-part upgrades ranked by performance gained per million VND (with any needed fixes). */
export function suggestUpgrades(parts: BuildParts, catalog: PlannerCatalog, request: BuildRequest, limit = 4): UpgradeSuggestion[] {
  const build = factsFromParts(parts, catalog);
  if (!build.CPU) return [];
  const basePerf = Math.max(1, performancePoints(build, request));
  const baseQuality = qualityPoints(build, request);
  const basePrice = totalPrice(build);
  const suggestions: (UpgradeSuggestion & { value: number })[] = [];
  for (const slot of ["GPU", "CPU", "RAM", "STORAGE", "COOLER", "PSU"] as BuildSlot[]) {
    const current = build[slot];
    if (!current && slot !== "GPU") continue;
    let bestForSlot: (UpgradeSuggestion & { value: number }) | undefined;
    for (const candidate of catalog[slot] as Part<unknown>[]) {
      if (current && candidate.product.price <= current.product.price) continue;
      const fixed = repair({ ...build, [slot]: candidate } as Facts, catalog, request);
      if (!fixed) continue;
      const priceDelta = totalPrice(fixed) - basePrice;
      if (priceDelta <= 0 || priceDelta > Math.max(request.budget * 0.45, 3_000_000)) continue;
      const gainPercent = (performancePoints(fixed, request) / basePerf - 1) * 100;
      const qualityGain = qualityPoints(fixed, request) - baseQuality;
      const benefit = gainPercent + qualityGain * 1.5;
      if (benefit < 2) continue;
      const value = benefit / (priceDelta / 1_000_000);
      if (bestForSlot && value <= bestForSlot.value) continue;
      const changed = BUILD_SLOTS.filter((other) => other !== slot && fixed[other] !== build[other]);
      bestForSlot = {
        slot,
        title: `${current ? "Nâng" : "Thêm"} ${SLOT_LABEL[slot]}: ${candidate.product.productName}`,
        detail: (gainPercent >= 1 ? `Hiệu năng tăng khoảng ${Math.round(gainPercent)}%` : comfortGain(slot, current, candidate))
          + (changed.length ? `; đổi kèm ${changed.map((other) => SLOT_LABEL[other]).join(", ")} để vẫn tương thích` : "")
          + ".",
        priceDelta,
        gainPercent: Math.round(gainPercent),
        parts: partsFromFacts(fixed),
        value,
      };
    }
    if (bestForSlot) suggestions.push(bestForSlot);
  }
  return suggestions.sort((left, right) => right.value - left.value).slice(0, limit)
    .map(({ value: _value, ...suggestion }) => suggestion);
}

/** Main entry point: plan the best build for the request plus cheaper/stronger alternatives. */
export function planBuild(catalog: PlannerCatalog, request: BuildRequest): PlanResult {
  const cheapest = cheapestBuild(catalog, request);
  if (!cheapest) return { status: "no-build", upgrades: [] };
  const minimumBudget = totalPrice(cheapest);
  const best = bestBuild(catalog, request);
  if (!best) {
    return { status: "budget-too-low", minimumBudget, build: analyzeBuild(partsFromFacts(cheapest), catalog, request), upgrades: [] };
  }
  const build = analyzeBuild(partsFromFacts(best), catalog, request);
  const cheaperFacts = request.budget * 0.8 >= minimumBudget
    ? bestBuild(catalog, { ...request, budget: Math.round(request.budget * 0.8) }) : undefined;
  const strongerFacts = bestBuild(catalog, { ...request, budget: Math.round(request.budget * 1.25) });
  const stronger = strongerFacts ? analyzeBuild(partsFromFacts(strongerFacts), catalog, request) : undefined;
  const cheaper = cheaperFacts ? analyzeBuild(partsFromFacts(cheaperFacts), catalog, request) : undefined;
  return {
    status: "ok",
    build,
    minimumBudget,
    upgrades: suggestUpgrades(build.parts, catalog, request),
    cheaper: cheaper && cheaper.total < build.total ? cheaper : undefined,
    stronger: stronger && stronger.performanceRating > build.performanceRating ? stronger : undefined,
  };
}

/** Parts of a slot that fit the other selected parts (manual mode), with the reasons others do not. */
export function slotOptions(slot: BuildSlot, parts: BuildParts, catalog: PlannerCatalog, request: BuildRequest) {
  const build = factsFromParts(parts, catalog);
  delete build[slot];
  return (catalog[slot] as Part<unknown>[]).map((candidate) => ({
    product: candidate.product,
    problems: conflicts(slot, candidate, build, request.priority),
  }));
}

// ---------------------------------------------------------------------------
// Expert mode: benchmark sheet and what-if comparisons.
// ---------------------------------------------------------------------------
export const RESOLUTIONS: Resolution[] = ["1080p", "1440p", "2160p"];

/** Specification codes worth showing side by side for each slot (expert spec sheet). */
export const KEY_SPECS: Record<BuildSlot, string[]> = {
  CPU: ["socket", "architecture", "core_count", "thread_count", "base_clock_ghz", "max_boost_clock_ghz", "cache_l2_mb", "cache_l3_mb", "tdp_watt", "max_turbo_power_watt", "integrated_graphics", "memory_types_supported", "max_memory_data_rate_mt_s", "pcie_generation", "manufacturing_process", "unlocked_multiplier"],
  MOTHERBOARD: ["socket", "chipset", "form_factor", "memory_type", "memory_slot_count", "max_memory_gb", "max_memory_data_rate_mt_s", "pcie_slots", "m2_slot_count", "sata_port_count", "lan_controller", "wireless_standards", "usb_ports"],
  RAM: ["capacity_gb", "modules_per_kit", "memory_type", "data_rate_mt_s", "cas_latency_cycles", "memory_timings_cycles", "voltage_v", "memory_profiles"],
  GPU: ["gpu_chip", "architecture", "vram_gb", "memory_type", "memory_bus_width_bit", "memory_bandwidth_gbs", "boost_clock_mhz", "pcie_generation", "board_power_watt", "recommended_psu_watt", "power_connectors", "board_length_mm", "slot_thickness", "display_outputs"],
  STORAGE: ["capacity_gb", "interface", "form_factor", "nand_type", "dram_cache", "sequential_read_mb_s", "sequential_write_mb_s", "random_read_iops", "random_write_iops", "endurance_tbw"],
  PSU: ["wattage", "efficiency_rating", "atx_version", "modularity", "connectors", "native_16pin_connector", "dimensions_mm"],
  CASE: ["case_form_factor", "motherboard_form_factors", "max_gpu_length_mm", "max_cooler_height_mm", "max_psu_length_mm", "radiator_support", "included_fans", "fan_mounts", "front_io_ports"],
  COOLER: ["cooler_type", "cooler_height_mm", "radiator_dimensions_mm", "fan_count", "fan_size_mm", "airflow_cfm", "noise_db_a", "supported_sockets"],
};

export interface Balance { kind: "cpu" | "gpu" | "balanced"; gpuUtilization: number; cpuUtilization: number }

export interface Benchmark {
  total: number;
  cpuGaming?: number;
  cpuMulti?: number;
  gpuIndex?: number;
  vram?: number;
  ramGb?: number;
  ramRate?: number;
  storageRead?: number;
  power: number;
  psuWattage?: number;
  /** Estimated full-load draw as a share of the PSU rating (0–1+). */
  psuLoad?: number;
  /** Cooler capacity divided by CPU peak power. */
  coolingHeadroom?: number;
  useCaseScore: number;
  fps: Record<Resolution, GameFps[]>;
  balance: Partial<Record<Resolution, Balance>>;
}

/** Which side limits frame rate at a resolution; undefined without a discrete GPU. */
function balanceAt(cpu: CpuFacts | undefined, gpu: GpuFacts | undefined, resolution: Resolution): Balance | undefined {
  if (!cpu || !gpu) return undefined;
  const gpuSide = gpu.perf * RESOLUTION_LOAD[resolution] * vramFactor(gpu.vram, resolution);
  const cpuSide = cpu.gaming * 1.2;
  return {
    kind: gpuSide > cpuSide * 1.15 ? "cpu" : gpuSide < cpuSide * 0.87 ? "gpu" : "balanced",
    gpuUtilization: Math.min(1, cpuSide / gpuSide),
    cpuUtilization: Math.min(1, gpuSide / cpuSide),
  };
}

export function benchmarkBuild(parts: BuildParts, catalog: PlannerCatalog, request: BuildRequest): Benchmark {
  const build = factsFromParts(parts, catalog);
  const cpu = build.CPU?.facts;
  const gpu = build.GPU?.facts;
  const power = powerEstimate(cpu, gpu);
  const fps = {} as Record<Resolution, GameFps[]>;
  const balance: Partial<Record<Resolution, Balance>> = {};
  for (const resolution of RESOLUTIONS) {
    fps[resolution] = cpu && (gpu || cpu.igpu) ? estimateFps(cpu, gpu, build.RAM?.facts.capacity ?? 16, resolution) : [];
    const atResolution = balanceAt(cpu, gpu, resolution);
    if (atResolution) balance[resolution] = atResolution;
  }
  const psu = build.PSU?.facts;
  return {
    total: totalPrice(build),
    cpuGaming: cpu?.gaming,
    cpuMulti: cpu?.multi,
    gpuIndex: gpu?.perf,
    vram: gpu?.vram,
    ramGb: build.RAM?.facts.capacity,
    ramRate: build.RAM?.facts.rate || undefined,
    storageRead: build.STORAGE ? num(build.STORAGE.product, "sequential_read_mb_s") : undefined,
    power,
    psuWattage: psu?.wattage,
    psuLoad: psu?.wattage ? power / psu.wattage : undefined,
    coolingHeadroom: build.COOLER && cpu ? build.COOLER.facts.capacity / cpu.power : undefined,
    useCaseScore: performancePoints(build, request),
    fps,
    balance,
  };
}

export interface WhatIfRow {
  product: PlannerProduct;
  status: "current" | "ok" | "repair" | "blocked";
  /** Parts of the build after the swap (and any follow-up swaps); absent when blocked. */
  parts?: BuildParts;
  repairs: BuildSlot[];
  problems: string[];
  priceDelta: number;
  metric: string;
  /** Use-case performance change in percent. */
  perfDelta: number;
  /** Average AAA frame-rate change in percent at the request resolution. */
  fpsDelta?: number;
  /** Performance percent gained per million VND spent (upgrades only). */
  valuePerMillion?: number;
  /** Every AAA title is CPU-limited after the swap: a stronger GPU would add no frames. */
  cpuCapped: boolean;
  /** Speed change in percent on the use case's headline task (see TASK_HEADLINE). */
  taskDelta?: number;
}

function slotMetric(slot: BuildSlot, part: Part<unknown>): string {
  switch (slot) {
    case "CPU": { const facts = part.facts as CpuFacts; return `Game ${Math.round(facts.gaming)} · Đa nhân ${Math.round(facts.multi)} · ${facts.power}W`; }
    case "GPU": { const facts = part.facts as GpuFacts; return `Raster ${facts.perf} · ${facts.vram}GB · ${Math.round(facts.bandwidth)}GB/s · ${facts.power}W`; }
    case "MOTHERBOARD": { const facts = part.facts as BoardFacts; return `${facts.chipset || "?"} · ${facts.formFactor} · ${facts.memoryType} · ${facts.m2Slots} M.2${facts.wifi ? " · Wi-Fi" : ""}`; }
    case "RAM": { const facts = part.facts as RamFacts; return `${facts.capacity}GB (${facts.modules}×${facts.capacity / facts.modules}) ${facts.memoryType}${facts.rate ? `-${facts.rate}` : ""}`; }
    case "STORAGE": { const facts = part.facts as StorageFacts; const read = num(part.product, "sequential_read_mb_s"); return `${capacityLabel(facts.capacity)} · ${facts.nvme ? `NVMe Gen${facts.generation || "?"}` : "SATA"}${read ? ` · ${read} MB/s` : ""}`; }
    case "PSU": { const facts = part.facts as PsuFacts; return `${facts.wattage}W · ${facts.efficiencyLabel || "?"}${facts.nativeSixteenPin ? " · 16-pin" : ""}`; }
    case "CASE": { const facts = part.facts as CaseFacts; return `VGA ≤${facts.maxGpu ?? "?"}mm · tản ≤${facts.maxCooler ?? "?"}mm · ${facts.fans} quạt`; }
    case "COOLER": { const facts = part.facts as CoolerFacts; return `${facts.liquid ? `AIO ${facts.radiator ?? "?"}mm` : `Tháp ${facts.height ?? "?"}mm`} · ~${facts.capacity}W`; }
  }
}

function aaaGames(build: Facts, resolution: Resolution): GameFps[] {
  const cpu = build.CPU?.facts;
  if (!cpu || (!build.GPU && !cpu.igpu)) return [];
  return estimateFps(cpu, build.GPU?.facts, build.RAM?.facts.capacity ?? 16, resolution).filter((game) => game.category === "AAA");
}

function averageAaa(build: Facts, resolution: Resolution): number | undefined {
  const games = aaaGames(build, resolution);
  return games.length ? games.reduce((sum, game) => sum + game.fps, 0) / games.length : undefined;
}

function cpuCapped(build: Facts, resolution: Resolution): boolean {
  const games = aaaGames(build, resolution);
  return games.length > 0 && Boolean(build.GPU) && games.every((game) => game.limit === "cpu");
}

/** Every alternative for one slot with its effect on the whole build (expert what-if table). */
export function whatIfRows(slot: BuildSlot, parts: BuildParts, catalog: PlannerCatalog, request: BuildRequest): WhatIfRow[] {
  const build = factsFromParts(parts, catalog);
  const current = build[slot];
  const basePerf = performancePoints(build, request);
  const baseFps = averageAaa(build, request.resolution);
  const baseTask = taskSpeed(build, request);
  const basePrice = totalPrice(build);
  return (catalog[slot] as Part<unknown>[]).map((candidate): WhatIfRow => {
    const metric = slotMetric(slot, candidate);
    if (candidate === current) {
      return {
        product: candidate.product, status: "current", parts: partsFromFacts(build), repairs: [], problems: [],
        priceDelta: 0, metric, perfDelta: 0, fpsDelta: 0, cpuCapped: cpuCapped(build, request.resolution), taskDelta: 0,
      };
    }
    const swapped = { ...build, [slot]: candidate } as Facts;
    const fixed = buildIsValid(swapped, request) ? swapped : repair(swapped, catalog, request);
    if (!fixed) {
      const problems = conflicts(slot, candidate, build, request.priority);
      return {
        product: candidate.product, status: "blocked", repairs: [], metric, perfDelta: 0,
        problems: problems.length ? problems : ["Không tìm được linh kiện đi kèm để giữ tương thích"],
        priceDelta: candidate.product.price - (current?.product.price ?? 0), cpuCapped: false,
      };
    }
    const repairs = BUILD_SLOTS.filter((other) => other !== slot && fixed[other] !== build[other]);
    const priceDelta = totalPrice(fixed) - basePrice;
    const perfDelta = basePerf > 0 ? (performancePoints(fixed, request) / basePerf - 1) * 100 : 0;
    const fps = averageAaa(fixed, request.resolution);
    const task = taskSpeed(fixed, request);
    return {
      product: candidate.product,
      status: repairs.length ? "repair" : "ok",
      parts: partsFromFacts(fixed),
      repairs,
      problems: [],
      priceDelta,
      metric,
      perfDelta,
      fpsDelta: baseFps && fps ? (fps / baseFps - 1) * 100 : undefined,
      valuePerMillion: priceDelta > 0 && perfDelta > 0 ? perfDelta / (priceDelta / 1_000_000) : undefined,
      cpuCapped: cpuCapped(fixed, request.resolution),
      taskDelta: baseTask && task ? (task / baseTask - 1) * 100 : undefined,
    };
  });
}

// --- Workloads beyond gaming (analysis view) ---------------------------------
// Reference-only estimates. Local LLM decoding is memory-bound (every weight is read
// once per token), so tokens/s follow bandwidth ÷ model size. Compute tasks follow the
// relative CPU/GPU indices, calibrated so the strongest catalog parts land near
// published results (RTX 5090 ≈ 14 500 Blender points, Ryzen 9 9950X ≈ 2 240 Cinebench 2024).

export type WorkloadGroup = "video" | "ai" | "dev";
export interface WorkloadMetric {
  key: string;
  group: WorkloadGroup;
  label: string;
  /** Comparable number; undefined when the build cannot run the task. */
  value?: number;
  text: string;
  note?: string;
  /** true when a larger value is better. */
  higher: boolean;
}

export const WORKLOAD_GROUPS: Record<WorkloadGroup, { title: string; detail: string }> = {
  video: { title: "Dựng video & đồ họa", detail: "Premiere, DaVinci Resolve, Blender, render bằng CPU" },
  ai: { title: "AI chạy trên máy", detail: "LLM qua Ollama / llama.cpp (Q4), tạo ảnh Stable Diffusion" },
  dev: { title: "Lập trình & đa nhiệm", detail: "Biên dịch, máy ảo, Docker" },
};

/** Headline task per use case, used for the what-if column. */
export const TASK_HEADLINE: Partial<Record<UseCase, string>> = {
  gaming: "Δ FPS AAA", streaming: "Δ FPS AAA", creator: "Δ tốc độ xuất video 4K", ai: "Δ tốc độ LLM 14B",
};

const LLM_MODELS = [
  { key: "llm8", label: "Llama 3.1 8B", sizeGb: 4.9 },
  { key: "llm14", label: "Qwen 2.5 14B", sizeGb: 9 },
  { key: "llm32", label: "Qwen 2.5 32B", sizeGb: 19.9 },
  { key: "llm70", label: "Llama 3.3 70B", sizeGb: 42.5 },
];
/** Common Q4 model classes: [billions of parameters, file size in GB]. */
const MODEL_CLASSES: [number, number][] = [[3, 2], [8, 4.9], [14, 9], [24, 14.3], [32, 19.9], [70, 42.5]];
const VRAM_RESERVE_GB = 1.5; // context cache and display output
const RAM_RESERVE_GB = 6; // operating system and open apps

const decimal = (value: number, digits = 1) => value.toLocaleString("vi-VN", { maximumFractionDigits: digits });
const duration = (seconds: number) => seconds < 90 ? `~${Math.round(seconds)} giây` : `~${decimal(seconds / 60)} phút`;

function memoryBandwidth(build: Facts): { gbs: number; channels: number } | undefined {
  const ram = build.RAM?.facts;
  if (!ram?.rate) return undefined;
  const channels = Math.min(2, Math.max(1, ram.modules));
  return { gbs: (ram.rate * 8 * channels) / 1000, channels };
}

function llmRun(sizeGb: number, build: Facts): { tokens?: number; where: string } {
  const gpu = build.GPU?.facts;
  const system = memoryBandwidth(build);
  const onGpu = gpu ? Math.min(sizeGb, Math.max(0, gpu.vram - VRAM_RESERVE_GB)) : 0;
  const onCpu = sizeGb - onGpu;
  const ramRoom = Math.max(0, (build.RAM?.facts.capacity ?? 0) - RAM_RESERVE_GB);
  if (onCpu > ramRoom + 1e-9 || (onCpu > 0 && !system)) {
    return { where: `Cần ~${Math.ceil(sizeGb)} GB trống trên VRAM + RAM` };
  }
  // About 60 % of peak bandwidth is reachable with CUDA, a little less on ROCm/Vulkan and on system RAM.
  const gpuRate = gpu ? gpu.bandwidth * (gpu.vendor === "nvidia" ? 0.6 : 0.5) : 0;
  const seconds = (onGpu > 0 ? onGpu / gpuRate : 0) + (onCpu > 0 ? onCpu / (system!.gbs * 0.65) : 0);
  return {
    tokens: 1 / seconds,
    where: onCpu === 0 ? "Chạy trọn trong VRAM"
      : onGpu === 0 ? "Chạy bằng CPU + RAM"
        : `${Math.round((onGpu / sizeGb) * 100)}% trong VRAM, phần còn lại ở RAM nên chậm hẳn`,
  };
}

const tokenWord = (tokens: number) => tokens >= 30 ? "rất nhanh" : tokens >= 10 ? "mượt" : tokens >= 4 ? "đọc kịp" : "chậm";

function exportMinutes(cpu: CpuFacts, gpu: GpuFacts | undefined): number {
  return 2.6 * (0.5 * (100 / cpu.multi) ** 0.6 + 0.5 * (100 / (gpu?.perf ?? 6)) ** 0.6);
}

function encoderLabel(cpu: CpuFacts, gpu: GpuFacts | undefined): string {
  if (gpu) {
    const name = { nvidia: "NVIDIA NVENC", amd: "AMD VCN", intel: "Intel Quick Sync", other: "Bộ mã hóa trên VGA" }[gpu.vendor];
    return `${name} · H.264, HEVC${gpu.av1Encode ? ", AV1" : ""}`;
  }
  if (cpu.igpu) return `${cpu.vendor === "intel" ? "Intel Quick Sync" : "AMD VCN"} (iGPU) · H.264, HEVC`;
  return "Không có, mã hóa bằng CPU";
}

function sdxlSeconds(gpu: GpuFacts | undefined): number | undefined {
  if (!gpu) return undefined;
  const software = gpu.vendor === "nvidia" ? 1 : 0.55; // CUDA is still the best-supported path
  const memory = gpu.vram < 8 ? 2 : gpu.vram < 10 ? 1.15 : 1;
  return 3.2 * (100 / (gpu.perf * software)) ** 1.3 * memory;
}

function blenderScore(gpu: GpuFacts | undefined): number | undefined {
  if (!gpu) return undefined;
  const backend = gpu.vendor === "nvidia" ? 1 : gpu.vendor === "amd" ? 0.45 : 0.5; // OptiX vs HIP / oneAPI
  return 14_500 * ((gpu.perf / 100) * backend) ** 1.15;
}

const cinebenchScore = (cpu: CpuFacts) => 2240 * (cpu.multi / 100) ** 0.85;
const kernelSeconds = (cpu: CpuFacts) => 38 * (100 / cpu.multi) ** 0.85;

function taskSpeed(build: Facts, request: BuildRequest): number | undefined {
  switch (request.useCase) {
    case "gaming":
    case "streaming": return averageAaa(build, request.resolution);
    case "creator": return build.CPU ? 1 / exportMinutes(build.CPU.facts, build.GPU?.facts) : undefined;
    case "ai": return llmRun(LLM_MODELS[1].sizeGb, build).tokens;
    case "office": return undefined;
  }
}

/** Video, AI and developer workload estimates for a build (analysis view). */
export function workloadBench(parts: BuildParts, catalog: PlannerCatalog): WorkloadMetric[] {
  const build = factsFromParts(parts, catalog);
  const cpu = build.CPU?.facts;
  if (!cpu) return [];
  const gpu = build.GPU?.facts;
  const metrics: WorkloadMetric[] = [];

  const exportTime = exportMinutes(cpu, gpu);
  metrics.push({
    key: "export4k", group: "video", label: "Xuất video 4K dài 10 phút (H.265)", value: exportTime,
    text: duration(exportTime * 60), note: "Chỉnh màu cơ bản, xuất bằng bộ mã hóa phần cứng", higher: false,
  });
  metrics.push({ key: "encoder", group: "video", label: "Bộ mã hóa video phần cứng", text: encoderLabel(cpu, gpu), higher: true });
  const blender = blenderScore(gpu);
  metrics.push({
    key: "blender", group: "video", label: "Render 3D Blender bằng VGA", value: blender,
    text: blender ? `≈ ${decimal(Math.round(blender / 10) * 10, 0)} điểm` : "Chỉ render được bằng CPU",
    note: "Thang điểm Blender Benchmark", higher: true,
  });
  const cinebench = cinebenchScore(cpu);
  metrics.push({
    key: "cinebench", group: "video", label: "Render bằng CPU (Cinebench 2024 đa nhân)", value: cinebench,
    text: `≈ ${decimal(Math.round(cinebench / 5) * 5, 0)} điểm`, higher: true,
  });

  for (const model of LLM_MODELS) {
    const run = llmRun(model.sizeGb, build);
    metrics.push({
      key: model.key, group: "ai", label: `Chat với ${model.label} (Q4)`, value: run.tokens,
      text: run.tokens ? `${decimal(run.tokens, run.tokens < 10 ? 1 : 0)} token/s · ${tokenWord(run.tokens)}` : "Không chạy được",
      note: run.where, higher: true,
    });
  }
  const fits = gpu ? MODEL_CLASSES.filter(([, size]) => size + VRAM_RESERVE_GB <= gpu.vram).pop() : undefined;
  metrics.push({
    key: "maxModel", group: "ai", label: "Model lớn nhất chạy trọn trong VRAM", value: fits?.[0] ?? 0,
    text: fits ? `~${fits[0]}B tham số (Q4)` : gpu ? "Dưới 3B tham số" : "Không có VGA rời", higher: true,
  });
  const sdxl = sdxlSeconds(gpu);
  metrics.push({
    key: "sdxl", group: "ai", label: "Tạo ảnh SDXL 1024×1024, 30 bước", value: sdxl,
    text: sdxl ? `${duration(sdxl)}/ảnh` : "Cần VGA rời",
    note: gpu && gpu.vendor !== "nvidia" ? "VGA AMD/Intel phải qua ROCm, ZLUDA hoặc DirectML nên chậm hơn" : undefined, higher: false,
  });
  if (gpu) {
    metrics.push({ key: "vramBandwidth", group: "ai", label: "Băng thông VRAM", value: gpu.bandwidth, text: `${decimal(gpu.bandwidth, 0)} GB/s`, higher: true });
  }
  const read = build.STORAGE ? num(build.STORAGE.product, "sequential_read_mb_s") : undefined;
  if (read) {
    const seconds = (LLM_MODELS[1].sizeGb * 1000) / read;
    metrics.push({
      key: "modelLoad", group: "ai", label: "Nạp model 14B từ SSD", value: seconds,
      text: `~${decimal(seconds)} giây`, note: `Đọc tuần tự ${decimal(read, 0)} MB/s`, higher: false,
    });
  }

  const kernel = kernelSeconds(cpu);
  metrics.push({
    key: "kernel", group: "dev", label: "Biên dịch Linux kernel (defconfig)", value: kernel,
    text: duration(kernel), note: "Thước đo quen thuộc cho các dự án C/C++ lớn", higher: false,
  });
  const threads = cpu.threads ?? (cpu.cores ? cpu.cores * 2 : 8);
  metrics.push({ key: "threads", group: "dev", label: "Nhân / luồng CPU", value: threads, text: `${cpu.cores ?? "?"} nhân / ${threads} luồng`, higher: true });
  const ramGb = build.RAM?.facts.capacity;
  if (ramGb) {
    const machines = Math.max(0, Math.min(Math.floor(threads / 2) - 1, Math.floor((ramGb - 8) / 4)));
    metrics.push({
      key: "vms", group: "dev", label: "Máy ảo 2 vCPU · 4 GB chạy song song", value: machines,
      text: machines ? `${machines} máy` : "Không đủ tài nguyên", note: "Đã chừa 8 GB RAM và 2 luồng cho máy chính", higher: true,
    });
  }
  const bandwidth = memoryBandwidth(build);
  if (bandwidth) {
    metrics.push({
      key: "ramBandwidth", group: "dev", label: "Băng thông RAM", value: bandwidth.gbs,
      text: `${decimal(bandwidth.gbs)} GB/s · ${bandwidth.channels} kênh`,
      note: bandwidth.channels < 2 ? "Chỉ chạy 1 kênh: nên dùng kit 2 thanh" : undefined, higher: true,
    });
  }
  return metrics;
}

export const USE_CASE_LABEL: Record<UseCase, string> = Object.fromEntries(
  Object.entries(PROFILES).map(([key, profile]) => [key, profile.label]),
) as Record<UseCase, string>;
export { RESOLUTION_LABEL, SLOT_LABEL };
