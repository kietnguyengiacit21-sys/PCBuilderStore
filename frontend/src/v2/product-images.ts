import type { CatalogImage } from "../catalog-api";

export function uniqueProductImages(images: CatalogImage[]): CatalogImage[] {
  return images.reduce<CatalogImage[]>((uniqueImages, image) => {
    const existingIndex = uniqueImages.findIndex((item) => item.url === image.url);
    if (existingIndex < 0) uniqueImages.push(image);
    else if (image.isPrimary && !uniqueImages[existingIndex].isPrimary) uniqueImages[existingIndex] = image;
    return uniqueImages;
  }, []);
}

export function availableProductImages(images: CatalogImage[], failedUrls: ReadonlySet<string>): CatalogImage[] {
  return images.filter((image) => !failedUrls.has(image.url));
}

export function preferredProductImage(images: CatalogImage[]): CatalogImage | undefined {
  return images.find((image) => image.isPrimary) ?? images[0];
}
