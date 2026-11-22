import { useEffect } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { CustomerLayout } from "./v2/components";
import HealthPage from "./HealthPage";
import { screens } from "./pages";
import V2FoundationPreview, { V2AdminShellPreview } from "./v2/V2FoundationPreview";
import V2ScreenRouter from "./v2/V2ScreenRouter";
import { AuthProvider } from "./v2/auth";
import { ComparisonProvider } from "./v2/comparison-store";

function NotFound() {
  useEffect(() => { document.title = "Không tìm thấy trang | PC Builder Store"; }, []);
  return (
    <CustomerLayout>
      <div className="v2-page v2-not-found">
        <p className="v2-not-found-code" aria-hidden="true">404</p>
        <h1>Không tìm thấy trang</h1>
        <p>Trang bạn tìm có thể đã được đổi địa chỉ hoặc không còn tồn tại.</p>
        <div className="v2-action-row">
          <Link className="v2-button v2-button-primary" to="/customer/home">Về trang chủ</Link>
          <Link className="v2-button v2-button-secondary" to="/customer/parts">Xem sản phẩm</Link>
        </div>
      </div>
    </CustomerLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ComparisonProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/customer/home" replace />} />
          <Route path="/customer/login" element={<Navigate to="/login" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/system/health" element={<HealthPage />} />
          {import.meta.env.DEV && (
            <>
              <Route path="/system/v2-preview" element={<V2FoundationPreview />} />
              <Route path="/system/v2-admin-preview" element={<V2AdminShellPreview />} />
            </>
          )}
          {screens.map((screen) => (
            <Route
              key={screen.path}
              path={screen.path}
              element={<V2ScreenRouter screen={screen} />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ComparisonProvider>
    </AuthProvider>
  );
}
