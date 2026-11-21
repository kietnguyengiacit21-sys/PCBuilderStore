import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Official store channels, top to bottom. Leave `href` empty until the store confirms
 * the real link: the button is shown but disabled ("đang cập nhật") instead of pointing
 * at a placeholder. For the phone, use "tel:+84xxxxxxxxx"; for Zalo, "https://zalo.me/<id>";
 * for Messenger, "https://m.me/<page>".
 */
export const CONTACT_LINKS: { key: string; label: string; href: string; icon: ReactNode }[] = [
  {
    key: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/share/16Q4bieUSSU/?mibextid=wwXIfr",
    icon: (
      <path d="M14 8.5V6.8c0-.8.5-1.3 1.4-1.3H17V2.2C16.5 2.1 15.4 2 14.2 2 11.6 2 10 3.6 10 6.4v2.1H7.2V12H10v10h4V12h2.8l.5-3.5H14z" />
    ),
  },
  {
    key: "messenger",
    label: "Messenger",
    href: "",
    icon: (
      <path d="M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.2 7.1v3.3l3-1.7c1.2.3 2.5.5 3.8.5 5.6 0 10-4.1 10-9.6S17.6 2 12 2zm1 12.9-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8z" />
    ),
  },
  {
    key: "zalo",
    label: "Zalo",
    href: "",
    icon: (
      <text x="12" y="15.6" textAnchor="middle" fontSize="9.5" fontWeight="800" fontFamily="Arial, sans-serif" letterSpacing="-0.3">Zalo</text>
    ),
  },
  {
    key: "youtube",
    label: "YouTube",
    href: "https://youtube.com/@eiuchannel?si=qvN6f_jV98I669kv",
    icon: (
      <path d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.7 12 4.7 12 4.7s-6.8 0-8.5.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.7.5 8.5.5 8.5.5s6.8 0 8.5-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-4.8zM9.8 15.1V8.9l5.6 3.1-5.6 3.1z" />
    ),
  },
  {
    key: "phone",
    label: "Gọi điện",
    href: "",
    icon: (
      <path d="M20.5 16.4v3.1a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 .6 3.7 2 2 0 0 1 2.6 1.5h3.1a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L6.6 9.4a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    ),
  },
];

const SHOW_TOP_AFTER_PX = 400;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Smoothly scrolls the window to the top with an eased animation whose duration scales
 * with distance (capped), independent of the browser's CSS scroll-behavior support.
 * Any user wheel/touch/key input cancels it so the page never fights the visitor.
 */
function scrollToTop(reducedMotion: boolean) {
  const start = window.scrollY;
  if (start <= 0) return;
  if (reducedMotion) {
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  const duration = Math.min(1300, 450 + start * 0.14);
  const startedAt = performance.now();
  let frame = 0;
  const cancel = () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  };
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel);
  const step = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    // "instant": the page sets scroll-behavior: smooth on <html>, which would otherwise
    // start a second native animation on every frame and make the motion stutter.
    window.scrollTo({ top: Math.round(start * (1 - easeInOutCubic(progress))), behavior: "instant" });
    if (progress < 1) frame = window.requestAnimationFrame(step);
    else cancel();
  };
  frame = window.requestAnimationFrame(step);
}

export function FloatingContact() {
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [trayOffset, setTrayOffset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  // Small screens show one "Liên hệ" toggle instead of the full column of channels.
  const [expanded, setExpanded] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => {
      ticking.current = false;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setShowTop(window.scrollY > SHOW_TOP_AFTER_PX);
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
    };
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Sit above the comparison tray when it is open at the bottom of the screen.
  useEffect(() => {
    let observed: Element | null = null;
    const resize = new ResizeObserver(() => {
      setTrayOffset(observed ? Math.round(observed.getBoundingClientRect().height) : 0);
    });
    const attach = () => {
      const tray = document.querySelector(".v2-comparison-tray");
      if (tray === observed) return;
      if (observed) resize.unobserve(observed);
      observed = tray;
      if (tray) resize.observe(tray);
      else setTrayOffset(0);
    };
    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      resize.disconnect();
    };
  }, []);

  const ring = 2 * Math.PI * 22;

  return (
    <nav
      className={`v2-float-contact${expanded ? " is-expanded" : ""}`}
      aria-label="Liên hệ cửa hàng"
      style={trayOffset ? { bottom: `calc(${trayOffset}px + 16px)` } : undefined}
    >
      <div className="v2-float-channels" id="v2-float-channels">
      {CONTACT_LINKS.map((link) => link.href ? (
        <a
          key={link.key}
          className={`v2-float-button is-${link.key}`}
          href={link.href}
          {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          aria-label={link.href.startsWith("http") ? `${link.label} (mở tab mới)` : link.label}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{link.icon}</svg>
          <span className="v2-float-label" aria-hidden="true">{link.label}</span>
        </a>
      ) : (
        <button
          key={link.key}
          type="button"
          className={`v2-float-button is-${link.key} is-pending`}
          aria-disabled="true"
          aria-label={`${link.label} (đang cập nhật)`}
          onClick={(event) => event.preventDefault()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">{link.icon}</svg>
          <span className="v2-float-label" aria-hidden="true">{link.label} · đang cập nhật</span>
        </button>
      ))}
      </div>
      <button
        type="button"
        className="v2-float-button v2-float-toggle"
        aria-expanded={expanded}
        aria-controls="v2-float-channels"
        aria-label={expanded ? "Đóng liên hệ" : "Liên hệ cửa hàng"}
        onClick={() => setExpanded((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {expanded
            ? <path d="M6 6l12 12M18 6 6 18" className="is-stroke" />
            : <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm4 5.5a1.2 1.2 0 1 0 0 .01zm4 0a1.2 1.2 0 1 0 0 .01zm4 0a1.2 1.2 0 1 0 0 .01z" />}
        </svg>
      </button>
      <button
        type="button"
        className={`v2-float-button is-top${showTop ? " is-visible" : ""}`}
        aria-label="Lên đầu trang"
        tabIndex={showTop ? 0 : -1}
        aria-hidden={!showTop}
        onClick={() => scrollToTop(reducedMotion)}
      >
        <svg className="v2-float-ring" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" />
          <circle
            className="is-progress"
            cx="24"
            cy="24"
            r="22"
            strokeDasharray={ring}
            strokeDashoffset={ring * (1 - progress)}
          />
        </svg>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="v2-float-arrow"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" /></svg>
        <span className="v2-float-label" aria-hidden="true">Lên đầu trang</span>
      </button>
    </nav>
  );
}
