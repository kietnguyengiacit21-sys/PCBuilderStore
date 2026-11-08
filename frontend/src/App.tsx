import { Navigate, Route, Routes } from "react-router-dom";
import HealthPage from "./HealthPage";
import { screens } from "./pages";
import V2FoundationPreview, { V2AdminShellPreview } from "./v2/V2FoundationPreview";
import V2ScreenRouter from "./v2/V2ScreenRouter";
import { AuthProvider } from "./v2/auth";
import { ComparisonProvider } from "./v2/comparison-store";

function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-8 text-center">
      <h1 className="mb-4 text-3xl font-bold">Không tìm thấy trang</h1>
      <a className="text-primary underline" href="/customer/home">
        Quay lại trang chủ
      </a>
    </main>
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
