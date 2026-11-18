import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchCatalogProducts } from "../catalog-api";
import type { CatalogProduct, CatalogProductFilters } from "../catalog-api";
import { customerVisibleOffers, offerOriginalPrice } from "../catalog-offers";

/*
 * Product mega menu. Every sub-link is derived from products that exist in the catalog
 * (price buckets, CPU/GPU families from the PC BOM, brands, monitor sizes), so a link
 * never leads to an empty listing and nothing here invents categories or promotions.
 */

interface MenuLink {
  label: string;
  to: string;
}

interface MenuGroup {
  title: string;
  to?: string;
  links: MenuLink[];
}

type IconName = "gaming" | "workstation" | "amd" | "office" | "ai" | "chip" | "monitor" | "keyboard" | "accessory" | "sale";

interface MenuCategory {
  key: string;
  label: string;
  icon: IconName;
  to: string;
  load: (signal: AbortSignal) => Promise<MenuGroup[]>;
}

const MILLION = 1_000_000;
const PC_PRICE_STEPS = [15, 20, 30, 50, 80];
const PART_PRICE_STEPS = [1, 3, 5, 10, 20];

const TYPE_LABELS: Record<string, string> = {
  PC: "Máy tính bộ",
  CPU: "Bộ vi xử lý",
  GPU: "Card đồ họa",
  MOTHERBOARD: "Bo mạch chủ",
  RAM: "RAM",
  STORAGE: "Ổ cứng / SSD",
  PSU: "Nguồn máy tính",
  CASE: "Vỏ case",
  COOLER: "Tản nhiệt",
  ACCESSORY: "Phụ kiện",
};

const COMPONENT_TYPES = ["CPU", "GPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE", "COOLER"];

function partsUrl(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `/customer/parts?${search.toString()}`;
}

/** Search value that the backend treats as one exact phrase. */
function phrase(text: string) {
  return `"${text}"`;
}

async function loadProducts(filters: CatalogProductFilters, signal: AbortSignal) {
  const page = await fetchCatalogProducts({ ...filters, page: 1, limit: 100 }, signal);
  return page.data;
}

function lowestPrice(product: CatalogProduct): number | undefined {
  const prices = customerVisibleOffers(product.offers).map((offer) => Number(offer.price)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : undefined;
}

function priceGroup(products: CatalogProduct[], steps: number[], base: Record<string, string | undefined>, noun: string): MenuGroup | undefined {
  const bounds = [0, ...steps.map((step) => step * MILLION), Number.POSITIVE_INFINITY];
  const links: MenuLink[] = [];
  for (let index = 0; index < bounds.length - 1; index++) {
    const low = bounds[index];
    const high = bounds[index + 1];
    const hasProducts = products.some((product) => {
      const price = lowestPrice(product);
      return price !== undefined && price >= low && price < high;
    });
    if (!hasProducts) continue;
    const label = low === 0
      ? `${noun} dưới ${high / MILLION} triệu`
      : high === Number.POSITIVE_INFINITY
        ? `${noun} trên ${low / MILLION} triệu`
        : `${noun} từ ${low / MILLION} - ${high / MILLION} triệu`;
    links.push({
      label,
      to: partsUrl({
        ...base,
        minPrice: low > 0 ? String(low) : undefined,
        maxPrice: high === Number.POSITIVE_INFINITY ? undefined : String(high - 1),
        sort: "price",
      }),
    });
  }
  return links.length ? { title: "Theo khoảng giá", links } : undefined;
}

function componentName(product: CatalogProduct, type: string) {
  return product.bomComponents?.find((component) => component.productType === type)?.productName;
}

const CPU_FAMILY = /(core ultra [579]|core i[3579]|ryzen [3579]|xeon|threadripper)/i;
const GPU_SERIES = /\b(rtx|gtx|rx|arc)\s?([a-z]?\d{3,4})\b/i;

function titleCase(text: string) {
  return text.replace(/\b(core|ultra|ryzen|xeon|threadripper)\b/gi, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .replace(/\bi([3579])\b/gi, "i$1");
}

function familyGroup(
  products: CatalogProduct[],
  title: string,
  extract: (product: CatalogProduct) => string | undefined,
  base: Record<string, string | undefined>,
  sortKey: (label: string) => string = (label) => label,
): MenuGroup | undefined {
  const families = new Set<string>();
  for (const product of products) {
    const family = extract(product);
    if (family) families.add(family);
  }
  const links = [...families]
    .sort((left, right) => sortKey(left).localeCompare(sortKey(right), "vi", { numeric: true }))
    .map((family) => ({ label: family, to: partsUrl({ ...base, q: phrase(family) }) }));
  return links.length ? { title, links } : undefined;
}

function cpuFamily(product: CatalogProduct) {
  const source = componentName(product, "CPU") ?? product.productName;
  const match = source.match(CPU_FAMILY);
  return match ? titleCase(match[1]) : undefined;
}

function cpuLabel(family: string) {
  return /ryzen|threadripper/i.test(family) ? `AMD ${family}` : `Intel ${family}`;
}

function gpuSeries(product: CatalogProduct) {
  const source = componentName(product, "GPU") ?? product.productName;
  const match = source.match(GPU_SERIES);
  return match ? `${match[1].toUpperCase()} ${match[2].toUpperCase()}` : undefined;
}

function brandGroup(products: CatalogProduct[], title: string, base: Record<string, string | undefined>, to?: string, limit = 8): MenuGroup | undefined {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (product.brandName) counts.set(product.brandName, (counts.get(product.brandName) ?? 0) + 1);
  }
  const links = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([brand]) => ({ label: brand, to: partsUrl({ ...base, brand }) }));
  return links.length || to ? { title, to, links } : undefined;
}

function hasDiscount(products: CatalogProduct[]) {
  return products.some((product) => customerVisibleOffers(product.offers)
    .some((offer) => offerOriginalPrice(offer) > Number(offer.price)));
}

function pcCollection(key: string, label: string, collection: string, icon: IconName): MenuCategory {
  const base = { type: "PC", pcCollection: collection };
  return {
    key,
    label,
    icon,
    to: partsUrl(base),
    load: async (signal) => {
      const products = await loadProducts(base, signal);
      const cpuGroup = familyGroup(products, "Theo bộ vi xử lý", cpuFamily, base);
      const groups: (MenuGroup | undefined)[] = [
        priceGroup(products, PC_PRICE_STEPS, base, "PC"),
        cpuGroup && { ...cpuGroup, links: cpuGroup.links.map((link) => ({ ...link, label: `PC ${cpuLabel(link.label)}` })) },
        ((group) => group && { ...group, links: group.links.map((link) => ({ ...link, label: `PC ${link.label}` })) })(
          familyGroup(products, "Theo card đồ họa", gpuSeries, base, (label) => label.replace(/^\D+/, "")),
        ),
        {
          title: "Xem nhanh",
          links: [
            { label: `Tất cả ${label}`, to: partsUrl(base) },
            ...(hasDiscount(products) ? [{ label: "Đang giảm giá", to: partsUrl({ ...base, sale: "true" }) }] : []),
            { label: "Sắp xếp giá thấp → cao", to: partsUrl({ ...base, sort: "price", order: "asc" }) },
          ],
        },
      ];
      return groups.filter((group): group is MenuGroup => group !== undefined);
    },
  };
}

const MONITOR_SIZE = /(\d{2}(?:\.\d)?)\s?inch/i;

const CATEGORIES: MenuCategory[] = [
  pcCollection("pc-gaming", "PC Gaming, Streaming", "gaming", "gaming"),
  pcCollection("pc-workstation", "PC Workstation, Đồ họa", "workstation-creator", "workstation"),
  pcCollection("pc-amd", "PC AMD Gaming", "amd-gaming", "amd"),
  pcCollection("pc-office", "PC Văn phòng, Học tập", "office", "office"),
  pcCollection("pc-ai", "PC AI, Lập trình", "ai-development", "ai"),
  {
    key: "components",
    label: "Linh kiện máy tính",
    icon: "chip",
    to: "/customer/parts",
    load: async (signal) => {
      const lists = await Promise.all(COMPONENT_TYPES.map((type) => loadProducts({ type }, signal)));
      return COMPONENT_TYPES.map((type, index) =>
        brandGroup(lists[index], TYPE_LABELS[type], { type }, partsUrl({ type }), 6))
        .filter((group): group is MenuGroup => group !== undefined);
    },
  },
  {
    key: "monitor",
    label: "Màn hình máy tính",
    icon: "monitor",
    to: partsUrl({ type: "ACCESSORY", accessoryType: "monitor" }),
    load: async (signal) => {
      const base = { type: "ACCESSORY", accessoryType: "monitor" };
      const products = await loadProducts(base, signal);
      const groups: (MenuGroup | undefined)[] = [
        brandGroup(products, "Theo hãng", base),
        familyGroup(products, "Theo kích thước", (product) => {
          const match = product.productName.match(MONITOR_SIZE);
          return match ? `${match[1]} inch` : undefined;
        }, base),
        priceGroup(products, PART_PRICE_STEPS, base, "Màn hình"),
      ];
      return groups.filter((group): group is MenuGroup => group !== undefined);
    },
  },
  {
    key: "gear",
    label: "Gaming gear",
    icon: "keyboard",
    to: partsUrl({ type: "ACCESSORY" }),
    load: async (signal) => {
      const kinds = [
        { accessoryType: "keyboard", title: "Bàn phím" },
        { accessoryType: "mouse", title: "Chuột" },
        { accessoryType: "headset", title: "Tai nghe" },
      ];
      const lists = await Promise.all(kinds.map((kind) => loadProducts({ type: "ACCESSORY", accessoryType: kind.accessoryType }, signal)));
      return kinds.map((kind, index) => {
        const base = { type: "ACCESSORY", accessoryType: kind.accessoryType };
        return brandGroup(lists[index], kind.title, base, partsUrl(base));
      }).filter((group): group is MenuGroup => group !== undefined);
    },
  },
  {
    key: "accessory",
    label: "Phụ kiện khác",
    icon: "accessory",
    to: partsUrl({ type: "ACCESSORY", accessoryType: "accessory" }),
    load: async (signal) => {
      const base = { type: "ACCESSORY", accessoryType: "accessory" };
      const products = await loadProducts(base, signal);
      const groups: (MenuGroup | undefined)[] = [
        brandGroup(products, "Theo hãng", base),
        priceGroup(products, PART_PRICE_STEPS, base, "Phụ kiện"),
      ];
      return groups.filter((group): group is MenuGroup => group !== undefined);
    },
  },
  {
    key: "sale",
    label: "Sản phẩm giảm giá",
    icon: "sale",
    to: partsUrl({ sale: "true" }),
    load: async (signal) => {
      const products = await loadProducts({ sale: true }, signal);
      const types = [...new Set(products.map((product) => product.productType))]
        .sort((left, right) => Object.keys(TYPE_LABELS).indexOf(left) - Object.keys(TYPE_LABELS).indexOf(right));
      const groups: (MenuGroup | undefined)[] = [
        types.length
          ? { title: "Theo loại sản phẩm", links: types.map((type) => ({ label: TYPE_LABELS[type] ?? type, to: partsUrl({ sale: "true", type }) })) }
          : undefined,
        priceGroup(products, PART_PRICE_STEPS, { sale: "true" }, "Giá"),
      ];
      return groups.filter((group): group is MenuGroup => group !== undefined);
    },
  },
];

type PanelState =
  | { status: "loading" }
  | { status: "ready"; groups: MenuGroup[] }
  | { status: "error"; message: string };

/** Session cache so re-hovering a category does not refetch. */
const groupCache = new Map<string, Promise<MenuGroup[]>>();

function MenuIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    gaming: <><rect x="3" y="4" width="12" height="9" rx="1.5" /><path d="M6 17h6M9 13v4" /><rect x="17" y="5" width="4" height="12" rx="1" /><path d="M19 8v.01M19 11v.01" /></>,
    workstation: <><rect x="2" y="4" width="20" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /><path d="m6 12 3-3 2 2 4-4" /></>,
    amd: <><rect x="3" y="4" width="12" height="9" rx="1.5" /><path d="M6 17h6M9 13v4" /><path d="M17 6h4v4M21 6l-4 4" /></>,
    office: <><rect x="7" y="2" width="10" height="20" rx="1.5" /><path d="M10 6h4M10 9h4M12 18v.01" /></>,
    ai: <><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /><path d="M9.5 15 11 9h2l1.5 6M10 13h4" /></>,
    chip: <><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>,
    monitor: <><rect x="2" y="3" width="20" height="13" rx="1.5" /><path d="M8 21h8M12 16v5" /></>,
    keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
    accessory: <><path d="M4 14a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3M4 14h3v6H6a2 2 0 0 1-2-2z" /></>,
    sale: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" /><circle cx="8" cy="8" r="1.5" /></>,
  };
  return <svg className="v2-mega-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function useNarrowScreen() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 860px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

export function MegaMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const narrow = useNarrowScreen();
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(CATEGORIES[0].key);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [panel, setPanel] = useState<PanelState>({ status: "loading" });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const active = CATEGORIES.find((category) => category.key === activeKey) ?? CATEGORIES[0];

  const clearTimers = () => {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
  };
  const scheduleOpen = () => {
    if (narrow) return;
    clearTimers();
    openTimer.current = window.setTimeout(() => setOpen(true), 120);
  };
  const scheduleClose = () => {
    if (narrow) return;
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), 220);
  };
  const close = () => {
    clearTimers();
    setOpen(false);
    setMobilePanel(false);
  };

  useEffect(() => clearTimers, []);
  useEffect(() => close(), [location.pathname, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    let cached = groupCache.get(active.key);
    if (!cached) {
      // Not aborted on hover changes: the result is cached for the session either way.
      cached = active.load(new AbortController().signal);
      groupCache.set(active.key, cached);
      cached.catch(() => groupCache.delete(active.key));
    }
    setPanel({ status: "loading" });
    let current = true;
    cached.then(
      (groups) => { if (current) setPanel({ status: "ready", groups }); },
      (reason: unknown) => {
        if (current) setPanel({ status: "error", message: reason instanceof Error ? reason.message : "Không thể tải danh mục." });
      },
    );
    return () => { current = false; };
  }, [open, active]);

  const go = (to: string) => {
    close();
    navigate(to);
  };

  return (
    <div
      ref={rootRef}
      className="v2-mega"
      onMouseEnter={() => { if (open) clearTimers(); }}
      onMouseLeave={scheduleClose}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          close();
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        className={`v2-header-link v2-product-menu-trigger${open ? " is-open" : ""}`}
        type="button"
        aria-expanded={open}
        aria-controls="v2-mega-menu"
        onMouseEnter={scheduleOpen}
        onClick={() => {
          clearTimers();
          setOpen((value) => !value);
          setMobilePanel(false);
        }}
      >
        <svg className="v2-mega-burger" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        Danh mục sản phẩm <span aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className={`v2-mega-menu${mobilePanel ? " is-panel" : ""}`} id="v2-mega-menu" role="region" aria-label="Danh mục sản phẩm">
          <div className="v2-mega-inner">
            <ul className="v2-mega-categories">
              {CATEGORIES.map((category) => (
                <li key={category.key}>
                  <a
                    href={category.to}
                    className={category.key === active.key ? "is-active" : undefined}
                    aria-current={category.key === active.key ? "true" : undefined}
                    onMouseEnter={() => !narrow && setActiveKey(category.key)}
                    onFocus={() => !narrow && setActiveKey(category.key)}
                    onClick={(event) => {
                      event.preventDefault();
                      if (narrow) {
                        setActiveKey(category.key);
                        setMobilePanel(true);
                      } else {
                        go(category.to);
                      }
                    }}
                  >
                    <MenuIcon name={category.icon} />
                    <span>{category.label}</span>
                    <svg className="v2-mega-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                  </a>
                </li>
              ))}
            </ul>

            <section className="v2-mega-panel" aria-live="polite">
              <div className="v2-mega-panel-head">
                {narrow && (
                  <button type="button" className="v2-mega-back" onClick={() => setMobilePanel(false)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg> Danh mục
                  </button>
                )}
                <h2>{active.label}</h2>
                <Link to={active.to} onClick={close}>Xem tất cả <span aria-hidden="true">→</span></Link>
              </div>
              {panel.status === "loading" && (
                <div className="v2-mega-groups is-loading" aria-label="Đang tải">
                  {[0, 1, 2, 3].map((column) => (
                    <div key={column} className="v2-mega-group">
                      <span className="v2-mega-skeleton is-title" />
                      {[0, 1, 2, 3, 4].map((row) => <span key={row} className="v2-mega-skeleton" />)}
                    </div>
                  ))}
                </div>
              )}
              {panel.status === "error" && <p className="v2-mega-message" role="alert">{panel.message}</p>}
              {panel.status === "ready" && panel.groups.length === 0 && (
                <p className="v2-mega-message">Chưa có sản phẩm trong danh mục này.</p>
              )}
              {panel.status === "ready" && panel.groups.length > 0 && (
                <div className="v2-mega-groups">
                  {panel.groups.map((group) => (
                    <div key={group.title} className="v2-mega-group">
                      {group.to
                        ? <Link className="v2-mega-group-title" to={group.to} onClick={close}>{group.title}</Link>
                        : <h3 className="v2-mega-group-title">{group.title}</h3>}
                      <ul>
                        {group.links.map((link) => (
                          <li key={link.to}><Link to={link.to} onClick={close}>{link.label}</Link></li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
