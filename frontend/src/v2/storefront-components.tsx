import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CatalogImage, CatalogProduct } from "../catalog-api";
import { ChevronIcon, CloseIcon, IconButton } from "./components";
import { availableProductImages, displayProductImages, preferredProductImage } from "./product-images";

const typeLabels: Record<string, string> = {
  ACCESSORY: "Phụ kiện",
  CASE: "Vỏ máy tính",
  COOLER: "Tản nhiệt",
  CPU: "Bộ vi xử lý",
  GPU: "Card đồ họa",
  MOTHERBOARD: "Bo mạch chủ",
  PC: "Máy tính bộ",
  PSU: "Bộ nguồn",
  RAM: "Bộ nhớ RAM",
  STORAGE: "Lưu trữ",
};

const typeSymbols: Record<string, string> = {
  ACCESSORY: "⌁",
  CASE: "▯",
  COOLER: "✳",
  CPU: "▦",
  GPU: "▰",
  MOTHERBOARD: "▤",
  PC: "▣",
  PSU: "ϟ",
  RAM: "▥",
  STORAGE: "◉",
};

const categoryLabels: Record<string, string> = {
  ACCESSORY: "Phụ kiện",
  CASE: "Vỏ máy tính",
  COOLER: "Tản nhiệt CPU",
  CPU: "Bộ vi xử lý",
  GPU: "Card đồ họa",
  MAINBOARD: "Bo mạch chủ",
  MOTHERBOARD: "Bo mạch chủ",
  PREBUILT_PC: "Máy tính lắp sẵn",
  PSU: "Nguồn máy tính",
  RAM: "RAM",
  STORAGE: "Ổ cứng và SSD",
};

export function productTypeLabel(productType: string): string {
  return typeLabels[productType] ?? "Linh kiện máy tính";
}

export function productTypeSymbol(productType: string): string {
  return typeSymbols[productType] ?? "▦";
}

export function categoryLabel(categoryCode: string, fallbackLabel: string): string {
  return categoryLabels[categoryCode] ?? fallbackLabel;
}

function AccessoryIllustration({ productName }: { productName: string }) {
  const name = productName.toLocaleLowerCase();
  if (/monitor|vg\d{3}|xg\d{2}|odyssey|g24f|24g2/.test(name)) {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="44" y="24" width="272" height="154" rx="14" fill="#302542" />
      <rect x="57" y="37" width="246" height="128" rx="8" fill="#eee8fa" />
      <path d="M180 178v22m-44 0h88" stroke="#8d65e8" strokeWidth="10" strokeLinecap="round" />
      <path d="M73 144 132 91l36 32 41-47 66 68" fill="none" stroke="#6d4aff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
  }
  if (/keyboard|blackwidow|kumara|fizz|aula|k70|k8 pro/.test(name)) {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <path d="M37 67a13 13 0 0 1 13-13h260a13 13 0 0 1 13 13v100a13 13 0 0 1-13 13H50a13 13 0 0 1-13-13z" fill="#302542" />
      <path d="M57 77h246v10H57zm0 22h246v10H57zm0 22h246v10H57zm0 22h158v10H57z" fill="#bda8e8" />
      <path d="M225 143h78v10h-78z" fill="#6d4aff" />
    </svg>;
  }
  if (/headset|headphone|cloud|blackshark|kraken|g733/.test(name)) {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <path d="M72 125V96a108 108 0 0 1 216 0v29" fill="none" stroke="#302542" strokeWidth="24" strokeLinecap="round" />
      <rect x="48" y="109" width="66" height="78" rx="24" fill="#6d4aff" />
      <rect x="246" y="109" width="66" height="78" rx="24" fill="#6d4aff" />
      <path d="M276 178q-17 26-55 20" fill="none" stroke="#8d65e8" strokeWidth="8" strokeLinecap="round" />
    </svg>;
  }
  if (/microphone|micro\b|am8|k688|webcam/.test(name)) {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="137" y="26" width="86" height="119" rx="42" fill="#302542" />
      <path d="M119 100v20a61 61 0 0 0 122 0v-20m-61 81v22m-43 0h86" fill="none" stroke="#6d4aff" strokeWidth="11" strokeLinecap="round" />
      <path d="M157 61h46m-46 17h46m-46 17h46" stroke="#bda8e8" strokeWidth="6" strokeLinecap="round" />
    </svg>;
  }
  if (/controller|dualsense|xbox/.test(name)) {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <path d="M82 78q10-20 34-20h128q24 0 34 20l28 75q8 23-8 31-15 8-29-7l-30-31H121l-30 31q-14 15-29 7-16-8-8-31z" fill="#302542" />
      <path d="M113 104v42m-21-21h42" stroke="#bda8e8" strokeWidth="10" strokeLinecap="round" />
      <circle cx="244" cy="111" r="8" fill="#6d4aff" /><circle cx="267" cy="133" r="8" fill="#8d65e8" />
    </svg>;
  }
  if (/stream deck|streamdeck/.test(name)) {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="63" y="35" width="234" height="151" rx="20" fill="#302542" />
      {[0, 1, 2].map((column) => [0, 1].map((row) =>
        <rect key={`${column}-${row}`} x={84 + column * 64} y={57 + row * 57} width="48" height="43" rx="7" fill="#8d65e8" />))}
    </svg>;
  }
  if (/mouse|deathadder|viper|g102|g304|g502|superlight/.test(name)) {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <path d="M180 27c-48 0-77 37-77 90v24c0 41 31 65 77 65s77-24 77-65v-24c0-53-29-90-77-90z" fill="#302542" />
      <path d="M180 30v61m-18-50v42h36V41" fill="none" stroke="#bda8e8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M180 92v26" stroke="#6d4aff" strokeWidth="8" strokeLinecap="round" />
    </svg>;
  }
  return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
    <rect x="86" y="43" width="188" height="134" rx="24" fill="#302542" />
    <path d="M119 79h122m-122 31h122m-122 31h82" stroke="#8d65e8" strokeWidth="12" strokeLinecap="round" />
  </svg>;
}

function HardwareIllustration({ productType, productName }: { productType: string; productName: string }) {
  if (productType === "ACCESSORY") return <AccessoryIllustration productName={productName} />;
  if (productType === "GPU") {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="28" y="52" width="298" height="118" rx="18" fill="#302542" />
      <rect x="42" y="66" width="270" height="88" rx="12" fill="#493b62" />
      <circle cx="132" cy="110" r="31" fill="#f0ecf8" />
      <circle cx="222" cy="110" r="31" fill="#f0ecf8" />
      <circle cx="132" cy="110" r="9" fill="#8d65e8" />
      <circle cx="222" cy="110" r="9" fill="#8d65e8" />
      <path d="M56 178h196v15H56zM271 171h22v22h-22z" fill="#d9ad62" />
      <path d="M87 80h20M177 140h16M266 80h20" stroke="#d9ad62" strokeWidth="5" strokeLinecap="round" />
    </svg>;
  }
  if (productType === "CPU") {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="100" y="35" width="160" height="150" rx="20" fill="#d9ad62" />
      <rect x="116" y="51" width="128" height="118" rx="14" fill="#493b62" />
      <rect x="139" y="72" width="82" height="76" rx="10" fill="#f0ecf8" />
      <path d="M80 62h20m-20 32h20m-20 32h20m-20 32h20m160-100h20m-20 32h20m-20 32h20m-20 32h20M128 15v20m34-20v20m34-20v20m34-20v20m-102 150v20m34-20v20m34-20v20m34-20v20" stroke="#8d65e8" strokeWidth="8" strokeLinecap="round" />
      <path d="M155 96h50M155 112h50M155 128h30" stroke="#6d4aff" strokeWidth="6" strokeLinecap="round" />
    </svg>;
  }
  if (productType === "RAM") {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="36" y="66" width="288" height="92" rx="16" fill="#302542" />
      <rect x="52" y="80" width="256" height="62" rx="10" fill="#493b62" />
      <rect x="72" y="94" width="46" height="34" rx="6" fill="#f0ecf8" />
      <rect x="133" y="94" width="46" height="34" rx="6" fill="#f0ecf8" />
      <rect x="194" y="94" width="46" height="34" rx="6" fill="#f0ecf8" />
      <rect x="255" y="94" width="34" height="34" rx="6" fill="#f0ecf8" />
      <path d="M70 166v18m32-18v18m32-18v18m32-18v18m32-18v18m32-18v18m32-18v18m32-18v18" stroke="#d9ad62" strokeWidth="8" strokeLinecap="round" />
    </svg>;
  }
  if (productType === "STORAGE") {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <path d="M72 54h218l24 24v92H48V78z" fill="#302542" />
      <path d="M82 68h197l14 14v72H64V84z" fill="#493b62" />
      <circle cx="93" cy="111" r="8" fill="#d9ad62" />
      <rect x="122" y="91" width="48" height="40" rx="6" fill="#f0ecf8" />
      <rect x="184" y="91" width="70" height="40" rx="6" fill="#f0ecf8" />
      <path d="M84 160v18m46-18v18m46-18v18m46-18v18m46-18v18" stroke="#d9ad62" strokeWidth="7" strokeLinecap="round" />
    </svg>;
  }
  if (productType === "MOTHERBOARD" || productType === "MAINBOARD") {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="73" y="24" width="214" height="172" rx="14" fill="#302542" />
      <rect x="89" y="40" width="106" height="84" rx="8" fill="#493b62" />
      <rect x="105" y="55" width="74" height="54" rx="5" fill="#d9ad62" />
      <rect x="211" y="42" width="55" height="12" rx="4" fill="#8d65e8" />
      <rect x="211" y="61" width="55" height="12" rx="4" fill="#8d65e8" />
      <rect x="211" y="80" width="55" height="12" rx="4" fill="#8d65e8" />
      <rect x="96" y="141" width="164" height="12" rx="4" fill="#d9ad62" />
      <path d="M125 124v17m50-17v17m51 24v17m-92-17v17" stroke="#c8b3ed" strokeWidth="5" />
    </svg>;
  }
  if (productType === "PSU") {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="67" y="48" width="226" height="126" rx="16" fill="#302542" />
      <rect x="82" y="62" width="196" height="98" rx="10" fill="#493b62" />
      <circle cx="158" cy="111" r="34" fill="#ded6eb" />
      <circle cx="158" cy="111" r="9" fill="#8d65e8" />
      <path d="M158 77v25m0 18v25m-34-34h25m18 0h25m-58-24 18 18m13 13 18 18m-49 0 18-18m13-13 18-18" stroke="#8d65e8" strokeWidth="5" />
      <path d="M219 91h39m-39 16h39m-39 16h30" stroke="#d9ad62" strokeWidth="5" strokeLinecap="round" />
    </svg>;
  }
  if (productType === "CASE" || productType === "PC") {
    return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
      <rect x="105" y="20" width="150" height="180" rx="15" fill="#302542" />
      <rect x="119" y="36" width="122" height="145" rx="9" fill="#493b62" />
      <rect x="132" y="49" width="76" height="118" rx="5" fill="#332947" />
      <circle cx="221" cy="77" r="12" fill="#8d65e8" />
      <circle cx="221" cy="112" r="12" fill="#d9ad62" />
      <circle cx="221" cy="147" r="12" fill="#8d65e8" />
      <path d="M138 184h84" stroke="#c8b3ed" strokeWidth="5" strokeLinecap="round" />
    </svg>;
  }
  return <svg viewBox="0 0 360 220" aria-hidden="true" focusable="false">
    <path d="M95 45h170l28 30v108H67V75z" fill="#302542" />
    <path d="M108 60h142l26 24v82H84V84z" fill="#493b62" />
    <circle cx="180" cy="120" r="43" fill="#f0ecf8" />
    <circle cx="180" cy="120" r="14" fill="#8d65e8" />
    <path d="M180 87v20m0 26v20m-33-33h20m26 0h20m-56-23 14 14m18 18 14 14m-46 0 14-14m18-18 14-14" stroke="#d9ad62" strokeWidth="7" strokeLinecap="round" />
    <path d="M100 178h160" stroke="#d9ad62" strokeWidth="8" strokeLinecap="round" />
  </svg>;
}

export function ProductArtwork({
  image,
  productName,
  productType,
  className = "",
  onImageError,
}: {
  image?: CatalogImage;
  productName: string;
  productType: string;
  className?: string;
  onImageError?: (url: string) => void;
}) {
  const [failedUrl, setFailedUrl] = useState("");
  const imageUrl = image?.url ?? "";
  const isBroken = imageUrl !== "" && failedUrl === imageUrl;
  useEffect(() => setFailedUrl(""), [imageUrl]);

  return (
    <div className={`v2-product-artwork ${className}`}>
      {imageUrl && !isBroken ? (
        <img
          src={imageUrl}
          alt={image?.altText ?? productName}
          onError={() => {
            setFailedUrl(imageUrl);
            onImageError?.(imageUrl);
          }}
        />
      ) : (
        <div
          className={`v2-artwork-placeholder v2-artwork-${productType.toLowerCase()}`}
          role="img"
          aria-label={`Minh họa danh mục ${productTypeLabel(productType)} cho ${productName}`}
        >
          <HardwareIllustration productType={productType} productName={productName} />
          <small aria-hidden="true">Hình minh họa danh mục</small>
        </div>
      )}
    </div>
  );
}

export function ProductCarousel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const updateControls = () => {
      setCanGoBack(track.scrollLeft > 2);
      setCanGoForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
    };
    updateControls();
    track.addEventListener("scroll", updateControls, { passive: true });
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    for (const child of Array.from(track.children)) observer.observe(child);
    return () => {
      track.removeEventListener("scroll", updateControls);
      observer.disconnect();
    };
  }, [children]);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstItem = track.firstElementChild;
    const itemWidth = firstItem instanceof HTMLElement ? firstItem.getBoundingClientRect().width : track.clientWidth * 0.8;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const visibleItems = Math.max(1, Math.floor((track.clientWidth + gap) / (itemWidth + gap)));
    const stepItems = Math.max(1, visibleItems - 1);
    track.scrollBy({ left: direction * stepItems * (itemWidth + gap), behavior: "smooth" });
  };

  return (
    <div className="v2-product-carousel v2-home-product-carousel">
      <div className="v2-carousel-controls" aria-label={`Điều khiển ${label}`}>
        <IconButton label={`Sản phẩm ${label} trước đó`} disabled={!canGoBack} onClick={() => scroll(-1)}><ChevronIcon direction="previous" /></IconButton>
        <IconButton label={`Sản phẩm ${label} tiếp theo`} disabled={!canGoForward} onClick={() => scroll(1)}><ChevronIcon direction="next" /></IconButton>
      </div>
      <div className="v2-product-carousel-track" ref={trackRef} aria-label={label}>
        {children}
      </div>
    </div>
  );
}

function GalleryThumbnails({
  images,
  selectedIndex,
  product,
  onSelect,
  onImageError,
}: {
  images: CatalogImage[];
  selectedIndex: number;
  product: CatalogProduct;
  onSelect: (index: number) => void;
  onImageError: (url: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const updateControls = () => {
      setCanGoBack(track.scrollLeft > 2);
      setCanGoForward(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
    };
    updateControls();
    track.addEventListener("scroll", updateControls, { passive: true });
    const observer = new ResizeObserver(updateControls);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", updateControls);
      observer.disconnect();
    };
  }, [images.length]);

  const scroll = (direction: -1 | 1) => {
    trackRef.current?.scrollBy({ left: direction * 180, behavior: "smooth" });
  };

  return (
    <div className="v2-gallery-thumbnails">
      {images.length > 3 && (
        <IconButton className="v2-gallery-thumbnail-arrow" label="Cuộn ảnh thu nhỏ về trước" disabled={!canGoBack} onClick={() => scroll(-1)}><ChevronIcon direction="previous" /></IconButton>
      )}
      <div className="v2-gallery-thumbnail-track" ref={trackRef} aria-label="Ảnh thu nhỏ sản phẩm">
        {images.map((image, index) => (
          <button
            type="button"
            className={`v2-gallery-thumbnail${selectedIndex === index ? " is-selected" : ""}`}
            key={`${image.url}:${index}`}
            aria-label={`Xem ảnh ${index + 1} trên ${images.length}`}
            aria-current={selectedIndex === index ? "true" : undefined}
            onClick={() => onSelect(index)}
          >
            <ProductArtwork image={image} productName={product.productName} productType={product.productType} onImageError={onImageError} />
          </button>
        ))}
      </div>
      {images.length > 3 && (
        <IconButton className="v2-gallery-thumbnail-arrow" label="Cuộn ảnh thu nhỏ tiếp theo" disabled={!canGoForward} onClick={() => scroll(1)}><ChevronIcon direction="next" /></IconButton>
      )}
    </div>
  );
}

export function ProductImageGallery({ product }: { product: CatalogProduct }) {
  const images = displayProductImages(
    product.images.filter((image) => image.mediaType !== "VIDEO"),
    product.productType,
  );
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set());
  const availableImages = availableProductImages(images, failedUrls);
  const [selectedUrl, setSelectedUrl] = useState(() => preferredProductImage(images)?.url ?? "");
  const currentImage = availableImages.find((image) => image.url === selectedUrl) ?? preferredProductImage(availableImages);
  const selectedIndex = currentImage ? availableImages.findIndex((image) => image.url === currentImage.url) : 0;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const mainImageButtonRef = useRef<HTMLButtonElement>(null);

  const selectImage = (index: number) => {
    if (availableImages.length) {
      setSelectedUrl(availableImages[(index + availableImages.length) % availableImages.length].url);
    }
  };
  const handleImageError = (url: string) => {
    setFailedUrls((previous) => new Set(previous).add(url));
    if (selectedUrl === url) {
      const remainingImages = availableImages.filter((image) => image.url !== url);
      setSelectedUrl(preferredProductImage(remainingImages)?.url ?? "");
      if (remainingImages.length === 0) setLightboxOpen(false);
    }
  };
  const showPrevious = () => selectImage(selectedIndex - 1);
  const showNext = () => selectImage(selectedIndex + 1);

  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    if (lightboxOpen && !dialog.open) dialog.showModal();
    if (!lightboxOpen && dialog.open) dialog.close();
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen, selectedIndex, availableImages.length]);

  const closeLightbox = () => {
    setLightboxOpen(false);
    window.requestAnimationFrame(() => mainImageButtonRef.current?.focus());
  };

  return (
    <section className={`v2-product-gallery is-${product.productType.toLocaleLowerCase()}`}
      aria-label="Thư viện ảnh sản phẩm">
      <div className="v2-gallery-main">
        <button
          ref={mainImageButtonRef}
          type="button"
          className="v2-gallery-image-button"
          disabled={availableImages.length === 0}
          onClick={() => {
            if (availableImages.length) setLightboxOpen(true);
          }}
          aria-label={availableImages.length > 1
            ? `Phóng to ảnh ${selectedIndex + 1} trên ${availableImages.length}`
            : availableImages.length === 1 ? `Phóng to ảnh sản phẩm ${product.productName}` : `Minh họa ${product.productName}`}
        >
          <ProductArtwork image={currentImage} productName={product.productName} productType={product.productType} onImageError={handleImageError} />
        </button>
        {availableImages.length > 1 && <>
          <IconButton className="v2-gallery-arrow is-previous" label="Ảnh trước" onClick={showPrevious}><ChevronIcon direction="previous" /></IconButton>
          <IconButton className="v2-gallery-arrow is-next" label="Ảnh tiếp theo" onClick={showNext}><ChevronIcon direction="next" /></IconButton>
          <span className="v2-gallery-count" aria-live="polite">{selectedIndex + 1} / {availableImages.length}</span>
        </>}
      </div>
      {availableImages.length > 1 && <GalleryThumbnails images={availableImages} selectedIndex={selectedIndex} product={product} onSelect={selectImage} onImageError={handleImageError} />}
      <dialog
        ref={lightboxRef}
        className="v2-gallery-lightbox"
        aria-label={`Thư viện ảnh ${product.productName}`}
        onCancel={(event) => {
          event.preventDefault();
          closeLightbox();
        }}
        onClose={() => {
          if (lightboxOpen) setLightboxOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}
      >
        {lightboxOpen && <div className="v2-lightbox-content">
          <div className="v2-lightbox-toolbar">
            <span className="v2-mono">{availableImages.length > 1 ? `${selectedIndex + 1} / ${availableImages.length}` : product.productName}</span>
            <IconButton className="v2-lightbox-close" label="Đóng thư viện ảnh" onClick={closeLightbox}><CloseIcon /></IconButton>
          </div>
          <div className="v2-lightbox-stage">
            {availableImages.length > 1 && <IconButton label="Ảnh trước" onClick={showPrevious}><ChevronIcon direction="previous" /></IconButton>}
            {currentImage && <ProductArtwork image={currentImage} productName={product.productName} productType={product.productType} onImageError={handleImageError} />}
            {availableImages.length > 1 && <IconButton label="Ảnh tiếp theo" onClick={showNext}><ChevronIcon direction="next" /></IconButton>}
          </div>
          {availableImages.length > 1 && <GalleryThumbnails images={availableImages} selectedIndex={selectedIndex} product={product} onSelect={selectImage} onImageError={handleImageError} />}
        </div>}
      </dialog>
    </section>
  );
}

export interface HeroSlide {
  eyebrow: string;
  title: ReactNode;
  description: string;
  category: string;
  product?: CatalogProduct;
}

export function HeroCarousel({
  slides,
  onNavigate,
}: {
  slides: HeroSlide[];
  onNavigate: (category: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const slidesRef = useRef<HTMLDivElement>(null);
  const currentSlide = slides[selectedIndex];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((index) => (index + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, slides.length, selectedIndex]);

  if (!currentSlide) return null;
  return (
    <section
      className="v2-hero-carousel"
      aria-roledescription="băng chuyền"
      aria-label="Khám phá linh kiện máy tính"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="v2-hero-slide" ref={slidesRef}>
        <div className="v2-hero-copy">
          <span className="v2-hero-eyebrow">{currentSlide.eyebrow}</span>
          <h1>{currentSlide.title}</h1>
          <p>{currentSlide.description}</p>
          <button className="v2-button v2-button-primary" type="button" onClick={() => onNavigate(currentSlide.category)}>
            Khám phá {productTypeLabel(currentSlide.category)} <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="v2-hero-visual">
          <ProductArtwork
            image={currentSlide.product?.images.find((image) => image.isPrimary) ?? currentSlide.product?.images[0]}
            productName={currentSlide.product?.productName ?? productTypeLabel(currentSlide.category)}
            productType={currentSlide.category}
          />
          {currentSlide.product && <span className="v2-hero-product-caption">{currentSlide.product.productName}</span>}
        </div>
      </div>
      <div className="v2-hero-controls">
        <div className="v2-hero-arrows">
          <IconButton label="Khuyến nghị trước" onClick={() => setSelectedIndex((index) => (index - 1 + slides.length) % slides.length)}><ChevronIcon direction="previous" /></IconButton>
          <IconButton label="Khuyến nghị tiếp theo" onClick={() => setSelectedIndex((index) => (index + 1) % slides.length)}><ChevronIcon direction="next" /></IconButton>
        </div>
        <div className="v2-hero-dots" aria-label="Chọn khuyến nghị">
          {slides.map((slide, index) => (
            <button
              type="button"
              key={`${slide.category}:${slide.eyebrow}`}
              className={index === selectedIndex ? "is-selected" : ""}
              aria-label={`Trang ${index + 1}: ${slide.eyebrow}`}
              aria-current={index === selectedIndex ? "true" : undefined}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </div>
        <span className="v2-hero-counter">{String(selectedIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
      </div>
    </section>
  );
}
