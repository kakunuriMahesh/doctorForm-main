import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import { generateMeetingLink, sendConfirmationEmail } from "./generateMeetingLink ";
import { User, Phone, Mail, Calendar, Clock, MessageSquare, MapPin, Info, Stethoscope, Building2 } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import UnderLine from "../assets/UnderLine.svg";
import Loading from "../components/Loading";
import SuccessModal from "../components/SuccessModal";


const {
  VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
  VITE_GOOGLE_CLIENT_ID: clientId,
  VITE_GOOGLE_CLIENT_SECRET: clientSecret,
} = import.meta.env;

console.log("Env variables:", { clientId, clientSecret, refreshToken: initialRefreshToken });



const DoctorForm = () => {
  // const localhost = "http://localhost:5001";
  const production = "https://doctor-backend-pay.onrender.com";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    meetingType: "",
    meetingContact: "",
    appointmentDate: "",
    appointmentTime: "",
    couponCode: "",
    bookingMode: "online", // "online" or "offline"
    serviceType: "",
  });

  const [selectedServicePrice, setSelectedServicePrice] = useState(0);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceConfig, setServiceConfig] = useState(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [timer, setTimer] = useState(300);
  const [loadingStates, setLoadingStates] = useState({
    initiatingPayment: false,
    refreshingToken: false,
    submittingForm: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedMeetingLink, setGeneratedMeetingLink] = useState("");
  const [completePaymentResponse, setCompletePaymentResponse] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [tokenManager, setTokenManager] = useState({
    accessToken: localStorage.getItem("accessToken") || null,
    tokenExpiry: localStorage.getItem("tokenExpiry") || 0,
    clientId: clientId,
    clientSecret: clientSecret,
    refreshToken: initialRefreshToken,
  });

  console.log("Payment details:", paymentDetails);

  useEffect(() => {
    let interval;
    if (showPaymentModal && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showPaymentModal, timer]);

  useEffect(() => {
    const fetchServiceConfig = async () => {
      setLoadingServices(true);
      try {
        const response = await axios.get(`https://s-doctorbackend-admin.onrender.com/api/service-configs`);
        // const response = await axios.get(`http://localhost:5000/api/service-configs`);
        console.log("Service config response:", response.data);
        if (response.data) {
          let onlineConfig = null;
          if (Array.isArray(response.data)) {
            onlineConfig = response.data.find(c => c.mode === 'online') || response.data[0];
          } else {
            onlineConfig = response.data;
          }

          if (onlineConfig) {
            setServiceConfig(onlineConfig);
            
            const start = onlineConfig.timeStart;
            const end = onlineConfig.timeEnd;
            const duration = onlineConfig.sessionDuration;
          
          if (start && end && duration) {
            const slots = [];
            const parseTime = (timeStr) => {
              const [hours, minutes] = timeStr.split(':').map(Number);
              const date = new Date();
              date.setHours(hours, minutes, 0, 0);
              return date;
            };

            let currentTime = parseTime(start);
            const endTime = parseTime(end);

            while (currentTime < endTime) {
              const slotStart = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              currentTime.setMinutes(currentTime.getMinutes() + duration);
              if (currentTime > endTime) break;
              const slotEnd = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              slots.push(`${slotStart} - ${slotEnd}`);
            }
            setAvailableSlots(slots);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching service config:', error);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServiceConfig();
  // }, [localhost]);
  }, []);

  const refreshAccessToken = async () => {
    setLoadingStates(prev => ({ ...prev, refreshingToken: true }));
    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: tokenManager.clientId,
          client_secret: tokenManager.clientSecret,
          refresh_token: tokenManager.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const data = await response.json();
      console.log("Token refresh response:", { status: response.status, data });
      if (!response.ok) throw new Error(`Token refresh failed: ${data.error || "Unknown error"}`);

      setTokenManager((prev) => {
        const newState = {
          ...prev,
          accessToken: data.access_token,
          tokenExpiry: Date.now() + data.expires_in * 1000,
        };
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("tokenExpiry", newState.tokenExpiry);
        return newState;
      });
      return data.access_token;
    } catch (error) {
      toast.error("Failed to refresh token");
      console.error("Token refresh error:", error.message);
      return null;
    } finally {
      setLoadingStates(prev => ({ ...prev, refreshingToken: false }));
    }
  };

  const initiatePayment = async () => {
    setLoadingStates(prev => ({ ...prev, initiatingPayment: true }));
    try {
      const response = await axios.post(`${production}/api/create-order`, {
        ...formData,
        price: selectedServicePrice,
      });
      setPaymentDetails(response.data);
      const options = {
        key: response.data.key,
        amount: response.data.amount,
        currency: "INR",
        name: "Doctor Consultation",
        description: `${formData.serviceType} - Appointment Booking`,
        order_id: response.data.orderId,
        handler: async function (response) {
          try {
            setGeneratedMeetingLink("");
            const verifyResponse = await axios.post(`${production}/api/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...formData,
              price: selectedServicePrice,
              meetingLink: "",
            });
            if (verifyResponse.data.status === "success") {
              setCompletePaymentResponse({
                ...verifyResponse.data.appointment,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: selectedServicePrice * 100,
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
              });
              setPaymentStatus(prev => prev + ", success");

              // Send confirmation email directly
              await sendConfirmationEmail(formData);

              await handleFormSubmission("success", verifyResponse.data.appointment);
              setShowPaymentModal(false);
              toast.success("Payment and booking successful!");
              setShowSuccessModal(true);
            } else {
              setPaymentStatus(prev => prev + ", failed");
              toast.error("Payment verification failed");
              await handleFormSubmission("failed");
            }
          } catch (error) {
            setPaymentStatus(prev => prev + ", failed");
            toast.error("Error verifying payment");
            console.error("Payment verification error:", error);
            await handleFormSubmission("failed");
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
        },
        theme: { color: "#f97316" },
        modal: {
          ondismiss: () => {
            setPaymentStatus(prev => prev + ", came back");
            setShowPaymentModal(false);
            setTimer(300);
            toast.error("Payment was not completed. For support, please contact us at support@doctorform.com or call +91-1234567890");
            handleFormSubmission("failed");
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
      setShowPaymentModal(true);
    } catch (error) {
      toast.error(`Error initiating payment: ${error.response?.data?.error || error.message}`);
      console.error("Payment initiation error:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, initiatingPayment: false }));
    }
  };

  const handleFormSubmission = async (status, paymentResponse = {}) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setLoadingStates(prev => ({ ...prev, submittingForm: true }));

    try {
      console.log(`Submitting with status: ${status}`);

      const scriptURL = 'https://script.google.com/macros/s/AKfycbzwOaGYr3MQ2hqYBESvpcbiDvo2bFbKNYyi4fiVOuUxN1EUGqWTvddTnjLe0ftDj5bOBA/exec';

      const formDataToSubmit = new FormData();

      // Core form fields
      Object.keys(formData).forEach((key) => {
        formDataToSubmit.append(key, formData[key] || "");
      });

      // Payment & appointment related fields
      formDataToSubmit.append("meetingLink", paymentResponse.meetingLink || "");
      formDataToSubmit.append("paymentId", paymentResponse.paymentId || paymentResponse.razorpay_payment_id || "");
      formDataToSubmit.append("orderId", paymentResponse.orderId || paymentResponse.razorpay_order_id || "");
      formDataToSubmit.append("appointmentStatus", status);

      // Payment gateway details
      if (formData.bookingMode === "online") {
        formDataToSubmit.append("amount", paymentDetails?.amount || "");
        formDataToSubmit.append("amountInINR", paymentDetails?.amountInINR || "");
        formDataToSubmit.append("currency", paymentDetails?.currency || "INR");
        formDataToSubmit.append("price", paymentDetails?.price || selectedServicePrice.toString());
      } else {
        // Offline booking - no payment
        formDataToSubmit.append("amount", "");
        formDataToSubmit.append("amountInINR", "");
        formDataToSubmit.append("currency", "");
        formDataToSubmit.append("price", "0");
      }

      // Final payment status
      let finalPaymentStatus = "not attempted";
      if (formData.bookingMode === "offline") {
        finalPaymentStatus = "N/A - Offline Consultation";
      } else if (status === "success") {
        finalPaymentStatus = "success";
      } else if (paymentStatus.includes("came back")) {
        finalPaymentStatus = "user cancelled / came back";
      } else if (paymentStatus.includes("failed")) {
        finalPaymentStatus = "failed";
      } else if (paymentStatus.includes("entered details")) {
        finalPaymentStatus = "initiated but incomplete";
      }

      formDataToSubmit.append("paymentStatus", finalPaymentStatus);

      console.log("Submitting to Google Sheet:", Object.fromEntries(formDataToSubmit));

      const response = await fetch(scriptURL, {
        method: "POST",
        body: formDataToSubmit,
      });

      const responseText = await response.text();
      console.log("Google Apps Script response:", response.status, responseText);

      if (response.ok) {
        if (status === "success") {
          toast.success("Appointment successfully booked!");
          setShowSuccessModal(true);
        } else {
          toast.error("Booking could not be completed. Please try again or contact support.");
        }
      } else {
        throw new Error(`Google Sheet submission failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Error saving appointment data");
    } finally {
      setLoadingStates(prev => ({ ...prev, submittingForm: false }));
      setIsSubmitting(false);
    }
  };

  // Handle online booking (with payment)
  const handleBookAppointment = (e) => {
    e.preventDefault();

    if (formData.bookingMode === "offline") {
      handleBookOffline();
      return;
    }

    setPaymentStatus("entered details");
    initiatePayment();
  };

  // Handle offline booking (no payment)
  const handleBookOffline = async () => {
    setLoadingStates(prev => ({ ...prev, submittingForm: true }));
    try {
      // Save offline appointment to database
      const dbResponse = await axios.post(`${production}/api/book-offline`, {
        ...formData
      });
      console.log('Offline DB response:', dbResponse.data);

      // Send confirmation emails
      await sendConfirmationEmail(formData);

      // Submit to Google Sheet
      await handleFormSubmission("success", dbResponse.data.appointment || {});

      toast.success("Offline appointment booked successfully!");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Offline booking error:", error);
      toast.error("Error booking offline appointment. Please try again.");
    } finally {
      setLoadingStates(prev => ({ ...prev, submittingForm: false }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Update price when service type changes
    if (name === "serviceType") {
      const service = serviceConfig?.services?.find(s => s.name === value);
      setSelectedServicePrice(service ? service.price : 0);
    }

    // Reset time slot when booking mode changes
    if (name === "bookingMode") {
      setFormData((prev) => ({ ...prev, [name]: value, appointmentTime: "", serviceType: "" }));
      setSelectedServicePrice(0);
    }
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  const handleDateChange = async (e) => {
    const selectedDate = e.target.value;
    setFormData((prev) => ({ ...prev, appointmentDate: selectedDate, appointmentTime: "" }));
    if (tokenManager.tokenExpiry < Date.now() || !tokenManager.accessToken) {
      // Token refresh if needed
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setGeneratedMeetingLink("");
    setCompletePaymentResponse(null);
    setPaymentStatus("");
    setIsSubmitting(false);
    setSelectedServicePrice(0);
    
    // Reset form data after showing success modal
    setFormData({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      meetingType: "",
      meetingContact: "",
      appointmentDate: "",
      appointmentTime: "",
      couponCode: "",
      bookingMode: "online",
      serviceType: "",
    });
    setPaymentDetails(null);
  };

  const isOnline = formData.bookingMode === "online";
  const isOffline = formData.bookingMode === "offline";

  return (
    <div className="w-fit p-6 bg-white shadow-xl rounded-xl relative">
      {/* Global loading overlay for any API call */}
      {(loadingStates.refreshingToken || loadingStates.initiatingPayment || loadingStates.submittingForm) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-xl">
          <Loading 
            size="large" 
            text={
              loadingStates.refreshingToken ? "Refreshing token..." :
              loadingStates.initiatingPayment ? "Initiating payment..." :
              loadingStates.submittingForm ? "Submitting appointment..." :
              "Loading..."
            } 
          />
        </div>
      )}
      
      <h1 className="text-xl md:text-3xl font-bold text-[#011632] text-center">
        Book Your Appointment
      </h1>
      <div className="flex justify-center mb-8">
          <img src={UnderLine} alt="Underline" className="w-32 md:w-48" />
        </div>
      
      {/* Loading overlay for form submission */}
      {loadingStates.submittingForm && (
        <Loading overlay={true} text="Submitting your appointment..." />
      )}
      
      <form onSubmit={handleBookAppointment} className="space-y-6">

        {/* ── Booking Mode Selection ── */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Consultation Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                isOnline
                  ? "border-blue-500 bg-blue-50 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="bookingMode"
                value="online"
                checked={isOnline}
                onChange={handleChange}
                required
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isOnline ? "border-blue-500" : "border-gray-300"
              }`}>
                {isOnline && <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-gray-800">Online Consultation</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Video call from the comfort of your home</p>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                isOffline
                  ? "border-green-500 bg-green-50 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="bookingMode"
                value="offline"
                checked={isOffline}
                onChange={handleChange}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isOffline ? "border-green-500" : "border-gray-300"
              }`}>
                {isOffline && <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-800">Offline Consultation</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Visit Asha Neuro Clinic in person</p>
              </div>
            </label>
          </div>
        </div>

        {/* Show clinic info and call button when offline is selected */}
        {isOffline && (
          <div className="flex flex-col items-center gap-4 py-8 px-4 bg-green-50 border border-green-200 rounded-xl text-center shadow-sm">
            <div className="bg-green-100 p-4 rounded-full">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Asha Neuro Clinic</h3>
              <p className="text-green-700 max-w-sm mx-auto">
                Shop Number F - 21, Sreeman Rama Complex, Hyderabad
              </p>
            </div>
            <a 
              href="tel:+919618769203"
              className="mt-4 text-white bg-green-600 hover:bg-green-700 py-3 px-8 rounded-lg font-semibold transition inline-block w-full sm:w-auto shadow-md"
            >
              Call to Book Appointment
            </a>
          </div>
        )}

        {/* ── Online Booking Form Fields ── */}
        {isOnline && (
          <>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
                  <User className="w-5 h-5 text-gray-400 ml-3" />
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
                  />
                </div>
              </div>
              <div className="relative flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-gray-400 italic text-xs">(optional)</span>
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
                  <User className="w-5 h-5 text-gray-400 ml-3" />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Phone */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <PhoneInput
                country={"in"}
                countryCodeEditable={false}
                value={formData.phone}
                onChange={handlePhoneChange}
                inputProps={{ name: "phone", required: true }}
                containerStyle={{ width: "100%" }}
                inputStyle={{
                  width: "100%",
                  padding: "25px",
                  paddingLeft: "45px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                }}
              />
            </div>

            {/* Email */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
              <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
                <Mail className="w-5 h-5 text-gray-400 ml-3" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email ID"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 italic">
                {isOnline
                  ? "Meeting Link will be sent to your email"
                  : "Appointment confirmation will be sent to your email"}
              </p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
                <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
                  <Calendar className="w-5 h-5 text-gray-400 ml-3" />
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleDateChange}
                    required
                    min={new Date().toISOString().split("T")[0]}
                    max={new Date(new Date().setMonth(new Date().getMonth() + 5)).toISOString().split("T")[0]}
                    className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Time</label>
                <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
                  <Clock className="w-5 h-5 text-gray-400 ml-3" />
                  <select
                    name="appointmentTime"
                    value={formData.appointmentTime}
                    onChange={handleChange}
                    required
                    className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
                  >
                    <option value="">Select a time slot</option>
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot, idx) => (
                        <option key={idx} value={slot}>{slot}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading slots...</option>
                    )}
                  </select>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Info className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-400">Each session is 45 minutes</p>
                </div>
              </div>
            </div>

            {/* ── Service Type Dropdown ── */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Type of Service</label>
              <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
                <Stethoscope className="w-5 h-5 text-gray-400 ml-3" />
                <select
                  name="serviceType"
                  value={formData.serviceType}
                  onChange={handleChange}
                  required
                  className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
                >
                  <option value="">Select a service</option>
                  {serviceConfig?.services?.filter(s => s.isActive).map((service) => (
                    <option key={service.name} value={service.name}>
                      {service.name} {isOnline ? `- ₹${service.price.toLocaleString("en-IN")}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {isOnline && selectedServicePrice > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Info className="w-3 h-3 text-blue-400" />
                  <p className="text-xs text-blue-500 font-medium">
                    Consultation fee: ₹{selectedServicePrice.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed bg-[#1376F8] hover:bg-[#0d5fd6]"
              disabled={loadingStates.initiatingPayment || loadingStates.submittingForm}
            >
              {loadingStates.initiatingPayment ? "Initiating Payment..." : 
               loadingStates.submittingForm ? "Processing..." : 
               `Book Appointment  ${selectedServicePrice > 0 ? "₹" + selectedServicePrice.toLocaleString("en-IN") : ""}`}
            </button>
          </>
        )}
      </form>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={closeSuccessModal}
        formData={formData}
        completePaymentResponse={completePaymentResponse}
        meetingLink={generatedMeetingLink}
      />

      <ToastContainer position="top-right" autoClose={5001} />
    </div>
  );
};

export default DoctorForm;
