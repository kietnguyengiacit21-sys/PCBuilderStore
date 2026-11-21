import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILD_SLOTS,
  analyzeBuild,
  benchmarkBuild,
  createCatalog,
  whatIfRows,
  workloadBench,
  TASK_HEADLINE,
  estimateFps,
  cpuFacts,
  gpuFacts,
  planBuild,
  slotOptions,
  suggestUpgrades,
} from "../src/v2/build-planner.ts";

const M = 1_000_000;
const product = (modelCode, productType, productName, price, specifications) =>
  ({ modelCode, productType, productName, price: price * M, specifications });

const products = [
  product("I5-12400F", "CPU", "Core i5-12400F", 3, { socket: "LGA1700", memory_types_supported: ["DDR4", "DDR5"], integrated_graphics: "Không có", max_turbo_power_watt: 117, core_count: 6, thread_count: 12 }),
  product("I5-12400", "CPU", "Core i5-12400", 3.5, { socket: "LGA1700", memory_types_supported: ["DDR4", "DDR5"], integrated_graphics: "Intel UHD Graphics 730", max_turbo_power_watt: 117 }),
  product("R7-7800X3D", "CPU", "Ryzen 7 7800X3D", 8, { socket: "AM5", memory_types_supported: ["DDR5"], integrated_graphics: "AMD Radeon Graphics", max_turbo_power_watt: 162 }),
  product("I7-14700K", "CPU", "Core i7-14700K", 11, { socket: "LGA1700", memory_types_supported: ["DDR4", "DDR5"], integrated_graphics: "Intel UHD Graphics 770", max_turbo_power_watt: 253, unlocked_multiplier: true }),
  product("RTX4060", "GPU", "Dual RTX 4060", 8.5, { gpu_chip: "NVIDIA GeForce RTX 4060", vram_gb: 8, board_power_watt: 115, board_length_mm: 227, recommended_psu_watt: 550, power_connectors: ["1 x 8-pin"] }),
  product("RTX5070", "GPU", "RTX 5070 Windforce", 18, { gpu_chip: "NVIDIA GeForce RTX 5070", vram_gb: 12, board_power_watt: 250, board_length_mm: 261, recommended_psu_watt: 650, power_connectors: ["1 x 16-pin"] }),
  product("RTX5090", "GPU", "RTX 5090 Trio", 66, { gpu_chip: "NVIDIA GeForce RTX 5090", vram_gb: 32, board_power_watt: 575, board_length_mm: 360, recommended_psu_watt: 1200, power_connectors: ["1 x 16-pin"] }),
  product("B760M-D4", "MOTHERBOARD", "B760M DDR4", 2.5, { socket: "LGA1700", memory_type: "DDR4", form_factor: "mATX", memory_slot_count: 4, max_memory_gb: 128, m2_slot_count: 2, wireless_standards: ["Không tích hợp"], chipset: "B760" }),
  product("B760-D5", "MOTHERBOARD", "B760 DDR5 WiFi", 3.5, { socket: "LGA1700", memory_type: "DDR5", form_factor: "ATX", memory_slot_count: 4, max_memory_gb: 192, m2_slot_count: 3, wireless_standards: ["Wi-Fi 6E"], chipset: "B760" }),
  product("B650", "MOTHERBOARD", "B650 WiFi", 3.8, { socket: "AM5", memory_type: "DDR5", form_factor: "ATX", memory_slot_count: 4, max_memory_gb: 192, m2_slot_count: 2, wireless_standards: ["Wi-Fi 6"], chipset: "AMD B650" }),
  product("D4-16", "RAM", "DDR4 16GB", 1, { capacity_gb: 16, modules_per_kit: 2, memory_type: "DDR4", data_rate_mt_s: 3200 }),
  product("D4-32", "RAM", "DDR4 32GB", 1.8, { capacity_gb: 32, modules_per_kit: 2, memory_type: "DDR4", data_rate_mt_s: 3200 }),
  product("D5-16", "RAM", "DDR5 16GB", 1.3, { capacity_gb: 16, modules_per_kit: 2, memory_type: "DDR5", data_rate_mt_s: 5600 }),
  product("D5-32", "RAM", "DDR5 32GB 6000", 2.2, { capacity_gb: 32, modules_per_kit: 2, memory_type: "DDR5", data_rate_mt_s: 6000 }),
  product("D5-64", "RAM", "DDR5 64GB", 4.5, { capacity_gb: 64, modules_per_kit: 2, memory_type: "DDR5", data_rate_mt_s: 6000 }),
  product("SSD-500", "STORAGE", "NVMe 500GB", 1, { capacity_gb: 500, interface: "PCIe 4.0 x4" }),
  product("SSD-1T", "STORAGE", "NVMe 1TB", 1.6, { capacity_gb: 1000, interface: "PCIe 4.0 x4" }),
  product("SSD-2T", "STORAGE", "NVMe 2TB", 3, { capacity_gb: 2000, interface: "PCIe 4.0 x4" }),
  product("PSU-550", "PSU", "550W Bronze", 1, { wattage: 550, efficiency_rating: "80 PLUS Bronze", dimensions_mm: [150, 140, 86], connectors: ["PCIe 6+2-pin x2"] }),
  product("PSU-750", "PSU", "750W Gold", 2, { wattage: 750, efficiency_rating: "80 PLUS Gold", dimensions_mm: [150, 150, 86], connectors: ["PCIe 6+2-pin x4"] }),
  product("PSU-850", "PSU", "850W Gold ATX 3.1", 2.6, { wattage: 850, efficiency_rating: "80 PLUS Gold", dimensions_mm: [150, 150, 86], native_16pin_connector: "12V-2x6" }),
  product("PSU-1300", "PSU", "1300W Gold", 6, { wattage: 1300, efficiency_rating: "80 PLUS Gold", dimensions_mm: [210, 150, 86], native_16pin_connector: "12V-2x6" }),
  product("CASE-S", "CASE", "Compact case", 1.2, { motherboard_form_factors: ["Micro-ATX", "Mini-ITX"], max_gpu_length_mm: 300, max_cooler_height_mm: 165, max_psu_length_mm: 160, radiator_support: ["Top 240mm"], included_fans: ["2 x 120mm"] }),
  product("CASE-L", "CASE", "Airflow case", 2.5, { motherboard_form_factors: ["E-ATX", "ATX", "mATX", "ITX"], max_gpu_length_mm: 400, max_cooler_height_mm: 170, max_psu_length_mm: 220, radiator_support: { top: "120/240/360mm" }, included_fans: ["4 x 120mm ARGB"], front_usb_c: true }),
  product("AIR-1", "COOLER", "Single tower", 0.5, { cooler_type: "Tower Air", cooler_height_mm: 150, fan_count: 1, supported_sockets: ["Intel LGA1700", "AMD AM5"] }),
  product("AIR-2", "COOLER", "Dual tower", 0.9, { cooler_type: "Air Tower", cooler_height_mm: 157, fan_count: 2, supported_sockets: ["LGA1700", "AM5"] }),
  product("AIO-360", "COOLER", "AIO 360", 2.5, { cooler_type: "AIO Liquid", radiator_dimensions_mm: [397, 120, 27], supported_sockets: ["LGA1700", "AM5"] }),
];

const catalog = createCatalog(products);
const request = (overrides = {}) => ({ useCase: "gaming", budget: 25 * M, resolution: "1440p", platform: "any", priority: "balanced", ...overrides });

test("plans a complete, compatible gaming build inside the budget", () => {
  const result = planBuild(catalog, request());
  assert.equal(result.status, "ok");
  const build = result.build;
  assert.ok(build.total <= 25 * M);
  assert.deepEqual(BUILD_SLOTS.filter((slot) => !build.parts[slot]), []);
  assert.deepEqual(build.issues, []);
  assert.equal(build.parts.GPU.modelCode, "RTX4060");
});

test("every plan is compatible for every use case and budget", () => {
  for (const useCase of ["gaming", "streaming", "creator", "ai", "office"]) {
    for (const budget of [16, 25, 40, 70, 120]) {
      const result = planBuild(catalog, request({ useCase, budget: budget * M }));
      if (result.status !== "ok") continue;
      assert.deepEqual(result.build.issues, [], `${useCase} ${budget}M`);
      assert.ok(result.build.total <= budget * M, `${useCase} ${budget}M over budget`);
    }
  }
});

test("more budget never lowers the performance rating", () => {
  let previous = -1;
  for (const budget of [16, 25, 40, 70, 120]) {
    const result = planBuild(catalog, request({ budget: budget * M }));
    if (result.status !== "ok") continue;
    assert.ok(result.build.performanceRating >= previous, `${budget}M`);
    previous = result.build.performanceRating;
  }
});

test("office builds use integrated graphics and do not spend the whole budget", () => {
  const result = planBuild(catalog, request({ useCase: "office", budget: 30 * M }));
  assert.equal(result.status, "ok");
  assert.equal(result.build.parts.GPU, undefined);
  assert.ok(cpuFacts(result.build.parts.CPU).igpu);
  assert.ok(result.build.total < 15 * M);
});

test("respects the chosen CPU platform", () => {
  const result = planBuild(catalog, request({ platform: "amd", budget: 40 * M }));
  assert.equal(result.build.parts.CPU.modelCode, "R7-7800X3D");
  assert.equal(result.build.parts.MOTHERBOARD.modelCode, "B650");
});

test("reports the minimum budget when the budget is too low", () => {
  const result = planBuild(catalog, request({ budget: 10 * M }));
  assert.equal(result.status, "budget-too-low");
  assert.ok(result.minimumBudget > 10 * M);
});

test("suggests upgrades with the follow-up parts needed to stay compatible", () => {
  const base = planBuild(catalog, request()).build;
  const upgrades = suggestUpgrades(base.parts, catalog, request());
  const gpu = upgrades.find((upgrade) => upgrade.slot === "GPU");
  assert.ok(gpu, "expected a GPU upgrade");
  assert.ok(gpu.priceDelta > 0 && gpu.gainPercent > 0);
  assert.deepEqual(analyzeBuild(gpu.parts, catalog, request()).issues, []);
});

test("manual options flag parts that do not fit the selection", () => {
  const options = slotOptions("RAM", { MOTHERBOARD: products.find((item) => item.modelCode === "B760-D5") }, catalog, request());
  assert.ok(options.find((option) => option.product.modelCode === "D4-16").problems.length > 0);
  assert.deepEqual(options.find((option) => option.product.modelCode === "D5-32").problems, []);
});

test("benchmark reports FPS and balance at every resolution", () => {
  const parts = planBuild(catalog, request()).build.parts;
  const bench = benchmarkBuild(parts, catalog, request());
  for (const resolution of ["1080p", "1440p", "2160p"]) {
    assert.equal(bench.fps[resolution].length, 8);
    assert.ok(bench.balance[resolution]);
  }
  assert.ok(bench.fps["1080p"][0].fps > bench.fps["2160p"][0].fps);
  assert.ok(bench.psuLoad > 0 && bench.psuLoad < 1);
});

test("what-if rows repair a platform change and block impossible swaps", () => {
  const parts = planBuild(catalog, request({ budget: 30 * M, platform: "intel" })).build.parts;
  const rows = whatIfRows("CPU", parts, catalog, request({ budget: 30 * M }));
  assert.equal(rows.filter((row) => row.status === "current").length, 1);
  const amd = rows.find((row) => row.product.modelCode === "R7-7800X3D");
  assert.equal(amd.status, "repair");
  assert.ok(amd.repairs.includes("MOTHERBOARD"));
  assert.equal(amd.parts.MOTHERBOARD.modelCode, "B650");
  assert.deepEqual(analyzeBuild(amd.parts, catalog, request()).issues, []);
  const gpuRows = whatIfRows("GPU", parts, catalog, request({ budget: 30 * M }));
  const big = gpuRows.find((row) => row.product.modelCode === "RTX5090");
  assert.ok(big.status === "repair" || big.status === "blocked");
  const downgrade = gpuRows.find((row) => row.product.modelCode === "RTX4060");
  assert.ok(downgrade.fpsDelta < 0 && downgrade.priceDelta < 0);
});

test("what-if rows flag GPU swaps that hit the CPU frame-rate ceiling", () => {
  const ask = request({ budget: 30 * M, resolution: "1080p" });
  const parts = planBuild(catalog, ask).build.parts;
  const rows = whatIfRows("GPU", parts, catalog, ask).filter((row) => row.status !== "blocked");
  assert.ok(rows.length > 1);
  for (const row of rows) {
    const aaa = benchmarkBuild(row.parts, catalog, ask).fps["1080p"].filter((game) => game.category === "AAA");
    assert.equal(row.cpuCapped, aaa.every((game) => game.limit === "cpu"), row.product.modelCode);
  }
  // Once capped, a stronger GPU adds no frames: every capped row gains the same.
  const capped = rows.filter((row) => row.cpuCapped && row.status !== "current");
  assert.ok(new Set(capped.map((row) => row.fpsDelta.toFixed(6))).size <= 1);
});

test("frame-rate entries say whether the CPU or the GPU sets them", () => {
  const slowCpu = cpuFacts(products[0]);
  const fastGpu = gpuFacts(products.find((item) => item.modelCode === "RTX5090"));
  const games = estimateFps(slowCpu, fastGpu, 32, "1080p");
  assert.ok(games.filter((game) => game.category === "AAA").every((game) => game.limit === "cpu"));
});

test("frame-rate estimate is limited by the slower of CPU and GPU", () => {
  const slowCpu = cpuFacts(products[0]);
  const fastGpu = gpuFacts(products.find((item) => item.modelCode === "RTX5090"));
  const midGpu = gpuFacts(products.find((item) => item.modelCode === "RTX4060"));
  const capped = estimateFps(slowCpu, fastGpu, 32, "1080p").find((game) => game.name === "Cyberpunk 2077");
  const mid = estimateFps(slowCpu, midGpu, 32, "1080p").find((game) => game.name === "Cyberpunk 2077");
  assert.equal(capped.fps, Math.round(slowCpu.gaming * 1.8));
  assert.ok(capped.fps > mid.fps);
});

const workOf = (parts) => Object.fromEntries(workloadBench(parts, catalog).map((metric) => [metric.key, metric]));
const intelBuild = (overrides = {}) => ({
  CPU: products.find((item) => item.modelCode === "I5-12400F"),
  MOTHERBOARD: products.find((item) => item.modelCode === "B760-D5"),
  RAM: products.find((item) => item.modelCode === "D5-32"),
  GPU: products.find((item) => item.modelCode === "RTX4060"),
  ...overrides,
});

test("local LLM speed follows VRAM capacity and bandwidth", () => {
  const small = workOf(intelBuild());
  const big = workOf(intelBuild({ GPU: products.find((item) => item.modelCode === "RTX5090") }));
  // An 8B Q4 model fits an 8 GB card; a 14B one spills into system RAM and slows down sharply.
  assert.match(small.llm8.note, /trọn trong VRAM/);
  assert.match(small.llm14.note, /trong VRAM, phần còn lại ở RAM/);
  assert.ok(small.llm8.value > 2 * small.llm14.value);
  assert.ok(big.llm14.value > small.llm14.value * 4);
  assert.equal(big.maxModel.value, 32);
  assert.equal(small.maxModel.value, 8);
  // 70B needs ~43 GB of VRAM + RAM: impossible with 8 GB VRAM and 32 GB RAM.
  assert.equal(small.llm70.value, undefined);
  const roomy = workOf(intelBuild({ RAM: products.find((item) => item.modelCode === "D5-64") }));
  assert.ok(roomy.llm70.value > 0 && roomy.llm70.value < 5);
});

test("video, render and compile estimates move with the right part", () => {
  const base = workOf(intelBuild());
  const fasterGpu = workOf(intelBuild({ GPU: products.find((item) => item.modelCode === "RTX5070") }));
  const fasterCpu = workOf(intelBuild({ CPU: products.find((item) => item.modelCode === "I7-14700K") }));
  assert.ok(fasterGpu.blender.value > base.blender.value);
  assert.ok(fasterGpu.sdxl.value < base.sdxl.value);
  assert.equal(fasterGpu.kernel.value, base.kernel.value);
  assert.ok(fasterCpu.kernel.value < base.kernel.value);
  assert.ok(fasterCpu.cinebench.value > base.cinebench.value);
  assert.ok(fasterCpu.export4k.value < base.export4k.value && fasterGpu.export4k.value < base.export4k.value);
  assert.match(base.encoder.text, /NVENC.*AV1/);
  assert.equal(base.ramBandwidth.value, 96);
});

test("what-if rows rate swaps on the purpose's headline task", () => {
  const ask = request({ useCase: "ai", budget: 40 * M });
  const parts = intelBuild();
  const rows = whatIfRows("GPU", parts, catalog, ask);
  const upgrade = rows.find((row) => row.product.modelCode === "RTX5070");
  const expected = (workOf(upgrade.parts).llm14.value / workOf(parts).llm14.value - 1) * 100;
  assert.ok(Math.abs(upgrade.taskDelta - expected) < 1e-6);
  assert.equal(TASK_HEADLINE.office, undefined);
  assert.ok(whatIfRows("GPU", parts, catalog, request({ useCase: "office" })).every((row) => row.taskDelta === undefined || row.status === "current"));
});
