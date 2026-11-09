export interface ScreenRoute {
  path: string;
  title: string;
  source: string;
}

export const screens: ScreenRoute[] = [
  {
    path: "/customer/home",
    title: "Trang chủ",
    source: "../C01-C17/C01-homepage/index.html",
  },
  {
    path: "/customer/parts",
    title: "Tìm linh kiện",
    source: "../C01-C17/C02-parts-search/index.html",
  },
  {
    path: "/customer/product",
    title: "Chi tiết sản phẩm",
    source: "../C01-C17/C03-product-detail/index.html",
  },
  {
    path: "/customer/cart",
    title: "Giỏ hàng",
    source: "../C01-C17/C04-cart/index.html",
  },
  {
    path: "/customer/checkout",
    title: "Thanh toán",
    source: "../C01-C17/C05-checkout/index.html",
  },
  {
    path: "/customer/order-result",
    title: "Kết quả đơn hàng",
    source: "../C01-C17/C06-order-result/index.html",
  },
  {
    path: "/customer/register",
    title: "Đăng ký",
    source: "../C01-C17/C07-register/index.html",
  },
  {
    path: "/login",
    title: "Đăng nhập",
    source: "../C01-C17/C08-login/index.html",
  },
  {
    path: "/customer/account",
    title: "Tài khoản",
    source: "../C01-C17/C10-account-overview/index.html",
  },
  {
    path: "/customer/orders",
    title: "Lịch sử đơn hàng",
    source: "../C01-C17/C11-order-history/index.html",
  },
  {
    path: "/customer/order-detail",
    title: "Chi tiết đơn hàng",
    source: "../C01-C17/C12-order-detail/index.html",
  },
  {
    path: "/customer/guest-order-lookup",
    title: "Tra cứu đơn khách",
    source: "../C01-C17/C12-order-detail/index.html",
  },
  {
    path: "/customer/compare",
    title: "So sánh sản phẩm",
    source: "../C01-C17/C17-product-comparison/index.html",
  },
  {
    path: "/admin/dashboard",
    title: "Tổng quan điều hành",
    source: "../A01-A15/A02-dashboard/index.html",
  },
  {
    path: "/admin/products",
    title: "Quản lý sản phẩm",
    source: "../A01-A15/A03-product-management/index.html",
  },
  {
    path: "/admin/product-edit",
    title: "Thêm hoặc sửa sản phẩm",
    source: "../A01-A15/A04-product-create-edit/index.html",
  },
  {
    path: "/admin/csv-import",
    title: "Nhập dữ liệu CSV",
    source: "../A01-A15/A05-csv-import/index.html",
  },
  {
    path: "/admin/categories",
    title: "Quản lý danh mục",
    source: "../A01-A15/A07-category-management/index.html",
  },
  {
    path: "/admin/brands",
    title: "Quản lý thương hiệu",
    source: "../A01-A15/A08-brand-management/index.html",
  },
  {
    path: "/admin/orders",
    title: "Quản lý đơn hàng",
    source: "../A01-A15/A09-order-management/index.html",
  },
  {
    path: "/admin/promotions",
    title: "Khuyến mãi và chiến dịch",
    source: "../A01-A15/A13-promotions/index.html",
  },
  {
    path: "/admin/customers",
    title: "Tra cứu khách hàng",
    source: "../A01-A15/A10-customer-lookup/index.html",
  },
  {
    path: "/admin/staff",
    title: "Nhân viên và quyền",
    source: "../A01-A15/A12-staff-roles/index.html",
  },
  {
    path: "/build-pc/start",
    title: "Xây dựng cấu hình PC",
    source: "../B01-B08/B01-B08/B01/code.html",
  },
  {
    path: "/build-pc/advanced",
    title: "Cấu hình PC nâng cao",
    source: "../B01-B08/B01-B08/B02/code.html",
  },
  {
    path: "/build-pc/guided",
    title: "Tư vấn cấu hình PC",
    source: "../B01-B08/B01-B08/B03/code.html",
  },
  {
    path: "/build-pc/compatibility",
    title: "Kiểm tra tương thích",
    source: "../B01-B08/B01-B08/B04/code.html",
  },
  {
    path: "/build-pc/summary",
    title: "Tóm tắt cấu hình",
    source: "../B01-B08/B01-B08/B05/code.html",
  },
  {
    path: "/build-pc/benchmark",
    title: "Đo kiểm hiệu năng",
    source: "../B01-B08/B01-B08/B06/code.html",
  },
  {
    path: "/build-pc/replacements",
    title: "Gợi ý thay thế",
    source: "../B01-B08/B01-B08/B07/code.html",
  },
  {
    path: "/build-pc/export",
    title: "Xuất cấu hình",
    source: "../B01-B08/B01-B08/B08/code.html",
  },
];

const routeBySource = new Map(
  screens.map((screen) => [sourceToLegacyPath(screen.source), screen.path]),
);

export const routeByDataPath: Record<string, string> = {
  "trang-chu": "/customer/home",
  home: "/customer/home",
  "linh-kien": "/customer/parts",
  "pc-lap-san": "/build-pc/start",
  "build-pc": "/build-pc/start",
  "Xây dựng PC": "/build-pc/start",
  "Xây dựng PC/guided": "/build-pc/guided",
  "Xây dựng PC/advanced": "/build-pc/advanced",
  "Xây dựng PC-nang-cao": "/build-pc/advanced",
  "Xây dựng PC-slot-07": "/customer/parts",
  "cau-hinh-nang-cao": "/build-pc/advanced",
  "chon-case": "/customer/parts",
  "chon-psu": "/customer/parts",
  "chon-ssd": "/customer/parts",
  "chon-tan-nhiet": "/customer/parts",
  "dang-nhap": "/login",
  "do-kiem-hieu-nang": "/build-pc/benchmark",
  "goi-y-thay-the": "/build-pc/replacements",
  "kiem-tra-tuong-thich": "/build-pc/compatibility",
  "thay-doi-cpu": "/customer/parts",
  "thay-doi-gpu": "/customer/parts",
  "thay-doi-mainboard": "/customer/parts",
  "thay-doi-ram": "/customer/parts",
  "xuat-cau-hinh": "/build-pc/export",
  "tai-khoan": "/customer/account",
  "don-hang": "/customer/orders",
  "gio-hang": "/customer/cart",
  "so-sanh": "/customer/compare",
};

const htmlModules = import.meta.glob("../**/*.html", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

export async function getMarkup(source: string): Promise<string> {
  const loadMarkup = htmlModules[source];

  if (!loadMarkup) {
    throw new Error(`Missing HTML source for screen: ${source}`);
  }

  return loadMarkup();
}

export function sourceToLegacyPath(source: string): string {
  return `/${source.replace(/^\.\.\//, "")}`;
}

export function routeForLegacyPath(pathname: string): string | undefined {
  return routeBySource.get(pathname);
}
