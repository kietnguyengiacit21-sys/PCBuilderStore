import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { fetchCatalogProducts } from "../catalog-api";
import type { CatalogProduct } from "../catalog-api";
import {
  archivePromotionCampaign,
  fetchProductPromotions,
  fetchPromotionCampaigns,
  saveProductPromotion,
  savePromotionCampaign,
  setProductPromotionEnabled,
} from "../promotions-api";
import type {
  CampaignPayload,
  ProductPromotion,
  ProductPromotionPayload,
  PromotionCampaign,
} from "../promotions-api";
import {
  Badge,
  Card,
  ConfirmationModal,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PrimaryButton,
  SecondaryButton,
  Toast,
} from "./components";

type CampaignDraft = CampaignPayload & { campaignId: string };
type PromotionDraft = ProductPromotionPayload & { promotionId: string };

const emptyCampaign = (): CampaignDraft => ({
  campaignId: "",
  campaignCode: "",
  campaignName: "",
  campaignTag: "",
  startsAt: "",
  endsAt: "",
  priority: 100,
  exclusive: false,
  enabled: false,
});

const emptyPromotion = (campaignId: string): PromotionDraft => ({
  promotionId: "",
  campaignId,
  productId: "",
  discountType: "PERCENTAGE",
  discountValue: 0,
  discountCurrencyCode: null,
  displayCopy: "",
  saleBadge: "",
  conditions: ["NEW"],
  startsAt: "",
  endsAt: "",
  priority: 100,
  exclusive: false,
  enabled: false,
  gifts: [],
});

const localInputDate = (value: string | null) => value ? value.slice(0, 16) : "";

async function fetchAllProducts(): Promise<CatalogProduct[]> {
  const firstPage = await fetchCatalogProducts({ page: 1, limit: 100 });
  if (firstPage.pagination.totalPages <= 1) return firstPage.data;
  const remaining = await Promise.all(Array.from(
    { length: firstPage.pagination.totalPages - 1 },
    (_, index) => fetchCatalogProducts({ page: index + 2, limit: 100 }),
  ));
  return [...firstPage.data, ...remaining.flatMap((page) => page.data)];
}

export function PromotionsPage() {
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [promotions, setPromotions] = useState<ProductPromotion[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>(emptyCampaign);
  const [promotionDraft, setPromotionDraft] = useState<PromotionDraft>(emptyPromotion(""));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<PromotionCampaign | null>(null);

  const selectedCampaign = campaigns.find((campaign) => campaign.campaignId === selectedCampaignId);
  const promotionProduct = products.find((product) => product.productId === promotionDraft.productId);
  const promotionCurrencies = [...new Set((promotionProduct?.offers ?? [])
    .filter((offer) => offer.status === "ACTIVE")
    .map((offer) => offer.currency)
    .filter((currency) => /^[A-Z]{3}$/.test(currency)))];
  const giftOffers = useMemo(() => products.flatMap((product) =>
    product.offers
      .filter((offer) => offer.condition === "NEW" && offer.status === "ACTIVE")
      .map((offer) => ({
        offerId: offer.offerId,
        label: `${product.productName} · ${product.modelCode}`,
      }))), [products]);

  const loadCampaigns = async (keepSelected = true) => {
    const items = await fetchPromotionCampaigns();
    setCampaigns(items);
    const nextId = keepSelected && items.some((item) => item.campaignId === selectedCampaignId)
      ? selectedCampaignId
      : items.find((item) => !item.archived)?.campaignId ?? "";
    setSelectedCampaignId(nextId);
    if (!nextId) setPromotions([]);
    return nextId;
  };

  const loadPromotions = async (campaignId: string) => {
    if (!campaignId) {
      setPromotions([]);
      return;
    }
    setPromotions(await fetchProductPromotions(campaignId));
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchPromotionCampaigns(),
      fetchAllProducts(),
    ]).then(([campaignItems, productItems]) => {
      if (!active) return;
      setCampaigns(campaignItems);
      setProducts(productItems);
      const first = campaignItems.find((item) => !item.archived);
      if (first) setSelectedCampaignId(first.campaignId);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu khuyến mãi.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedCampaignId) {
      setPromotions([]);
      return () => { active = false; };
    }
    void fetchProductPromotions(selectedCampaignId).then((items) => {
      if (active) setPromotions(items);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Không thể tải chương trình.");
    });
    setPromotionDraft((draft) => ({ ...draft, campaignId: selectedCampaignId }));
    return () => { active = false; };
  }, [selectedCampaignId]);

  const saveCampaign = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { campaignId, ...payload } = campaignDraft;
      const saved = await savePromotionCampaign(payload, campaignId || undefined);
      await loadCampaigns(false);
      setSelectedCampaignId(saved.campaignId);
      setCampaignDraft({
        ...payload,
        campaignId: saved.campaignId,
        startsAt: localInputDate(saved.startsAt),
        endsAt: localInputDate(saved.endsAt),
      });
      setPromotionDraft(emptyPromotion(saved.campaignId));
      setNotice("Đã lưu chương trình khuyến mãi.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu chương trình.");
    } finally {
      setSaving(false);
    }
  };

  const savePromotion = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCampaignId) {
      setError("Hãy tạo hoặc chọn chương trình trước.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { promotionId, ...payload } = promotionDraft;
      await saveProductPromotion(payload, promotionId || undefined);
      await loadPromotions(selectedCampaignId);
      setPromotionDraft(emptyPromotion(selectedCampaignId));
      setNotice("Đã lưu ưu đãi sản phẩm.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu ưu đãi.");
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: ProductPromotion) => {
    setError("");
    setNotice("");
    try {
      await setProductPromotionEnabled(promotion.promotionId, !promotion.enabled);
      await loadPromotions(selectedCampaignId);
      setNotice(promotion.enabled ? "Đã tắt ưu đãi." : "Đã kích hoạt ưu đãi.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật ưu đãi.");
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget) return;
    setSaving(true);
    setError("");
    try {
      await archivePromotionCampaign(archiveTarget.campaignId);
      setArchiveTarget(null);
      await loadCampaigns(false);
      setCampaignDraft(emptyCampaign());
      setNotice("Đã lưu trữ chương trình.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu trữ chương trình.");
    } finally {
      setSaving(false);
    }
  };

  const editCampaign = (campaign: PromotionCampaign) => {
    setSelectedCampaignId(campaign.campaignId);
    setCampaignDraft({
      campaignId: campaign.campaignId,
      campaignCode: campaign.campaignCode,
      campaignName: campaign.campaignName,
      campaignTag: campaign.campaignTag ?? "",
      startsAt: localInputDate(campaign.startsAt),
      endsAt: localInputDate(campaign.endsAt),
      priority: campaign.priority,
      exclusive: campaign.exclusive,
      enabled: campaign.enabled,
    });
  };

  const editPromotion = (promotion: ProductPromotion) => {
    setPromotionDraft({
      promotionId: promotion.promotionId,
      campaignId: promotion.campaignId,
      productId: promotion.productId,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      discountCurrencyCode: promotion.discountCurrencyCode,
      displayCopy: promotion.displayCopy ?? "",
      saleBadge: promotion.saleBadge ?? "",
      conditions: promotion.conditions,
      startsAt: localInputDate(promotion.startsAt),
      endsAt: localInputDate(promotion.endsAt),
      priority: promotion.priority,
      exclusive: promotion.exclusive,
      enabled: promotion.enabled,
      gifts: promotion.gifts.map((gift) => ({
        giftOfferId: gift.offerId,
        quantity: gift.quantity,
        selectionRequired: gift.selectionRequired,
        displayOrder: gift.displayOrder,
      })),
    });
  };

  const setCampaign = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) =>
    setCampaignDraft((draft) => ({ ...draft, [key]: value }));
  const setPromotion = <K extends keyof PromotionDraft>(key: K, value: PromotionDraft[K]) =>
    setPromotionDraft((draft) => ({ ...draft, [key]: value }));

  if (loading) return <div className="v2-page"><LoadingState message="Đang tải chương trình khuyến mãi…" /></div>;
  return <div className="v2-page">
    <div className="v2-page-title">
      <div><p className="v2-eyebrow">Bán hàng</p><h1>Khuyến mãi và chiến dịch</h1></div>
      <Badge tone="neutral">Giá được tính tại máy chủ</Badge>
    </div>
    {error && <ErrorState title="Không thể hoàn tất thao tác" message={error} />}
    {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}

    <div className="v2-commerce-layout">
      <Card title="Chương trình">
        <div className="v2-form-stack">
          {campaigns.filter((campaign) => !campaign.archived).map((campaign) =>
            <div className="v2-promotion-campaign" key={campaign.campaignId}>
              <button
                type="button"
                className="v2-link-button"
                aria-pressed={selectedCampaignId === campaign.campaignId}
                onClick={() => {
                  setSelectedCampaignId(campaign.campaignId);
                  setCampaignDraft({
                    campaignId: campaign.campaignId,
                    campaignCode: campaign.campaignCode,
                    campaignName: campaign.campaignName,
                    campaignTag: campaign.campaignTag ?? "",
                    startsAt: localInputDate(campaign.startsAt),
                    endsAt: localInputDate(campaign.endsAt),
                    priority: campaign.priority,
                    exclusive: campaign.exclusive,
                    enabled: campaign.enabled,
                  });
                }}
              >
                <strong>{campaign.campaignName}</strong>
                <span>{campaign.enabled ? "Đang bật" : "Đang tắt"} · Ưu tiên {campaign.priority}</span>
              </button>
              <SecondaryButton type="button" onClick={() => editCampaign(campaign)}>Sửa</SecondaryButton>
              <SecondaryButton type="button" onClick={() => setArchiveTarget(campaign)}>Lưu trữ</SecondaryButton>
            </div>)}
          {!campaigns.some((campaign) => !campaign.archived) &&
            <EmptyState title="Chưa có chương trình" message="Tạo chương trình đầu tiên để bắt đầu." />}
          <SecondaryButton type="button" onClick={() => {
            setCampaignDraft(emptyCampaign());
            setSelectedCampaignId("");
          }}>Tạo chương trình mới</SecondaryButton>
        </div>
      </Card>
      <Card title={campaignDraft.campaignId ? "Chỉnh sửa chương trình" : "Tạo chương trình"}>
        <form className="v2-form-stack" onSubmit={saveCampaign}>
          <div className="v2-form-grid">
            <FormField label="Mã chương trình" htmlFor="promo-campaign-code">
              <input id="promo-campaign-code" className="v2-form-input" required maxLength={60}
                disabled={Boolean(campaignDraft.campaignId)} value={campaignDraft.campaignCode}
                onChange={(event) => setCampaign("campaignCode", event.target.value)} />
            </FormField>
            <FormField label="Tên chương trình" htmlFor="promo-campaign-name">
              <input id="promo-campaign-name" className="v2-form-input" required maxLength={200}
                value={campaignDraft.campaignName} onChange={(event) => setCampaign("campaignName", event.target.value)} />
            </FormField>
            <FormField label="Nhãn" htmlFor="promo-campaign-tag">
              <input id="promo-campaign-tag" className="v2-form-input" maxLength={100}
                value={campaignDraft.campaignTag} onChange={(event) => setCampaign("campaignTag", event.target.value)} />
            </FormField>
            <FormField label="Ưu tiên (số nhỏ hơn được áp dụng trước)" htmlFor="promo-campaign-priority">
              <input id="promo-campaign-priority" className="v2-form-input" type="number" min="0"
                value={campaignDraft.priority} onChange={(event) => setCampaign("priority", Number(event.target.value))} />
            </FormField>
            <FormField label="Bắt đầu" htmlFor="promo-campaign-start">
              <input id="promo-campaign-start" className="v2-form-input" type="datetime-local"
                value={campaignDraft.startsAt ?? ""} onChange={(event) => setCampaign("startsAt", event.target.value || null)} />
            </FormField>
            <FormField label="Kết thúc" htmlFor="promo-campaign-end">
              <input id="promo-campaign-end" className="v2-form-input" type="datetime-local"
                value={campaignDraft.endsAt ?? ""} onChange={(event) => setCampaign("endsAt", event.target.value || null)} />
            </FormField>
          </div>
          <label className="v2-checkbox-row"><input type="checkbox" checked={campaignDraft.exclusive}
            onChange={(event) => setCampaign("exclusive", event.target.checked)} /> Chương trình độc quyền</label>
          <label className="v2-checkbox-row"><input type="checkbox" checked={campaignDraft.enabled}
            onChange={(event) => setCampaign("enabled", event.target.checked)} /> Kích hoạt chương trình</label>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu chương trình"}</PrimaryButton>
        </form>
      </Card>
    </div>

    <Card title={`Ưu đãi sản phẩm${selectedCampaign ? ` · ${selectedCampaign.campaignName}` : ""}`}>
      {!selectedCampaignId
        ? <EmptyState title="Chưa chọn chương trình" message="Tạo hoặc chọn chương trình để quản lý ưu đãi." />
        : <div className="v2-form-stack">
          {promotions.map((promotion) => <div className="v2-promotion-row" key={promotion.promotionId}>
            <div><strong>{promotion.productName}</strong><span>{promotion.discountType} · {promotion.discountValue}{promotion.discountCurrencyCode ? ` ${promotion.discountCurrencyCode}` : ""} · Ưu tiên {promotion.priority}</span>
              <span>{promotion.gifts.length ? `${promotion.gifts.length} quà tặng` : "Không kèm quà"}</span></div>
            <Badge tone={promotion.enabled ? "success" : "neutral"}>{promotion.enabled ? "Đang bật" : "Đang tắt"}</Badge>
            <SecondaryButton type="button" onClick={() => editPromotion(promotion)}>Sửa</SecondaryButton>
            <SecondaryButton type="button" onClick={() => void togglePromotion(promotion)}>
              {promotion.enabled ? "Tắt" : "Bật"}
            </SecondaryButton>
          </div>)}
          <form className="v2-form-stack v2-promotion-form" onSubmit={savePromotion}>
            <h2>{promotionDraft.promotionId ? "Chỉnh sửa ưu đãi" : "Thêm ưu đãi sản phẩm"}</h2>
            <div className="v2-form-grid">
              <FormField label="Sản phẩm" htmlFor="promo-product">
                <select id="promo-product" className="v2-form-input" required value={promotionDraft.productId}
                  onChange={(event) => {
                    const product = products.find((item) => item.productId === event.target.value);
                    const currency = product?.offers.find((offer) =>
                      offer.status === "ACTIVE" && /^[A-Z]{3}$/.test(offer.currency))?.currency ?? null;
                    setPromotionDraft((draft) => ({
                      ...draft,
                      productId: event.target.value,
                      discountCurrencyCode: draft.discountType === "PERCENTAGE" ? null : currency,
                    }));
                  }}>
                  <option value="">Chọn sản phẩm</option>
                  {products.map((product) => <option key={product.productId} value={product.productId}>
                    {product.productName} · {product.modelCode}
                  </option>)}
                </select>
              </FormField>
              <FormField label="Loại ưu đãi" htmlFor="promo-discount-type">
                <select id="promo-discount-type" className="v2-form-input" value={promotionDraft.discountType}
                  onChange={(event) => {
                    const discountType = event.target.value as ProductPromotion["discountType"];
                    setPromotionDraft((draft) => ({
                      ...draft,
                      discountType,
                      discountCurrencyCode: discountType === "PERCENTAGE"
                        ? null
                        : promotionCurrencies[0] ?? null,
                    }));
                  }}>
                  <option value="PERCENTAGE">Phần trăm</option>
                  <option value="FIXED_AMOUNT">Giảm số tiền</option>
                  <option value="FIXED_PRICE">Giá chiến dịch</option>
                </select>
              </FormField>
              {promotionDraft.discountType !== "PERCENTAGE" && <FormField label="Đơn vị tiền tệ" htmlFor="promo-discount-currency"
                hint="Chỉ dùng tiền tệ đã lưu trên offer của sản phẩm.">
                <select id="promo-discount-currency" className="v2-form-input" required
                  value={promotionDraft.discountCurrencyCode ?? ""}
                  onChange={(event) => setPromotion("discountCurrencyCode", event.target.value || null)}>
                  <option value="">Chọn tiền tệ</option>
                  {promotionCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </FormField>}
              <FormField label="Giá trị" htmlFor="promo-discount-value">
                <input id="promo-discount-value" className="v2-form-input" required type="number" min="0" step="any"
                  value={promotionDraft.discountValue}
                  onChange={(event) => setPromotion("discountValue", Number(event.target.value))} />
              </FormField>
              <FormField label="Ưu tiên (số nhỏ hơn trước)" htmlFor="promo-priority">
                <input id="promo-priority" className="v2-form-input" type="number" min="0"
                  value={promotionDraft.priority} onChange={(event) => setPromotion("priority", Number(event.target.value))} />
              </FormField>
              <FormField label="Nội dung hiển thị" htmlFor="promo-copy">
                <input id="promo-copy" className="v2-form-input" maxLength={300} value={promotionDraft.displayCopy}
                  onChange={(event) => setPromotion("displayCopy", event.target.value)} />
              </FormField>
              <FormField label="Nhãn ưu đãi" htmlFor="promo-badge">
                <input id="promo-badge" className="v2-form-input" maxLength={80} value={promotionDraft.saleBadge}
                  onChange={(event) => setPromotion("saleBadge", event.target.value)} />
              </FormField>
              <FormField label="Bắt đầu" htmlFor="promo-start">
                <input id="promo-start" className="v2-form-input" type="datetime-local" value={promotionDraft.startsAt ?? ""}
                  onChange={(event) => setPromotion("startsAt", event.target.value || null)} />
              </FormField>
              <FormField label="Kết thúc" htmlFor="promo-end">
                <input id="promo-end" className="v2-form-input" type="datetime-local" value={promotionDraft.endsAt ?? ""}
                  onChange={(event) => setPromotion("endsAt", event.target.value || null)} />
              </FormField>
            </div>
            <div className="v2-form-stack">
              <strong>Điều kiện áp dụng</strong>
              {(["NEW", "LIKE_NEW", "USED"] as const).map((condition) =>
                <label key={condition} className="v2-checkbox-row">
                  <input type="checkbox" checked={promotionDraft.conditions.includes(condition)}
                    onChange={(event) => setPromotion("conditions", event.target.checked
                      ? [...promotionDraft.conditions, condition]
                      : promotionDraft.conditions.filter((item) => item !== condition))} />
                  {condition === "NEW" ? "Hàng mới" : condition === "LIKE_NEW" ? "Như mới" : "Đã qua sử dụng"}
                </label>)}
            </div>
            <label className="v2-checkbox-row"><input type="checkbox" checked={promotionDraft.exclusive}
              onChange={(event) => setPromotion("exclusive", event.target.checked)} /> Ưu đãi độc quyền, không cộng dồn</label>
            <label className="v2-checkbox-row"><input type="checkbox" checked={promotionDraft.enabled}
              onChange={(event) => setPromotion("enabled", event.target.checked)} /> Kích hoạt ưu đãi</label>
            <div className="v2-form-stack">
              <strong>Quà tặng</strong>
              {promotionDraft.gifts.map((gift, index) => <div className="v2-form-grid" key={`${gift.giftOfferId}-${index}`}>
                <FormField label={`Mặt hàng quà ${index + 1}`} htmlFor={`gift-offer-${index}`}>
                  <select id={`gift-offer-${index}`} className="v2-form-input" required value={gift.giftOfferId}
                    onChange={(event) => setPromotion("gifts", promotionDraft.gifts.map((item, row) =>
                      row === index ? { ...item, giftOfferId: event.target.value } : item))}>
                    <option value="">Chọn offer hàng mới đang hoạt động</option>
                    {giftOffers.map((offer) => <option key={offer.offerId} value={offer.offerId}>
                      {offer.label} · {offer.offerId}
                    </option>)}
                  </select>
                </FormField>
                <FormField label="Số lượng mỗi đơn vị" htmlFor={`gift-quantity-${index}`}>
                  <input id={`gift-quantity-${index}`} className="v2-form-input" type="number" min="1" max="100"
                    value={gift.quantity} onChange={(event) => setPromotion("gifts", promotionDraft.gifts.map((item, row) =>
                      row === index ? { ...item, quantity: Number(event.target.value) } : item))} />
                </FormField>
                <label className="v2-checkbox-row"><input type="checkbox" checked={gift.selectionRequired}
                  onChange={(event) => setPromotion("gifts", promotionDraft.gifts.map((item, row) =>
                    row === index ? { ...item, selectionRequired: event.target.checked } : item))} /> Bắt buộc chọn</label>
                <SecondaryButton type="button" onClick={() => setPromotion("gifts",
                  promotionDraft.gifts.filter((_, row) => row !== index))}>Xóa quà</SecondaryButton>
              </div>)}
              <SecondaryButton type="button" disabled={promotionDraft.gifts.length >= 30}
                onClick={() => setPromotion("gifts", [...promotionDraft.gifts, {
                  giftOfferId: "", quantity: 1, selectionRequired: false, displayOrder: promotionDraft.gifts.length,
                }])}>Thêm quà tặng</SecondaryButton>
            </div>
            <div className="v2-action-row">
              <PrimaryButton type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu ưu đãi"}</PrimaryButton>
              {promotionDraft.promotionId && <SecondaryButton type="button" onClick={() =>
                setPromotionDraft(emptyPromotion(selectedCampaignId))}>Hủy chỉnh sửa</SecondaryButton>}
            </div>
          </form>
        </div>}
    </Card>
    <ConfirmationModal
      open={Boolean(archiveTarget)}
      onClose={() => setArchiveTarget(null)}
      onConfirm={() => void confirmArchive()}
      title="Lưu trữ chương trình"
      message={`Bạn có chắc chắn muốn lưu trữ "${archiveTarget?.campaignName ?? ""}"?`}
      details={[{ label: "Trạng thái", value: "Các ưu đãi thuộc chương trình sẽ ngừng áp dụng." }]}
      confirmLabel="Lưu trữ chương trình"
      busy={saving}
    />
  </div>;
}
