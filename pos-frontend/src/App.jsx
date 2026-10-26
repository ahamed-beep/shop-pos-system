import { HashRouter as Router, Routes, Route, Link, BrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import { Provider } from "react-redux";
import { persistor, store } from "./Redux/Store/Store";
import { PersistGate } from "redux-persist/integration/react";
import AuthGuard from "./protector/AuthGuard";
import DashboardLayout from "./pages/DashboardLayout";
import ResetPassword from "./pages/ResetPassword";
import UploadProduct from "@/pages/UploadProduct";
import Dashboard from "./pages/Dashboard";
import ManageProducts from "./pages/ManageProducts";
import EditProductModal from "./pages/EditProductModal";
import BillingHistory from "./pages/BillingHistory";
import PinGuard from "./protector/PinGuard";
import SalesReport from "./pages/SalesReport";
import Settings from "./pages/Settings";
import FirstTimeSetup from "./pages/FirstTimeSetup";
import { useEffect } from "react";
import TitleBar from "./components/TitleBar";
import ToolBar from "./components/ToolBar";
import UdhaarManagement from "./pages/UdhaarManagement";

const App = () => {
  // Fix: Ensure window has focus on mount to prevent input freeze
  useEffect(() => {
    window.focus();
  }, []);

  return (
    <Router>
      <Provider store={store}>
        <PersistGate persistor={persistor} loading={null}>
          <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
            <TitleBar />
            <ToolBar />
            <div className="flex-1 overflow-hidden relative">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Login />} />
                <Route path='/reset' element={<ResetPassword />} />

                {/* Setup Routes */}
                <Route path="/first-time-setup" element={<FirstTimeSetup />} />

                {/* Protected Dashboard Routes */}
                <Route path="/Dashboard/" element={<AuthGuard requireUser={true}><DashboardLayout /></AuthGuard>} >
                  <Route index element={<Dashboard />} />
                  <Route path="product-upload" element={<PinGuard><UploadProduct /></PinGuard>} />
                  <Route path='product-edit/:id' element={<PinGuard><EditProductModal /></PinGuard>} />
                  <Route path="product-manage" element={<PinGuard><ManageProducts /></PinGuard>} />
                  <Route path="billing-history" element={<BillingHistory />} />
                  <Route path="sales-report" element={<SalesReport />} /> 
                  <Route path="udhaar-manage" element={<UdhaarManagement />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </div>
          </div>
        </PersistGate>
      </Provider>
    </Router>
  );
};

export default App;
