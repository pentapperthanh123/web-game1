import { useEffect, useState } from 'react';

/**
 * Dò một lần cho mỗi URL xem asset có tồn tại không (dùng chung cho 25 bàn, không bắn 25 request lỗi).
 * Khi chưa có kết quả hoặc ảnh không tồn tại, component hiển thị bản vẽ fallback.
 */
const probeCache = new Map<string, Promise<boolean>>();
const resolvedCache = new Map<string, boolean>();

const probeAsset = (src: string): Promise<boolean> => {
  const cached = probeCache.get(src);
  if (cached) return cached;

  const probe = new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0);
    image.onerror = () => resolve(false);
    image.src = src;
  }).then((isAvailable) => {
    resolvedCache.set(src, isAvailable);
    return isAvailable;
  });

  probeCache.set(src, probe);
  return probe;
};

export const useAssetAvailable = (src: string): boolean => {
  const [isAvailable, setIsAvailable] = useState<boolean>(() => resolvedCache.get(src) ?? false);

  useEffect(() => {
    let isActive = true;
    probeAsset(src).then((result) => {
      if (isActive) setIsAvailable(result);
    });
    return () => {
      isActive = false;
    };
  }, [src]);

  return isAvailable;
};
