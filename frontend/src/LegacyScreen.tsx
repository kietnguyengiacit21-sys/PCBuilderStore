import { useEffect, useState } from "react";
import { routeByDataPath, routeForLegacyPath, sourceToLegacyPath } from "./pages";
import type { ScreenRoute } from "./pages";
import { getMarkup } from "./pages";
import sharedInteractions from "../components/interactions.js?raw";

interface LegacyDocument {
  bodyClass: string;
  bodyMarkup: string;
  title: string;
  scripts: HTMLScriptElement[];
  headResources: (HTMLLinkElement | HTMLStyleElement)[];
}

function resolveRelativeUrl(value: string, sourcePath: string): string {
  return new URL(value, `${window.location.origin}${sourceToLegacyPath(sourcePath)}`).href;
}

function toLegacyDocument(markup: string, screen: ScreenRoute): LegacyDocument {
  const documentSource = new DOMParser().parseFromString(markup, "text/html");
  const sourcePath = sourceToLegacyPath(screen.source);
  const scripts = Array.from(documentSource.body.querySelectorAll("script"));

  for (const script of scripts) {
    script.remove();
  }

  const anchors = Array.from(
    documentSource.body.querySelectorAll<HTMLAnchorElement>("a[href]"),
  );

  for (const anchor of anchors) {
    const dataPath = anchor.dataset.path;
    const mappedRoute = dataPath ? routeByDataPath[dataPath] : undefined;

    if (mappedRoute) {
      anchor.href = mappedRoute;
      continue;
    }

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      continue;
    }

    const url = new URL(href, `${window.location.origin}${sourcePath}`);
    const mappedLegacyRoute = routeForLegacyPath(url.pathname);

    if (mappedLegacyRoute) {
      anchor.href = mappedLegacyRoute;
    } else if (url.pathname === "/index.html") {
      anchor.href = "/customer/home";
    } else if (url.origin === window.location.origin) {
      anchor.href = `${url.pathname}${url.search}${url.hash}`;
    }
  }

  for (const element of Array.from(
    documentSource.body.querySelectorAll("[src], [poster]"),
  )) {
    for (const attribute of ["src", "poster"]) {
      const value = element.getAttribute(attribute);
      if (
        value &&
        !value.startsWith("#") &&
        !value.startsWith("data:") &&
        !value.startsWith("http://") &&
        !value.startsWith("https://")
      ) {
        element.setAttribute(attribute, resolveRelativeUrl(value, screen.source));
      }
    }
  }

  const headResources = Array.from(
    documentSource.head.querySelectorAll("link[rel='preconnect'], link[rel='stylesheet'], style"),
  )
    .filter((element) => {
      if (element.tagName !== "LINK") {
        return true;
      }
      const href = (element as HTMLLinkElement).href;
      return href.startsWith("https://");
    })
    .map((element) => {
      if (element.tagName === "LINK") {
        const clone = element.cloneNode(true) as HTMLLinkElement;
        clone.href = resolveRelativeUrl(clone.getAttribute("href") ?? "", screen.source);
        return clone;
      }
      return element.cloneNode(true) as HTMLStyleElement;
    });

  return {
    bodyClass: documentSource.body.className,
    bodyMarkup: documentSource.body.innerHTML,
    title: documentSource.title || screen.title,
    scripts,
    headResources,
  };
}

interface LegacyScreenProps {
  screen: ScreenRoute;
}

export default function LegacyScreen({ screen }: LegacyScreenProps) {
  const [page, setPage] = useState<LegacyDocument>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    setPage(undefined);
    setError(undefined);

    void getMarkup(screen.source).then(
      (markup) => {
        if (active) {
          setPage(toLegacyDocument(markup, screen));
        }
      },
      (loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải nội dung màn hình.",
          );
        }
      },
    );

    return () => {
      active = false;
    };
  }, [screen]);

  useEffect(() => {
    if (!page) {
      return;
    }

    const previousBodyClass = document.body.className;
    const previousTitle = document.title;
    const addedResources: HTMLElement[] = [];

    document.body.className = page.bodyClass;
    document.title = page.title;

    for (const resource of page.headResources) {
      document.head.appendChild(resource);
      addedResources.push(resource);
    }

    const appendScript = (text: string) => {
      const script = document.createElement("script");
      script.textContent = text;
      document.body.appendChild(script);
      addedResources.push(script);
    };

    appendScript(sharedInteractions);
    for (const script of page.scripts) {
      if (script.src) {
        const source = script.getAttribute("src") ?? "";
        if (
          !source.includes("tailwindcss.com") &&
          !source.includes("theme-config.js") &&
          !source.includes("interactions.js")
        ) {
          const executable = document.createElement("script");
          executable.src = resolveRelativeUrl(source, screen.source);
          executable.async = false;
          document.body.appendChild(executable);
          addedResources.push(executable);
        }
      } else if (script.textContent?.trim() && script.id !== "tailwind-config") {
        const scriptText = script.textContent.trim();
        if (!scriptText.startsWith("tailwind.config")) {
          appendScript(scriptText);
        }
      }
    }

    return () => {
      for (const resource of addedResources) {
        resource.remove();
      }
      document.body.className = previousBodyClass;
      document.title = previousTitle;
    };
  }, [page, screen.source]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-8" role="alert">
        <h1 className="mb-4 text-2xl font-bold">Không thể tải trang</h1>
        <p>{error}</p>
      </main>
    );
  }

  if (!page) {
    return <main className="p-8" role="status">Đang tải trang…</main>;
  }

  return (
    <div
      className="legacy-screen"
      dangerouslySetInnerHTML={{ __html: page.bodyMarkup }}
    />
  );
}
