import { Link } from "react-router-dom";
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
  ProductEditPage,
  StaffRolesPage,
} from "./AdminScreens";
import {
  ComparePage,
  FacetManagementPage,
  HomePage,
  PartsPage,
  ProductManagementPage,
  ProductPage,
} from "./CatalogScreens";
import {
  AccountPage,
  CartPage,
  CheckoutPage,
  LoginPage,
  OrderDetailPage,
  OrderHistoryPage,
  OrderResultPage,
  RegisterPage,
  RoleGate,
} from "./CustomerScreens";
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

function AdminScreen({ title, children }: { title: string; children: ReactNode }) {
  return <RoleGate audience="staff"><AdminLayout
      title={title}
      breadcrumb={[{ label: "Quản trị", href: "/admin/dashboard" }, { label: title }]}
    >
      {children}
    </AdminLayout></RoleGate>;
}

function ComingSoonPage() {
  return <CustomerLayout><div className="v2-page v2-coming-page">
    <span className="v2-coming-illustration" aria-hidden="true">PC</span>
    <p className="v2-eyebrow">B01–B08 · Hoãn triển khai</p>
    <h1>Build-PC · Coming Soon</h1>
    <p>Trình xây dựng cấu hình PC chưa được triển khai. Chưa có kiểm tra tương thích, benchmark hoặc tính tồn kho theo BOM.</p>
    <Link className="v2-button v2-button-secondary" to="/customer/parts">Tiếp tục tìm linh kiện</Link>
  </div></CustomerLayout>;
}

function screenContent(path: string): ReactNode {
  switch (path) {
    case "/customer/home": return <CustomerLayout><HomePage /></CustomerLayout>;
    case "/customer/parts": return <CustomerLayout><PartsPage /></CustomerLayout>;
    case "/customer/product": return <CustomerLayout><ProductPage /></CustomerLayout>;
    case "/customer/cart": return <CustomerLayout><CartPage /></CustomerLayout>;
    case "/customer/checkout": return <CustomerLayout><CheckoutPage /></CustomerLayout>;
    case "/customer/order-result": return <CustomerLayout><OrderResultPage /></CustomerLayout>;
    case "/customer/register": return <CustomerLayout><RegisterPage /></CustomerLayout>;
    case "/customer/login": return <CustomerLayout><LoginPage audience="customer" /></CustomerLayout>;
    case "/customer/account": return <CustomerLayout><RoleGate audience="customer"><AccountPage /></RoleGate></CustomerLayout>;
    case "/customer/orders": return <CustomerLayout><RoleGate audience="customer"><OrderHistoryPage /></RoleGate></CustomerLayout>;
    case "/customer/order-detail": return <CustomerLayout><RoleGate audience="customer"><OrderDetailPage /></RoleGate></CustomerLayout>;
    case "/customer/compare": return <CustomerLayout><ComparePage /></CustomerLayout>;
    case "/admin/login": return <LoginPage audience="staff" />;
    case "/admin/dashboard": return <AdminScreen title="Tổng quan điều hành"><DashboardPage /></AdminScreen>;
    case "/admin/products": return <AdminScreen title="Quản lý sản phẩm"><RoleGate audience="staff"><ProductManagementPage /></RoleGate></AdminScreen>;
    case "/admin/product-edit": return <AdminScreen title="Tạo / sửa sản phẩm"><ProductEditPage /></AdminScreen>;
    case "/admin/csv-import": return <AdminScreen title="Nhập dữ liệu CSV"><CsvImportPage /></AdminScreen>;
    case "/admin/categories": return <AdminScreen title="Quản lý danh mục"><CategoriesAdminPage /></AdminScreen>;
    case "/admin/brands": return <AdminScreen title="Quản lý thương hiệu"><BrandsAdminPage /></AdminScreen>;
    case "/admin/orders": return <AdminScreen title="Quản lý đơn hàng"><OrdersManagementPage /></AdminScreen>;
    case "/admin/customers": return <AdminScreen title="Tra cứu khách hàng"><CustomerLookupPage /></AdminScreen>;
    case "/admin/staff": return <AdminScreen title="Nhân viên và vai trò"><StaffRolesPage /></AdminScreen>;
    default:
      return path.startsWith("/build-pc/") ? <ComingSoonPage /> : <CustomerLayout><FacetManagementPage kind="categories" /></CustomerLayout>;
  }
}

export default function V2ScreenRouter({ screen }: { screen: ScreenRoute }) {
  return <V2ErrorBoundary key={screen.path}>{screenContent(screen.path)}</V2ErrorBoundary>;
}
