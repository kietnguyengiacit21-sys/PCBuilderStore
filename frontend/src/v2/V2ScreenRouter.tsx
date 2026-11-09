import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import type { ScreenRoute } from "../pages";
import {
  BrandsAdminPage,
  CategoriesAdminPage,
  CsvImportPage,
  CustomerLookupPage,
  DashboardPage,
  OrdersManagementPage,
  StaffRolesPage,
} from "./AdminScreens";
import {
  AdminProductEditorPage,
  AdminProductManagementPage,
} from "./AdminCatalogScreens";
import {
  ComparePage,
  FacetManagementPage,
  HomePage,
  PartsPage,
  ProductPage,
} from "./CatalogScreens";
import { PcBuilderPage } from "./PcBuilderPage";
import {
  AccountPage,
  CartPage,
  CheckoutPage,
  LoginPage,
  GuestOrderLookupPage,
  OrderDetailPage,
  OrderHistoryPage,
  OrderResultPage,
  RegisterPage,
  RoleGate,
} from "./CustomerScreens";
import { PromotionsPage } from "./PromotionsPage";
import { AdminLayout, CustomerLayout, ErrorState } from "./components";

class V2ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("V2 screen failed to render.", error);
  }

  render() {
    if (this.state.error) {
      return <div className="v2-theme"><main className="v2-error-page">
        <ErrorState title="Không thể hiển thị màn hình" message={this.state.error.message} />
        <button className="v2-button v2-button-secondary" type="button" onClick={() => window.location.reload()}>Tải lại trang</button>
      </main></div>;
    }
    return this.props.children;
  }
}

function AdminScreen({
  title,
  children,
  audience = "admin",
}: {
  title: string;
  children: ReactNode;
  audience?: "staff" | "admin";
}) {
  return <RoleGate audience={audience}><AdminLayout
      title={title}
      breadcrumb={[{ label: "Quản trị", href: "/admin/dashboard" }, { label: title }]}
    >
      {children}
    </AdminLayout></RoleGate>;
}

function screenContent(path: string): ReactNode {
  switch (path) {
    case "/customer/home": return <CustomerLayout><HomePage /></CustomerLayout>;
    case "/customer/parts": return <CustomerLayout><PartsPage /></CustomerLayout>;
    case "/customer/product": return <CustomerLayout><ProductPage /></CustomerLayout>;
    case "/customer/cart": return <CustomerLayout><CartPage /></CustomerLayout>;
    case "/customer/checkout": return <CustomerLayout><CheckoutPage /></CustomerLayout>;
    case "/customer/order-result": return <CustomerLayout><OrderResultPage /></CustomerLayout>;
    case "/customer/guest-order-lookup": return <CustomerLayout><GuestOrderLookupPage /></CustomerLayout>;
    case "/customer/register": return <CustomerLayout><RegisterPage /></CustomerLayout>;
    case "/login": return <LoginPage />;
    case "/customer/account": return <CustomerLayout><RoleGate audience="customer"><AccountPage /></RoleGate></CustomerLayout>;
    case "/customer/orders": return <CustomerLayout><RoleGate audience="customer"><OrderHistoryPage /></RoleGate></CustomerLayout>;
    case "/customer/order-detail": return <CustomerLayout><RoleGate audience="customer"><OrderDetailPage /></RoleGate></CustomerLayout>;
    case "/customer/compare": return <CustomerLayout><ComparePage /></CustomerLayout>;
    case "/admin/dashboard": return <AdminScreen title="Tổng quan điều hành" audience="staff"><DashboardPage /></AdminScreen>;
    case "/admin/products": return <AdminScreen title="Quản lý sản phẩm"><AdminProductManagementPage /></AdminScreen>;
    case "/admin/product-edit": return <AdminScreen title="Tạo / sửa sản phẩm"><AdminProductEditorPage /></AdminScreen>;
    case "/admin/csv-import": return <AdminScreen title="Nhập dữ liệu CSV"><CsvImportPage /></AdminScreen>;
    case "/admin/categories": return <AdminScreen title="Quản lý danh mục"><CategoriesAdminPage /></AdminScreen>;
    case "/admin/brands": return <AdminScreen title="Quản lý thương hiệu"><BrandsAdminPage /></AdminScreen>;
    case "/admin/orders": return <AdminScreen title="Quản lý đơn hàng"><OrdersManagementPage /></AdminScreen>;
    case "/admin/promotions": return <AdminScreen title="Khuyến mãi và chiến dịch"><PromotionsPage /></AdminScreen>;
    case "/admin/customers": return <AdminScreen title="Tra cứu khách hàng"><CustomerLookupPage /></AdminScreen>;
    case "/admin/staff": return <AdminScreen title="Nhân viên và vai trò"><StaffRolesPage /></AdminScreen>;
    default:
      return path.startsWith("/build-pc/") ? <CustomerLayout><PcBuilderPage /></CustomerLayout> : <CustomerLayout><FacetManagementPage kind="categories" /></CustomerLayout>;
  }
}

export default function V2ScreenRouter({ screen }: { screen: ScreenRoute }) {
  return <V2ErrorBoundary key={screen.path}>{screenContent(screen.path)}</V2ErrorBoundary>;
}
