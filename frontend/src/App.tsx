import { Navigate, Route, Routes } from "react-router-dom";
import HealthPage from "./HealthPage";
import LegacyScreen from "./LegacyScreen";
import { screens } from "./pages";

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
    <Routes>
      <Route path="/" element={<Navigate to="/customer/home" replace />} />
      <Route path="/system/health" element={<HealthPage />} />
      {screens.map((screen) => (
        <Route
          key={screen.path}
          path={screen.path}
          element={<LegacyScreen screen={screen} />}
        />
      ))}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
