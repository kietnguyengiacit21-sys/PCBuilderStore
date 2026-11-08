import { useEffect, useState } from "react";
import {
  fetchAdminUpgradeConfiguration,
  saveAdminUpgradeConfiguration,
} from "../catalog-api";
import type {
  AdminBomComponent,
  AdminUpgradeBundle,
  AdminUpgradeChoice,
  AdminUpgradeConfiguration,
  AdminUpgradeGroup,
} from "../catalog-api";
import { money } from "../demo/demo-store";
import { Card, ErrorState, LoadingState, PrimaryButton, SecondaryButton } from "./components";

function emptyGroup(index: number): AdminUpgradeGroup {
  return {
    groupId: "",
    groupCode: `UPGRADE_${index + 1}`,
    displayName: "",
    description: null,
    required: false,
    displayOrder: index,
    enabled: false,
    options: [],
  };
}

function emptyBundle(index: number): AdminUpgradeBundle {
  return {
    bundleId: "",
    name: "",
    description: null,
    discountType: "PERCENTAGE",
    discountValue: 0,
    eligibleConditions: ["NEW"],
    startsAt: null,
    endsAt: null,
    displayOrder: index,
    enabled: false,
    items: [],
  };
}

export function ProductUpgradeAdminPanel({
  modelCode,
  bomComponents,
}: {
  modelCode: string;
  bomComponents: AdminBomComponent[];
}) {
  const [configuration, setConfiguration] = useState<AdminUpgradeConfiguration>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetchAdminUpgradeConfiguration(modelCode, controller.signal).then(
      setConfiguration,
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Không thể tải cấu hình nâng cấp.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [modelCode]);

  const updateGroup = (index: number, patch: Partial<AdminUpgradeGroup>) => {
    setConfiguration((current) => current && ({
      ...current,
      groups: current.groups.map((group, itemIndex) =>
        itemIndex === index ? { ...group, ...patch } : group),
    }));
  };

  const updateBundle = (index: number, patch: Partial<AdminUpgradeBundle>) => {
    setConfiguration((current) => current && ({
      ...current,
      bundles: current.bundles.map((bundle, itemIndex) =>
        itemIndex === index ? { ...bundle, ...patch } : bundle),
    }));
  };

  const save = async () => {
    if (!configuration) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveAdminUpgradeConfiguration(modelCode, {
        groups: configuration.groups.map((group) => ({
          groupCode: group.groupCode,
          displayName: group.displayName,
          description: group.description,
          required: group.required,
          displayOrder: group.displayOrder,
          enabled: group.enabled,
          options: group.options.map((option) => ({
            offerId: option.offerId,
            displayName: option.displayName,
            description: option.description,
            defaultOption: option.defaultOption,
            minimumQuantity: option.minimumQuantity,
            maximumQuantity: option.maximumQuantity,
            displayOrder: option.displayOrder,
            enabled: option.enabled,
          })),
        })),
        bundles: configuration.bundles.map((bundle) => ({
          bundleId: bundle.bundleId || null,
          name: bundle.name,
          description: bundle.description,
          discountType: bundle.discountType,
          discountValue: bundle.discountValue,
          eligibleConditions: bundle.eligibleConditions,
          startsAt: bundle.startsAt,
          endsAt: bundle.endsAt,
          displayOrder: bundle.displayOrder,
          enabled: bundle.enabled,
          items: bundle.items.map((item) => ({
            offerId: item.offerId,
            required: item.required,
            defaultSelected: item.defaultSelected,
            displayOrder: item.displayOrder,
            enabled: item.enabled,
          })),
        })),
        relatedProducts: configuration.relatedProducts.map((item) => ({
          productId: item.productId,
          displayOrder: item.displayOrder,
        })),
      });
      setConfiguration(saved);
      setNotice("Cấu hình nâng cấp, gói và sản phẩm liên quan đã được lưu.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Card title="Nâng cấp và gói PC"><LoadingState message="Đang tải cấu hình…" /></Card>;
  if (!configuration) return <Card title="Nâng cấp và gói PC"><ErrorState title="Không thể tải cấu hình" message={error} /></Card>;

  const offers = configuration.selectableOffers.filter((offer) => offer.condition === "NEW");

  return <Card title="Nâng cấp và gói PC"
    description="Chỉ tham chiếu sản phẩm và ưu đãi đang có; giá và tồn kho luôn được máy chủ tính lại.">
    {error && <p className="v2-inline-error" role="alert">{error}</p>}
    {notice && <p className="v2-inline-success" role="status">{notice}</p>}
    {configuration.groups.map((group, index) => <section className="v2-upgrade-admin-section" key={group.groupId || index}>
      <div className="v2-form-grid">
        <label className="v2-field">Mã nhóm<input className="v2-form-input" value={group.groupCode}
          maxLength={80} onChange={(event) => updateGroup(index, { groupCode: event.target.value.toUpperCase() })} /></label>
        <label className="v2-field">Tên nhóm<input className="v2-form-input" value={group.displayName}
          maxLength={180} onChange={(event) => updateGroup(index, { displayName: event.target.value })} /></label>
        <label className="v2-field">Mô tả<input className="v2-form-input" value={group.description ?? ""}
          onChange={(event) => updateGroup(index, { description: event.target.value || null })} /></label>
        <label className="v2-field">Thứ tự<input className="v2-form-input" type="number" min="0"
          value={group.displayOrder} onChange={(event) => updateGroup(index, { displayOrder: Number(event.target.value) })} /></label>
        <label className="v2-checkbox-row"><input type="checkbox" checked={group.required}
          onChange={(event) => updateGroup(index, { required: event.target.checked })} />Bắt buộc lựa chọn</label>
        <label className="v2-checkbox-row"><input type="checkbox" checked={group.enabled}
          onChange={(event) => updateGroup(index, { enabled: event.target.checked })} />Đang hoạt động</label>
      </div>
      {group.options.map((option, optionIndex) => <div className="v2-upgrade-admin-option" key={option.optionId || optionIndex}>
        <label className="v2-field">Linh kiện / ưu đãi
          <select className="v2-form-input" value={option.offerId}
            onChange={(event) => {
              const offer = offers.find((item) => item.offerId === event.target.value);
              if (!offer) return;
              const isDefault = option.defaultOption;
              const bomQuantity = bomComponents.find(
                (component) => component.componentProductId === offer.productId,
              )?.quantity ?? 1;
              updateGroup(index, { options: group.options.map((entry, entryIndex) =>
                entryIndex === optionIndex ? {
                  ...entry,
                  offerId: offer.offerId,
                  productId: offer.productId,
                  modelCode: offer.modelCode,
                  productName: offer.productName,
                  productType: offer.productType,
                  condition: offer.condition,
                  price: offer.price,
                  currency: offer.currency,
                  availableQuantity: offer.availableQuantity,
                  displayName: offer.productName,
                  minimumQuantity: isDefault ? bomQuantity : entry.minimumQuantity,
                  maximumQuantity: isDefault ? bomQuantity : entry.maximumQuantity,
                } : entry) });
            }}>
            {offers.map((offer) => <option key={offer.offerId} value={offer.offerId}>
              {offer.productType} · {offer.modelCode} · {offer.productName} · {money(offer.price, offer.currency)}
            </option>)}
          </select>
        </label>
        <label className="v2-field">Tên hiển thị<input className="v2-form-input" value={option.displayName}
          onChange={(event) => updateGroup(index, { options: group.options.map((entry, entryIndex) =>
            entryIndex === optionIndex ? { ...entry, displayName: event.target.value } : entry) })} /></label>
        <label className="v2-field">Số lượng<input className="v2-form-input" type="number" min="1" max="100"
          value={option.minimumQuantity} onChange={(event) => updateGroup(index, { options: group.options.map((entry, entryIndex) =>
            entryIndex === optionIndex ? { ...entry, minimumQuantity: Number(event.target.value), maximumQuantity: Number(event.target.value) } : entry) })} /></label>
        <label className="v2-checkbox-row"><input type="radio" name={`upgrade-default-${index}`}
          checked={option.defaultOption} onChange={() => updateGroup(index, {
            options: group.options.map((entry, entryIndex) =>
              entryIndex === optionIndex ? {
                ...entry,
                defaultOption: true,
                minimumQuantity: bomComponents.find(
                  (component) => component.componentProductId === entry.productId,
                )?.quantity ?? 1,
                maximumQuantity: bomComponents.find(
                  (component) => component.componentProductId === entry.productId,
                )?.quantity ?? 1,
              } : { ...entry, defaultOption: false }),
          })} />Mặc định</label>
        <label className="v2-checkbox-row"><input type="checkbox" checked={option.enabled}
          onChange={(event) => updateGroup(index, { options: group.options.map((entry, entryIndex) =>
            entryIndex === optionIndex ? { ...entry, enabled: event.target.checked } : entry) })} />Hoạt động</label>
        <SecondaryButton type="button" onClick={() => updateGroup(index, {
          options: group.options.filter((_, entryIndex) => entryIndex !== optionIndex),
        })}>Gỡ lựa chọn</SecondaryButton>
      </div>)}
      <SecondaryButton type="button" onClick={() => {
        const offer = offers[0];
        if (!offer) {
          setError("Không có ưu đãi linh kiện NEW phù hợp để thêm.");
          return;
        }
        const option: AdminUpgradeChoice = {
          optionId: "",
          offerId: offer.offerId,
          productId: offer.productId,
          modelCode: offer.modelCode,
          productName: offer.productName,
          productType: offer.productType,
          condition: offer.condition,
          price: offer.price,
          currency: offer.currency,
          availableQuantity: offer.availableQuantity,
          priceDifference: 0,
          displayName: offer.productName,
          description: null,
          defaultOption: group.options.length === 0,
          minimumQuantity: group.options.length === 0
            ? bomComponents.find((component) => component.componentProductId === offer.productId)?.quantity ?? 1
            : 1,
          maximumQuantity: group.options.length === 0
            ? bomComponents.find((component) => component.componentProductId === offer.productId)?.quantity ?? 1
            : 1,
          displayOrder: group.options.length,
          enabled: true,
        };
        updateGroup(index, { options: [...group.options, option] });
      }}>Thêm lựa chọn</SecondaryButton>
      <SecondaryButton type="button" onClick={() => setConfiguration((current) => current && ({
        ...current, groups: current.groups.filter((_, itemIndex) => itemIndex !== index),
      }))}>Xóa nhóm</SecondaryButton>
    </section>)}
    <SecondaryButton type="button" onClick={() => setConfiguration((current) => current && ({
      ...current, groups: [...current.groups, emptyGroup(current.groups.length)],
    }))}>Thêm nhóm nâng cấp</SecondaryButton>

    <h3>Gói sản phẩm</h3>
    {configuration.bundles.map((bundle, index) => <section className="v2-upgrade-admin-section" key={bundle.bundleId || index}>
      <div className="v2-form-grid">
        <label className="v2-field">Tên gói<input className="v2-form-input" value={bundle.name}
          onChange={(event) => updateBundle(index, { name: event.target.value })} /></label>
        <label className="v2-field">Mô tả<input className="v2-form-input" value={bundle.description ?? ""}
          onChange={(event) => updateBundle(index, { description: event.target.value || null })} /></label>
        <label className="v2-field">Loại giảm giá<select className="v2-form-input"
          value={bundle.discountType} onChange={(event) => updateBundle(index, {
            discountType: event.target.value as AdminUpgradeBundle["discountType"],
          })}><option value="PERCENTAGE">Phần trăm</option><option value="FIXED_AMOUNT">Số tiền</option></select></label>
        <label className="v2-field">Mức giảm<input className="v2-form-input" type="number" min="0"
          max={bundle.discountType === "PERCENTAGE" ? 100 : undefined} value={bundle.discountValue}
          onChange={(event) => updateBundle(index, { discountValue: Number(event.target.value) })} /></label>
        <label className="v2-field">Bắt đầu<input className="v2-form-input" type="datetime-local"
          value={bundle.startsAt?.slice(0, 16) ?? ""}
          onChange={(event) => updateBundle(index, { startsAt: event.target.value || null })} /></label>
        <label className="v2-field">Kết thúc<input className="v2-form-input" type="datetime-local"
          value={bundle.endsAt?.slice(0, 16) ?? ""}
          onChange={(event) => updateBundle(index, { endsAt: event.target.value || null })} /></label>
        <label className="v2-field">Điều kiện<select className="v2-form-input" value={bundle.eligibleConditions[0] ?? "NEW"}
          onChange={(event) => updateBundle(index, { eligibleConditions: [event.target.value] })}>
          <option value="NEW">Hàng mới</option><option value="LIKE_NEW">Gần như mới</option><option value="USED">Đã qua sử dụng</option>
        </select></label>
        <label className="v2-field">Thứ tự<input className="v2-form-input" type="number" min="0"
          value={bundle.displayOrder} onChange={(event) => updateBundle(index, { displayOrder: Number(event.target.value) })} /></label>
        <label className="v2-checkbox-row"><input type="checkbox" checked={bundle.enabled}
          onChange={(event) => updateBundle(index, { enabled: event.target.checked })} />Đang hoạt động</label>
      </div>
      <div className="v2-form-grid">
        {offers.map((offer) => {
          const item = bundle.items.find((entry) => entry.offerId === offer.offerId);
          return <div className="v2-upgrade-admin-bundle-item" key={offer.offerId}>
            <label className="v2-checkbox-row"><input type="checkbox" checked={Boolean(item)}
              onChange={(event) => updateBundle(index, { items: event.target.checked
                ? [...bundle.items, {
                  offerId: offer.offerId, productId: offer.productId, modelCode: offer.modelCode,
                  productName: offer.productName, productType: offer.productType, condition: offer.condition,
                  price: offer.price, currency: offer.currency, availableQuantity: offer.availableQuantity,
                  required: false, defaultSelected: false, displayOrder: bundle.items.length, enabled: true,
                }]
                : bundle.items.filter((entry) => entry.offerId !== offer.offerId) })} />
            {offer.modelCode} · {offer.productName} · {money(offer.price, offer.currency)}</label>
            {item && <span className="v2-upgrade-admin-bundle-item-flags">
              <label><input aria-label="Bắt buộc" type="checkbox" checked={item.required}
                onChange={(event) => updateBundle(index, { items: bundle.items.map((entry) =>
                  entry.offerId === offer.offerId
                    ? { ...entry, required: event.target.checked, defaultSelected: event.target.checked }
                    : entry) })} />Bắt buộc</label>
              <label><input aria-label="Chọn mặc định" type="checkbox" checked={item.defaultSelected}
                onChange={(event) => updateBundle(index, { items: bundle.items.map((entry) =>
                  entry.offerId === offer.offerId
                    ? { ...entry, defaultSelected: event.target.checked }
                    : entry) })} />Mặc định</label>
              <label><input aria-label="Hoạt động" type="checkbox" checked={item.enabled}
                onChange={(event) => updateBundle(index, { items: bundle.items.map((entry) =>
                  entry.offerId === offer.offerId
                    ? { ...entry, enabled: event.target.checked }
                    : entry) })} />Hoạt động</label>
            </span>}
          </div>;
        })}
      </div>
      <SecondaryButton type="button" onClick={() => setConfiguration((current) => current && ({
        ...current, bundles: current.bundles.filter((_, itemIndex) => itemIndex !== index),
      }))}>Xóa gói</SecondaryButton>
    </section>)}
    <SecondaryButton type="button" onClick={() => setConfiguration((current) => current && ({
      ...current, bundles: [...current.bundles, emptyBundle(current.bundles.length)],
    }))}>Thêm gói</SecondaryButton>

    <h3>Sản phẩm liên quan</h3>
    <div className="v2-form-grid">{offers.map((offer) => {
      const selected = configuration.relatedProducts.some((item) => item.productId === offer.productId);
      if (configuration.relatedProducts.some((item) => item.offerId === offer.offerId)) return null;
      return <label className="v2-checkbox-row" key={offer.offerId}>
        <input type="checkbox" checked={selected} onChange={(event) => setConfiguration((current) => {
          if (!current) return current;
          const existing = current.relatedProducts.filter((item) => item.productId !== offer.productId);
          return {
            ...current,
            relatedProducts: event.target.checked ? [...existing, {
              productId: offer.productId, modelCode: offer.modelCode, productName: offer.productName,
              productType: offer.productType, offerId: offer.offerId, price: offer.price,
              currency: offer.currency, availableQuantity: offer.availableQuantity,
              displayOrder: existing.length,
            }] : existing,
          };
        })} />{offer.modelCode} · {offer.productName}
      </label>;
    })}</div>
    {configuration.relatedProducts.map((related) => <p key={related.productId}>
      {related.modelCode} · {related.productName}
      <SecondaryButton type="button" onClick={() => setConfiguration((current) => current && ({
        ...current,
        relatedProducts: current.relatedProducts.filter((item) => item.productId !== related.productId),
      }))}>Gỡ</SecondaryButton>
    </p>)}
    <div className="v2-action-row"><PrimaryButton type="button" disabled={saving} onClick={() => void save()}>
      {saving ? "Đang lưu…" : "Lưu cấu hình PC"}
    </PrimaryButton></div>
  </Card>;
}
