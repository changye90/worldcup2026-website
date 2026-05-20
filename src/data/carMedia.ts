/**
 * 本地封面图（与酒店外链图片可同时存在：租车 imageUrl 指向本路径即可）
 * 规则：把文件放在 `public/media/car-rentals/{id}.jpg`
 * 页面 URL：`/media/car-rentals/1001.jpg`
 */
export const CAR_LISTING_ID_START = 1001;

export function carCoverImageUrl(id: number): string {
  return `/media/car-rentals/${id}.jpg`;
}
