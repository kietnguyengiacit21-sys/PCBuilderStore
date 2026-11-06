import { useEffect, useState } from "react";
import { fetchCatalogAttributeDefinitions } from "../catalog-api";
import type { CatalogAttributeDefinition } from "../catalog-api";

export function useCatalogAttributeDefinitions() {
  const [definitions, setDefinitions] = useState<CatalogAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalogAttributeDefinitions(controller.signal).then(
      (response) => setDefinitions(response.data),
      (reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Không thể tải định nghĩa thông số.");
        }
      },
    ).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  return { definitions, loading, error };
}
