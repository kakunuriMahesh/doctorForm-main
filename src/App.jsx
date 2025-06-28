// import DoctorForm from './DoctorForm/DoctorForm'
import "./App.css";
import Home from "./Pages/Home";
import PrivacyPolicy from "./Pages/PrivacyPolicy";
import TermsAndConditions from "./Pages/TermsAndConditions";
import CancellationAndRefund from "./Pages/CancellationAndRefund";
import ShippingAndDelivery from "./Pages/ShippingAndDelivery";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/cancellation-and-refund" element={<CancellationAndRefund />} />
        <Route path="/shipping-and-delivery" element={<ShippingAndDelivery />} />
      </Routes>
    </Router>
  );
}

export default App;
