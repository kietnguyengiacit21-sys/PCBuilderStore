import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CatalogImage, CatalogProduct } from "../catalog-api";
import { ChevronIcon, CloseIcon, IconButton } from "./components";

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

function HardwareIllustration({ productType }: { productType: string }) {
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
}: {
  image?: CatalogImage;
  productName: string;
  productType: string;
  className?: string;
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
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div
          className={`v2-artwork-placeholder v2-artwork-${productType.toLowerCase()}`}
          role="img"
          aria-label={`Minh họa danh mục ${productTypeLabel(productType)} cho ${productName}`}
        >
          <HardwareIllustration productType={productType} />
          <small aria-hidden="true">Hình minh họa · chưa có ảnh xác minh</small>
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
}: {
  images: CatalogImage[];
  selectedIndex: number;
  product: CatalogProduct;
  onSelect: (index: number) => void;
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
            <ProductArtwork image={image} productName={product.productName} productType={product.productType} />
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
  const images = product.images;
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, images.findIndex((image) => image.isPrimary)));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const mainImageButtonRef = useRef<HTMLButtonElement>(null);
  const currentImage = images[selectedIndex];

  const selectImage = (index: number) => {
    if (images.length) setSelectedIndex((index + images.length) % images.length);
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
  }, [lightboxOpen, selectedIndex, images.length]);

  const closeLightbox = () => {
    setLightboxOpen(false);
    window.requestAnimationFrame(() => mainImageButtonRef.current?.focus());
  };

  return (
    <section className="v2-product-gallery" aria-label="Thư viện ảnh sản phẩm">
      <div className="v2-gallery-main">
        <button
          ref={mainImageButtonRef}
          type="button"
          className="v2-gallery-image-button"
          onClick={() => setLightboxOpen(true)}
          aria-label={images.length ? `Phóng to ảnh ${selectedIndex + 1} trên ${images.length}` : `Minh họa ${product.productName}`}
        >
          <ProductArtwork image={currentImage} productName={product.productName} productType={product.productType} />
        </button>
        <IconButton className="v2-gallery-arrow is-previous" label="Ảnh trước" disabled={images.length < 2} onClick={showPrevious}><ChevronIcon direction="previous" /></IconButton>
        <IconButton className="v2-gallery-arrow is-next" label="Ảnh tiếp theo" disabled={images.length < 2} onClick={showNext}><ChevronIcon direction="next" /></IconButton>
        <span className="v2-gallery-count" aria-live="polite">{images.length ? `${selectedIndex + 1} / ${images.length}` : "Chưa có ảnh xác minh"}</span>
      </div>
      <GalleryThumbnails images={images} selectedIndex={selectedIndex} product={product} onSelect={selectImage} />
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
        <div className="v2-lightbox-content">
          <div className="v2-lightbox-toolbar">
            <span className="v2-mono">{images.length ? `${selectedIndex + 1} / ${images.length}` : "Chưa có ảnh xác minh"}</span>
            <IconButton className="v2-lightbox-close" label="Đóng thư viện ảnh" onClick={closeLightbox}><CloseIcon /></IconButton>
          </div>
          <div className="v2-lightbox-stage">
            <IconButton label="Ảnh trước" disabled={images.length < 2} onClick={showPrevious}><ChevronIcon direction="previous" /></IconButton>
            <ProductArtwork image={currentImage} productName={product.productName} productType={product.productType} />
            <IconButton label="Ảnh tiếp theo" disabled={images.length < 2} onClick={showNext}><ChevronIcon direction="next" /></IconButton>
          </div>
          <GalleryThumbnails images={images} selectedIndex={selectedIndex} product={product} onSelect={selectImage} />
        </div>
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
