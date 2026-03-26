import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import { generateMeetingLink, sendConfirmationEmail } from "./generateMeetingLink ";
import { User, Phone, Mail, Calendar, Clock, MessageSquare } from "lucide-react";
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
  const localhost = "http://localhost:5001";
  const production = "https://doctor-backend-pay.onrender.com";
  const commonPrice = 800; // Common price for all time slots
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
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  // Commented out availableSlots as we're using fixed time slots now
  // const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [timer, setTimer] = useState(300);
  const [loadingStates, setLoadingStates] = useState({
    // fetchingSlots: false, // Commented out as not fetching slots anymore
    initiatingPayment: false,
    refreshingToken: false,
    submittingForm: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent multiple submissions
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedMeetingLink, setGeneratedMeetingLink] = useState("");
  const [completePaymentResponse, setCompletePaymentResponse] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(""); // Track payment status as a string
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

  // Commented out fetchSlots function as we're using fixed time slots
  /*
  const fetchSlots = async (date) => {
    setLoadingStates(prev => ({ ...prev, fetchingSlots: true }));
    try {
      console.log(`Fetching slots for ${date}`);
      const res = await axios.get(`${production}/api/slots/${date}`);
      console.log("Slots response:", res.data);
      if (Array.isArray(res.data)) {
        setAvailableSlots(res.data);
      } else {
        console.warn("Unexpected response format:", res.data);
        setAvailableSlots([]);
        toast.error("No slots available for this date");
      }
    } catch (error) {
      console.error("Error fetching slots:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      toast.error(error.response?.data?.error || "Error fetching slots");
      setAvailableSlots([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, fetchingSlots: false }));
    }
  };
  */

  const initiatePayment = async () => {
    setLoadingStates(prev => ({ ...prev, initiatingPayment: true }));
    try {
      // Commented out slot selection as using fixed price
      /*
      const selectedSlot = availableSlots.find(slot => slot.time === formData.appointmentTime);
      if (!selectedSlot) {
        toast.error("Please select a valid slot");
        return;
      }
      */
      const response = await axios.post(`${production}/api/create-order`, {
        ...formData,
        price: commonPrice,
      });
      setPaymentDetails(response.data);
      const options = {
        key: response.data.key,
        amount: response.data.amount,
        currency: "INR",
        name: "Doctor Consultation",
        description: "Appointment Booking",
        order_id: response.data.orderId,
        handler: async function (response) {
          try {
            // const accessToken =
            //   tokenManager.tokenExpiry > Date.now()
            //     ? tokenManager.accessToken
            //     : await refreshAccessToken();
            // const meetingLink = await generateMeetingLink(
            //   "Google Meet",
            //   formData.email,
            //   formData.appointmentDate,
            //   formData.appointmentTime,
            //   accessToken
            // );
            // if (meetingLink === "Error generating Google Meet link!") {
            //   toast.error("Failed to generate meeting link");
            //   return;
            // }
            // setGeneratedMeetingLink(meetingLink);
            // Send empty meeting link directly instead of generating one
            setGeneratedMeetingLink("");
            const verifyResponse = await axios.post(`${production}/api/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...formData,
              price: commonPrice,
              // meetingLink,
              meetingLink: "",
            });
            if (verifyResponse.data.status === "success") {
              setCompletePaymentResponse({
                ...verifyResponse.data.appointment,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: commonPrice * 100,
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
            // Show contact support on payment failure or dismissal
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

  // Commented out the previous handleFormSubmission function
  /*
  const handleFormSubmission = async (paymentResponse = {}) => {
    setLoadingStates(prev => ({ ...prev, submittingForm: true }));
    try {
      console.log("Starting form submission with paymentResponse:", paymentResponse);

      const scriptURL =
        "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
      const formDataToSubmit = new FormData();
      Object.keys(formData).forEach((key) => formDataToSubmit.append(key, formData[key]));
      formDataToSubmit.append("meetingLink", paymentResponse.meetingLink || "");
      formDataToSubmit.append("paymentId", paymentResponse.paymentId || "");
      formDataToSubmit.append("orderId", paymentResponse.orderId || "");
      if (paymentDetails) {
        formDataToSubmit.append("amount", paymentDetails.amount || "");
        formDataToSubmit.append("amountInINR", paymentDetails.amountInINR || "");
        formDataToSubmit.append("currency", paymentDetails.currency || "");
        formDataToSubmit.append("paymentStatus", "success");
        formDataToSubmit.append("price", paymentDetails.price || "");
      }

      console.log("Submitting to Google Sheet with data:", Object.fromEntries(formDataToSubmit));

      const response = await fetch(scriptURL, { method: "POST", body: formDataToSubmit });
      console.log("Google Sheet response status:", response.status, response.ok);

      console.log("Payment Details after success:", {
        storedPaymentDetails: paymentDetails,
        razorpayResponse: paymentResponse,
      });

      if (response.ok) {
        toast.success("Appointment successfully booked!");
        // Don't reset form data here as we need it for the success modal
        // The form will be reset when the success modal is closed
      } else {
        throw new Error("Failed to submit to Google Sheet");
      }
    } catch (error) {
      toast.error("Error processing submission");
      console.error("Submission error:", error);
    } finally {
      setLoadingStates(prev => ({ ...prev, submittingForm: false }));
    }
  };
  */

  // New handleFormSubmission function to handle both success and failure
  // const handleFormSubmission = async (status, paymentResponse = {}) => {
  //   if (isSubmitting) return; // Prevent multiple submissions
  //   setIsSubmitting(true);
  //   setLoadingStates(prev => ({ ...prev, submittingForm: true }));
  //   try {
  //     console.log(`Starting form submission with status: ${status}, paymentResponse:`, paymentResponse);

  //     const scriptURL =
  //       // "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
  //       "https://script.google.com/macros/s/AKfycbx1M2oQtptw8EoJJvf3voGDgrIATUHDBQzW91lMzpERUGEAbzT9fKuZ5y9t3qHxy6zcsw/exec"
  //     const formDataToSubmit = new FormData();
  //     Object.keys(formData).forEach((key) => formDataToSubmit.append(key, formData[key]));
  //     formDataToSubmit.append("meetingLink", paymentResponse.meetingLink || "");
  //     formDataToSubmit.append("paymentId", paymentResponse.paymentId || "");
  //     formDataToSubmit.append("orderId", paymentResponse.orderId || "");
  //     formDataToSubmit.append("appointmentStatus", status); // Add status: "success" or "failed"
  //     // Always append payment details, even if null
  //     formDataToSubmit.append("amount", paymentDetails?.amount || "");
  //     formDataToSubmit.append("amountInINR", paymentDetails?.amountInINR || "");
  //     formDataToSubmit.append("currency", paymentDetails?.currency || "");
  //     formDataToSubmit.append("paymentStatus", paymentStatus); // Use the accumulated status string
  //     formDataToSubmit.append("price", paymentDetails?.price || "");

  //     console.log("Submitting to Google Sheet with data:", Object.fromEntries(formDataToSubmit));

  //     const response = await fetch(scriptURL, { method: "POST", body: formDataToSubmit });
  //     console.log("Google Sheet response status:", response.status, response.ok);
  //     const responseText = await response.text();
  //     console.log("Google Sheet response text:", responseText);

  //     if (response.ok) {
  //       if (status === "success") {
  //         toast.success("Appointment successfully booked!");
  //         // Don't reset form data here as we need it for the success modal
  //         // The form will be reset when the success modal is closed
  //       } else {
  //         toast.error("Appointment booking failed. Please contact support.");
  //       }
  //     } else {
  //       throw new Error("Failed to submit to Google Sheet");
  //     }
  //   } catch (error) {
  //     toast.error("Error processing submission");
  //     console.error("Submission error:", error);
  //   } finally {
  //     setLoadingStates(prev => ({ ...prev, submittingForm: false }));
  //     setIsSubmitting(false);
  //   }
  // };
  const handleFormSubmission = async (status, paymentResponse = {}) => {
  if (isSubmitting) return;
  setIsSubmitting(true);
  setLoadingStates(prev => ({ ...prev, submittingForm: true }));

  try {
    console.log(`Submitting with status: ${status}`);

    // const scriptURL = "https://script.google.com/macros/s/AKfycbx1M2oQtptw8EoJJvf3voGDgrIATUHDBQzW91lMzpERUGEAbzT9fKuZ5y9t3qHxy6zcsw/exec";
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzwOaGYr3MQ2hqYBESvpcbiDvo2bFbKNYyi4fiVOuUxN1EUGqWTvddTnjLe0ftDj5bOBA/exec'

    const formDataToSubmit = new FormData();

    // Core form fields
    Object.keys(formData).forEach((key) => {
      formDataToSubmit.append(key, formData[key] || "");
    });

    // Payment & appointment related fields
    formDataToSubmit.append("meetingLink", paymentResponse.meetingLink || "");
    formDataToSubmit.append("paymentId", paymentResponse.paymentId || paymentResponse.razorpay_payment_id || "");
    formDataToSubmit.append("orderId", paymentResponse.orderId || paymentResponse.razorpay_order_id || "");
    formDataToSubmit.append("appointmentStatus", status); // "success" or "failed"

    // Payment gateway details (even if payment didn't happen)
    formDataToSubmit.append("amount", paymentDetails?.amount || "");
    formDataToSubmit.append("amountInINR", paymentDetails?.amountInINR || "");
    formDataToSubmit.append("currency", paymentDetails?.currency || "INR");
    formDataToSubmit.append("price", paymentDetails?.price || commonPrice.toString());

    // ── Final payment status ──
    let finalPaymentStatus = "not attempted";

    if (status === "success") {
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

  const handleBookAppointment = (e) => {
    e.preventDefault();
    setPaymentStatus("entered details");
    initiatePayment();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  const handleDateChange = async (e) => {
    const selectedDate = e.target.value;
    setFormData((prev) => ({ ...prev, appointmentDate: selectedDate, appointmentTime: "" }));
    // Commented out slot fetching as using fixed slots
    /*
    if (selectedDate) {
      await fetchSlots(selectedDate);
    } else {
      setAvailableSlots([]);
    }
    */
    if (tokenManager.tokenExpiry < Date.now() || !tokenManager.accessToken) {
      // const newToken = await refreshAccessToken(); // Commented out slot fetching as using fixed slots and not needing token for that
      // console.log("Refreshed token on date change:", newToken);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setGeneratedMeetingLink("");
    setCompletePaymentResponse(null);
    setPaymentStatus(""); // Reset payment status
    setIsSubmitting(false); // Reset submitting flag
    
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
    });
    // setAvailableSlots([]); // Commented out as not using slots
    setPaymentDetails(null);
  };

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
        <div className="flex gap-4">
          <div className="relative">
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
          <div className="relative">
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
          <p className="text-xs text-gray-500 italic">Meeting Link will be sent to your email</p>
        </div>

        {/* Commented out Preferred Meeting Type and Meeting Contact fields for future use
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Meeting Type</label>
          <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
            <MessageSquare className="w-5 h-5 text-gray-400 ml-3" />
            <select
              name="meetingType"
              value={formData.meetingType}
              onChange={handleChange}
              required
              className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
            >
              <option value="">Select Meeting Type</option>
              <option value="Google Meet">Google Meet</option>
            </select>
          </div>
        </div>
        {formData.meetingType && (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address For Meet Link</label>
            <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
              <Mail className="w-5 h-5 text-gray-400 ml-3" />
              <input
                type="email"
                name="meetingContact"
                value={formData.meetingContact}
                placeholder="Email ID for Meet Link"
                onChange={handleChange}
                required
                className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
              />
            </div>
          </div>
        )}
        */}

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
                <option value="Morning (9am-12pm)">Morning (9am-12pm) - ₹{commonPrice}</option>
                <option value="Afternoon (2-4pm)">Afternoon (2-4pm) - ₹{commonPrice}</option>
                <option value="Evening (6-8pm)">Evening (6-8pm) - ₹{commonPrice}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Commented out Coupon Code field for future use
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code (Optional)</label>
          <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
            <input
              type="text"
              name="couponCode"
              placeholder="Enter coupon code"
              value={formData.couponCode}
              onChange={handleChange}
              className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
            />
          </div>
        </div>
        */}

        <button
          type="submit"
          className="w-full bg-[#1376F8] text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={loadingStates.initiatingPayment || loadingStates.submittingForm}
        >
          {loadingStates.initiatingPayment ? "Initiating Payment..." : 
           loadingStates.submittingForm ? "Processing..." : 
           "Book Appointment"}
        </button>
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
