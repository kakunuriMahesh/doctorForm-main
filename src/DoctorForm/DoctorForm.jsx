import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import { generateMeetingLink } from "./generateMeetingLink ";
import { User, Phone, Mail, Calendar, Clock, MessageSquare } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import UnderLine from "../assets/UnderLine.svg";


const {
  VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
  VITE_GOOGLE_CLIENT_ID: clientId,
  VITE_GOOGLE_CLIENT_SECRET: clientSecret,
} = import.meta.env;

console.log("Env variables:", { clientId, clientSecret, refreshToken: initialRefreshToken });

const DoctorForm = () => {
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [timer, setTimer] = useState(300);
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
    }
  };

  const fetchSlots = async (date) => {
    try {
      console.log(`Fetching slots for ${date}`);
      const res = await axios.get(`http://localhost:5001/api/slots/${date}`);
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
    }
  };

  const initiatePayment = async () => {
    try {
      const selectedSlot = availableSlots.find(slot => slot.time === formData.appointmentTime);
      if (!selectedSlot) {
        toast.error("Please select a valid slot");
        return;
      }

      const response = await axios.post("http://localhost:5001/api/create-order", {
        ...formData,
        price: selectedSlot.price,
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
            const accessToken =
              tokenManager.tokenExpiry > Date.now()
                ? tokenManager.accessToken
                : await refreshAccessToken();
            const meetingLink = await generateMeetingLink(
              formData.meetingType,
              formData.meetingContact,
              formData.appointmentDate,
              formData.appointmentTime,
              accessToken
            );

            if (meetingLink==="Error generating Google Meet link!") {
              toast.error("Failed to generate meeting link");
              return;
            }

            const verifyResponse = await axios.post("http://localhost:5001/api/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...formData,
              price: selectedSlot.price,
              meetingLink,
            });

            if (verifyResponse.data.status === "success") {
              await handleFormSubmission(verifyResponse.data.appointment);
              setShowPaymentModal(false);
              toast.success("Payment and booking successful!");
            } else {
              toast.error("Payment verification failed");
            }
          } catch (error) {
            toast.error("Error verifying payment");
            console.error("Payment verification error:", error);
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: "#f97316" },
        modal: {
          ondismiss: () => {
            setShowPaymentModal(false);
            setTimer(300);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setShowPaymentModal(true);
    } catch (error) {
      toast.error(`Error initiating payment: ${error.response?.data?.error || error.message}`);
      console.error("Payment initiation error:", error);
    }
  };

  const handleFormSubmission = async (paymentResponse = {}) => {
    setIsLoading(true);
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
        setAvailableSlots([]);
        setPaymentDetails(null);
      } else {
        throw new Error("Failed to submit to Google Sheet");
      }
    } catch (error) {
      toast.error("Error processing submission");
      console.error("Submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookAppointment = (e) => {
    e.preventDefault();
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
    if (selectedDate) {
      await fetchSlots(selectedDate);
    } else {
      setAvailableSlots([]);
    }
    if (tokenManager.tokenExpiry < Date.now() || !tokenManager.accessToken) {
      const newToken = await refreshAccessToken();
      console.log("Refreshed token on date change:", newToken);
    }
  };

  return (
    <div className="w-fit p-6 bg-white shadow-xl rounded-xl">
      <h1 className="text-xl md:text-3xl font-bold text-[#011632] text-center">
        Book Your Appointment
      </h1>
      <div className="flex justify-center mb-8">
          <img src={UnderLine} alt="Underline" className="w-32 md:w-48" />
        </div>
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
        </div>

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Slots</label>
            <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
              <Clock className="w-5 h-5 text-gray-400 ml-3" />
              <select
                name="appointmentTime"
                value={formData.appointmentTime}
                onChange={handleChange}
                required
                className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
              >
                <option value="">Select a slot</option>
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot, index) => (
                    <option key={index} value={slot.time}>
                      {slot.time} (₹{slot.price})
                    </option>
                  ))
                ) : (
                  <option>No slots available</option>
                )}
              </select>
            </div>
          </div>
        </div>

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

        <button
          type="submit"
          className="w-full bg-[#1376F8] text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Book Appointment"}
        </button>
      </form>

      <ToastContainer position="top-right" autoClose={5001} />
    </div>
  );
};

export default DoctorForm;

// FIXME: updating fromdate and todate

// import React, { useState, useEffect } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import axios from "axios";
// import "react-toastify/dist/ReactToastify.css";
// import { generateMeetingLink } from "./generateMeetingLink ";

// import { User, Phone, Mail, Calendar, Clock, MessageSquare } from "lucide-react";
// import PhoneInput from "react-phone-input-2";
// import "react-phone-input-2/lib/style.css";

// const {
//   VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
//   VITE_GOOGLE_CLIENT_ID: clientId,
//   VITE_GOOGLE_CLIENT_SECRET: clientSecret,
// } = import.meta.env;

// console.log("Env variables:", { clientId, clientSecret, refreshToken: initialRefreshToken });

// const DoctorForm = () => {
//   const [formData, setFormData] = useState({
//     firstName: "",
//     lastName: "",
//     phone: "",
//     email: "",
//     meetingType: "",
//     meetingContact: "",
//     appointmentDate: "",
//     appointmentTime: "",
//     couponCode: "",
//   });

//   const [availableSlots, setAvailableSlots] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [timer, setTimer] = useState(300);
//   const [tokenManager, setTokenManager] = useState({
//     accessToken: localStorage.getItem("accessToken") || null,
//     tokenExpiry: localStorage.getItem("tokenExpiry") || 0,
//     clientId: clientId,
//     clientSecret: clientSecret,
//     refreshToken: initialRefreshToken,
//   });
// console.log(paymentDetails, "payment details");
//   useEffect(() => {
//     let interval;
//     if (showPaymentModal && timer > 0) {
//       interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [showPaymentModal, timer]);

//   const refreshAccessToken = async () => {
//     try {
//       const response = await fetch("https://oauth2.googleapis.com/token", {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: new URLSearchParams({
//           client_id: tokenManager.clientId,
//           client_secret: tokenManager.clientSecret,
//           refresh_token: tokenManager.refreshToken,
//           grant_type: "refresh_token",
//         }),
//       });
//       const data = await response.json();
//       console.log("Token refresh response:", { status: response.status, data });
//       if (!response.ok) throw new Error(`Token refresh failed: ${data.error || "Unknown error"}`);

//       setTokenManager((prev) => {
//         const newState = {
//           ...prev,
//           accessToken: data.access_token,
//           tokenExpiry: Date.now() + data.expires_in * 1000,
//         };
//         localStorage.setItem("accessToken", data.access_token);
//         localStorage.setItem("tokenExpiry", newState.tokenExpiry);
//         return newState;
//       });
//       return data.access_token;
//     } catch (error) {
//       toast.error("Failed to refresh token");
//       console.error("Token refresh error:", error.message);
//       return null;
//     }
//   };

//   const fetchSlots = async (date) => {
//     try {
//       const res = await axios.get(`http://localhost:5001/api/slots/${date}`);
//       setAvailableSlots(res.data.map((slot) => slot.time));
//     } catch (error) {
//       toast.error("Error fetching slots");
//       setAvailableSlots([]);
//     }
//   };

//   const initiatePayment = async () => {
//     try {
//       const response = await axios.post("http://localhost:5001/api/create-order", formData);
//       setPaymentDetails(response.data);


//       const options = {
//         key: response.data.key,
//         amount: response.data.amount,
//         currency: "INR",
//         name: "Doctor Consultation",
//         description: "Appointment Booking",
//         order_id: response.data.orderId,
//         handler: async function (response) {
//           try {
//             const accessToken =
//               tokenManager.tokenExpiry > Date.now()
//                 ? tokenManager.accessToken
//                 : await refreshAccessToken();
//             const meetingLink = await generateMeetingLink(
//               formData.meetingType,
//               formData.meetingContact,
//               formData.appointmentDate,
//               formData.appointmentTime,
//               accessToken
//             );

//             const verifyResponse = await axios.post(
//               "http://localhost:5001/api/verify-payment",
//               {
//                 razorpay_order_id: response.razorpay_order_id,
//                 razorpay_payment_id: response.razorpay_payment_id,
//                 razorpay_signature: response.razorpay_signature,
//                 ...formData,
//                 price: 200,//FIXME: paymentDetails.price 
//                 meetingLink,
//               }
//             );

//             if (verifyResponse.data.status === "success") {
//               await handleFormSubmission(verifyResponse.data.appointment);
//               setShowPaymentModal(false);
//               toast.success("Payment and booking successful!");
//             } else {
//               toast.error("Payment verification failed");
//             }
//           } catch (error) {
//             toast.error("Error verifying payment");
//             console.error("Payment verification error:", error);
//           }
//         },
//         prefill: {
//           name: `${formData.firstName} ${formData.lastName}`.trim(),
//           email: formData.email,
//           contact: formData.phone,
//         },
//         theme: { color: "#f97316" },
//         modal: {
//           ondismiss: () => {
//             setShowPaymentModal(false);
//             setTimer(300);
//           },
//         },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.open();
//       setShowPaymentModal(true);
//     } catch (error) {
//       toast.error(`Error initiating payment: ${error.message}`);
//     }
//   };

//   const handleFormSubmission = async (paymentResponse = {}) => {
//     setIsLoading(true);
//     try {
//       console.log("Starting form submission with paymentResponse:", paymentResponse);
      
//       const scriptURL =
//         "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
//       const formDataToSubmit = new FormData();
//       Object.keys(formData).forEach((key) => formDataToSubmit.append(key, formData[key]));
//       formDataToSubmit.append("meetingLink", paymentResponse.meetingLink);
//       formDataToSubmit.append("paymentId", paymentResponse.paymentId || "");
//       formDataToSubmit.append("orderId", paymentResponse.orderId || "");
//       if (paymentDetails) {
//         formDataToSubmit.append("amount", paymentDetails.amount || "");
//         formDataToSubmit.append("amountInINR", paymentDetails.amountInINR || "");
//         formDataToSubmit.append("currency", paymentDetails.currency || "");
//         formDataToSubmit.append("paymentStatus", "success");
//       }
//       // TODO: comment rebooking for now based on feedback
//       if (paymentResponse.rebookingCode) {
//         formDataToSubmit.append("rebookingCode", paymentResponse.rebookingCode);
//         formDataToSubmit.append("rebookingValidFrom", paymentResponse.rebookingValidFrom);
//         formDataToSubmit.append("rebookingValidUntil", paymentResponse.rebookingValidUntil);
//       }
//       formDataToSubmit.append("price", paymentResponse.price || paymentDetails.price || "");

//       console.log("Submitting to Google Sheet with data:", Object.fromEntries(formDataToSubmit));

//       const response = await fetch(scriptURL, { method: "POST", body: formDataToSubmit });
//       console.log("Google Sheet response status:", response.status, response.ok);

//       console.log("Payment Details after success:", {
//         storedPaymentDetails: paymentDetails,
//         razorpayResponse: paymentResponse,
//       });

//       if (response.ok) {
//         toast.success("Appointment successfully booked!");
//         setFormData({
//           firstName: "",
//           lastName: "",
//           phone: "",
//           email: "",
//           meetingType: "",
//           meetingContact: "",
//           appointmentDate: "",
//           appointmentTime: "",
//           couponCode: "",
//         });
//         setAvailableSlots([]);
//         setPaymentDetails(null);
//       } else {
//         throw new Error("Failed to submit to Google Sheet");
//       }
//     } catch (error) {
//       toast.error("Error processing submission");
//       console.error("Submission error:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleBookAppointment = (e) => {
//     e.preventDefault();
//     initiatePayment();
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handlePhoneChange = (value) => {
//     setFormData((prev) => ({ ...prev, phone: value }));
//   };

//   const handleDateChange = async (e) => {
//     const selectedDate = e.target.value;
//     setFormData({ ...formData, appointmentDate: selectedDate });
//     await fetchSlots(selectedDate);
//     if (tokenManager.tokenExpiry < Date.now() || !tokenManager.accessToken) {
//       const newToken = await refreshAccessToken();
//       console.log("Refreshed token on date change:", newToken);
//     }
//   };

//   return (
//     <div className="w-fit p-6 bg-white shadow-xl rounded-xl">
//       <h1 className="text-xl md:text-3xl font-bold text-[#011632] mb-8 text-center">
//         Book Your Appointment
//       </h1>
//       <form onSubmit={handleBookAppointment} className="space-y-6">
//         <div className="flex gap-4">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="firstName"
//                 placeholder="First Name"
//                 value={formData.firstName}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Last Name <span className="text-gray-400 italic text-xs">(optional)</span>
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="lastName"
//                 placeholder="Last Name"
//                 value={formData.lastName}
//                 onChange={handleChange}
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
//           <PhoneInput
//             country={"in"}
//             value={formData.phone}
//             onChange={handlePhoneChange}
//             inputProps={{ name: "phone", required: true }}
//             containerStyle={{ width: "100%" }}
//             inputStyle={{
//               width: "100%",
//               padding: "25px",
//               paddingLeft: "45px",
//               borderRadius: "8px",
//               border: "1px solid #ccc",
//             }}
//           />
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Mail className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="email"
//               name="email"
//               placeholder="Email ID"
//               value={formData.email}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Meeting Type</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MessageSquare className="w-5 h-5 text-gray-400 ml-3" />
//             <select
//               name="meetingType"
//               value={formData.meetingType}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//             >
//               <option value="">Select Meeting Type</option>
//               <option value="Google Meet">Google Meet</option>
//             </select>
//           </div>
//         </div>

//         {formData.meetingType && (
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Email Address For Meet Link</label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Mail className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="email"
//                 name="meetingContact"
//                 value={formData.meetingContact}
//                 placeholder="Email ID for Meet Link"
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         )}

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Calendar className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="date"
//                 name="appointmentDate"
//                 value={formData.appointmentDate}
//                 onChange={handleDateChange}
//                 required
//                 min={new Date().toISOString().split("T")[0]}
//                 max={new Date(new Date().setMonth(new Date().getMonth() + 5)).toISOString().split("T")[0]}
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Available Slots</label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Clock className="w-5 h-5 text-gray-400 ml-3" />
//               <select
//                 name="appointmentTime"
//                 value={formData.appointmentTime}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//               >
//                 <option value="">Select a slot</option>
//                 {availableSlots.length > 0 ? (
//                   availableSlots.map((slot, index) => (
//                     <option key={index} value={slot}>{slot}</option>
//                   ))
//                 ) : (
//                   <option>No slots available</option>
//                 )}
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code (Optional)</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <input
//               type="text"
//               name="couponCode"
//               placeholder="Enter coupon or re-booking code"
//               value={formData.couponCode}
//               onChange={handleChange}
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         <button
//           type="submit"
//           className="w-full bg-[#1376F8] text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
//           disabled={isLoading}
//         >
//           {isLoading ? "Processing..." : "Book Appointment"}
//         </button>
//       </form>

//       <ToastContainer position="top-right" autoClose={5001} />
//     </div>
//   );
// };

// export default DoctorForm;

// TODO: working fine and need to update link and structure code

// import React, { clientId, useEffect } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import axios from "axios";
// import "react-toastify/dist/ReactToastify.css";
// import { generateMeetingLink } from "./generateMeetingLink ";

// import {
//   User,
//   Phone,
//   Mail,
//   Calendar,
//   Clock,
//   MessageSquare,
// } from "lucide-react";
// import PhoneInput from "react-phone-input-2";
// import "react-phone-input-2/lib/style.css";

// const DoctorForm = () => {
//   const [formData, setFormData] = useState({
//     firstName: "",
//     lastName: "",
//     phone: "",
//     email: "",
//     meetingType: "",
//     meetingContact: "",
//     appointmentDate: "",
//     appointmentTime: "",
//     couponCode: "",
//   });

//   const [availableSlots, setAvailableSlots] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [timer, setTimer] = useState(300);

//   useEffect(() => {
//     let interval;
//     if (showPaymentModal && timer > 0) {
//       interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [showPaymentModal, timer]);

//   const fetchSlots = async (date) => {
//     try {
//       const res = await axios.get(`http://localhost:5001/api/slots/${date}`);
//       setAvailableSlots(res.data.map((slot) => slot.time));
//     } catch (error) {
//       toast.error("Error fetching slots");
//       setAvailableSlots([]);
//     }
//   };

//   const initiatePayment = async () => {
//     try {
//       const response = await axios.post(
//         "http://localhost:5001/api/create-order",
//         formData
//       );
//       setPaymentDetails(response.data);

//       const options = {
//         key: response.data.key,
//         amount: response.data.amount,
//         currency: "INR",
//         name: "Doctor Consultation",
//         description: "Appointment Booking",
//         order_id: response.data.orderId,
//         handler: async function (response) {
//           try {
//             const verifyResponse = await axios.post(
//               "http://localhost:5001/api/verify-payment",
//               {
//                 razorpay_order_id: response.razorpay_order_id,
//                 razorpay_payment_id: response.razorpay_payment_id,
//                 razorpay_signature: response.razorpay_signature,
//                 ...formData,
//                 price: paymentDetails.price,
//               }
//             );

//             if (verifyResponse.data.status === "success") {
//               await handleFormSubmission(verifyResponse.data.appointment);
//               setShowPaymentModal(false);
//               toast.success("Payment and booking successful!");
//             } else {
//               toast.error("Payment verification failed");
//             }
//           } catch (error) {
//             toast.error("Error verifying payment");
//           }
//         },
//         prefill: {
//           name: `${formData.firstName} ${formData.lastName}`.trim(),
//           email: formData.email,
//           contact: formData.phone,
//         },
//         theme: { color: "#f97316" },
//         modal: {
//           ondismiss: () => {
//             setShowPaymentModal(false);
//             setTimer(300);
//           },
//         },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.open();
//       setShowPaymentModal(true);
//     } catch (error) {
//       toast.error(`Error initiating payment: ${error.message}`);
//     }
//   };

//   // const handleFormSubmission = async (appointment) => {
//   //   setIsLoading(true);
//   //   try {
//   //     const scriptURL =
//   //       "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
//   //     const formDataToSubmit = new FormData();
//   //     // const meetingLink = await generateMeetingLink(
//   //     //   formData.meetingType,
//   //     //   formData.meetingContact,
//   //     //   formData.appointmentDate,
//   //     //   formData.appointmentTime,
//   //     //   accessToken
//   //     // );
//   //     console.log(meetingLink, "generated link"); 
//   //     Object.keys(formData).forEach((key) =>
//   //       formDataToSubmit.append(key, formData[key])
//   //     );
//   //     formDataToSubmit.append("meetingLink", appointment.meetingLink);
//   //     formDataToSubmit.append("paymentId", appointment.paymentId || "");
//   //     formDataToSubmit.append("orderId", appointment.orderId || "");
//   //     formDataToSubmit.append("price", appointment.price);
//   //     if (appointment.rebookingCode) {
//   //       formDataToSubmit.append("rebookingCode", appointment.rebookingCode);
//   //       formDataToSubmit.append(
//   //         "rebookingValidFrom",
//   //         appointment.rebookingValidFrom
//   //       );
//   //       formDataToSubmit.append(
//   //         "rebookingValidUntil",
//   //         appointment.rebookingValidUntil
//   //       );
//   //     }

//   //     const response = await fetch(scriptURL, {
//   //       method: "POST",
//   //       body: formDataToSubmit,
//   //     });

//   //     if (response.ok) {
//   //       toast.success("Appointment successfully booked!");
//   //       setFormData({
//   //         firstName: "",
//   //         lastName: "",
//   //         phone: "",
//   //         email: "",
//   //         meetingType: "",
//   //         meetingContact: "",
//   //         appointmentDate: "",
//   //         appointmentTime: "",
//   //         couponCode: "",
//   //       });
//   //       setAvailableSlots([]);
//   //       setPaymentDetails(null);
//   //     } else {
//   //       throw new Error("Failed to submit to Google Sheet");
//   //     }
//   //   } catch (error) {
//   //     toast.error("Error processing submission");
//   //     console.error("Submission error:", error);
//   //   } finally {
//   //     setIsLoading(false);
//   //   }
//   // };

//   const handleFormSubmission = async (paymentResponse = {}) => {
//     setIsLoading(true);
//     try {
//       console.log("Starting form submission with paymentResponse:", paymentResponse);
//       const accessToken = tokenManager.accessToken || (await refreshAccessToken());
//       console.log("Access token retrieved:", accessToken);
  
//       const meetingLink = await generateMeetingLink(
//         formData.meetingType,
//         formData.meetingContact,
//         formData.appointmentDate,
//         formData.appointmentTime,
//         accessToken
//       );
//       console.log("Generated meeting link:", meetingLink);
  
//       if (meetingLink && meetingLink !== "Error generating Google Meet link!") {
//         toast.success("Meeting link sent successfully!");
  
//         const scriptURL =
//           "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
//         const formDataToSubmit = new FormData();
//         Object.keys(formData).forEach((key) =>
//           formDataToSubmit.append(key, formData[key])
//         );
//         formDataToSubmit.append("meetingLink", meetingLink);
//         formDataToSubmit.append("paymentId", paymentResponse.paymentId || "");
//         formDataToSubmit.append("orderId", paymentResponse.orderId || "");
//         if (paymentDetails) {
//           formDataToSubmit.append("amount", paymentDetails.amount || "");
//           formDataToSubmit.append("amountInINR", paymentDetails.amountInINR || "");
//           formDataToSubmit.append("currency", paymentDetails.currency || "");
//           formDataToSubmit.append("paymentStatus", "success");
//         }
//         if (paymentResponse.rebookingCode) {
//           formDataToSubmit.append("rebookingCode", paymentResponse.rebookingCode);
//           formDataToSubmit.append("rebookingValidFrom", paymentResponse.rebookingValidFrom);
//           formDataToSubmit.append("rebookingValidUntil", paymentResponse.rebookingValidUntil);
//         }
//         formDataToSubmit.append("price", paymentResponse.price || paymentDetails.price || "");
  
//         console.log("Submitting to Google Sheet with data:", Object.fromEntries(formDataToSubmit));
  
//         const response = await fetch(scriptURL, {
//           method: "POST",
//           body: formDataToSubmit,
//         });
//         console.log("Google Sheet response status:", response.status, response.ok);
  
//         console.log("Payment Details after success:", {
//           storedPaymentDetails: paymentDetails,
//           razorpayResponse: paymentResponse,
//         });
  
//         if (response.ok) {
//           toast.success("Appointment successfully booked!");
//           setFormData({
//             firstName: "",
//             lastName: "",
//             phone: "",
//             email: "",
//             meetingType: "",
//             meetingContact: "",
//             appointmentDate: "",
//             appointmentTime: "",
//             couponCode: "",
//           });
//           setAvailableSlots([]);
//           setPaymentDetails(null);
//         } else {
//           throw new Error("Failed to submit to Google Sheet");
//         }
//       } else {
//         throw new Error("Invalid or no meeting link generated");
//       }
//     } catch (error) {
//       toast.error("Error processing submission");
//       console.error("Submission error:", error);
//     } finally {
//       setIsLoading(false);
//     }
//   };


//   const handleBookAppointment = (e) => {
//     e.preventDefault();
//     initiatePayment();
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handlePhoneChange = (value) => {
//     setFormData((prev) => ({ ...prev, phone: value }));
//   };

//   const handleDateChange = async (e) => {
//     const selectedDate = e.target.value;
//     setFormData({ ...formData, appointmentDate: selectedDate });
//     await fetchSlots(selectedDate);
//   };

//   return (
//     <div className="w-fit p-6 bg-white shadow-xl rounded-xl">
//       <h1 className="text-xl md:text-3xl font-bold text-[#011632] mb-8 text-center">
//         Book Your Appointment
//       </h1>
//       <form onSubmit={handleBookAppointment} className="space-y-6">
//         <div className="flex gap-4">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               First Name
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="firstName"
//                 placeholder="First Name"
//                 value={formData.firstName}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Last Name{" "}
//               <span className="text-gray-400 italic text-xs">(optional)</span>
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="lastName"
//                 placeholder="Last Name"
//                 value={formData.lastName}
//                 onChange={handleChange}
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Phone Number
//           </label>
//           <PhoneInput
//             country={"in"}
//             value={formData.phone}
//             onChange={handlePhoneChange}
//             inputProps={{ name: "phone", required: true }}
//             containerStyle={{ width: "100%" }}
//             inputStyle={{
//               width: "100%",
//               padding: "25px",
//               paddingLeft: "45px",
//               borderRadius: "8px",
//               border: "1px solid #ccc",
//             }}
//           />
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Email ID
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Mail className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="email"
//               name="email"
//               placeholder="Email ID"
//               value={formData.email}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Preferred Meeting Type
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MessageSquare className="w-5 h-5 text-gray-400 ml-3" />
//             <select
//               name="meetingType"
//               value={formData.meetingType}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//             >
//               <option value="">Select Meeting Type</option>
//               <option value="Google Meet">Google Meet</option>
//             </select>
//           </div>
//         </div>

//         {formData.meetingType && (
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Email Address For Meet Link
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Mail className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="email"
//                 name="meetingContact"
//                 value={formData.meetingContact}
//                 placeholder="Email ID for Meet Link"
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         )}

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Appointment Date
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Calendar className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="date"
//                 name="appointmentDate"
//                 value={formData.appointmentDate}
//                 onChange={handleDateChange}
//                 required
//                 min={new Date().toISOString().split("T")[0]}
//                 max={
//                   new Date(new Date().setMonth(new Date().getMonth() + 5))
//                     .toISOString()
//                     .split("T")[0]
//                 }
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Available Slots
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Clock className="w-5 h-5 text-gray-400 ml-3" />
//               <select
//                 name="appointmentTime"
//                 value={formData.appointmentTime}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//               >
//                 <option value="">Select a slot</option>
//                 {availableSlots.length > 0 ? (
//                   availableSlots.map((slot, index) => (
//                     <option key={index} value={slot}>
//                       {slot}
//                     </option>
//                   ))
//                 ) : (
//                   <option>No slots available</option>
//                 )}
//               </select>
//             </div>
//           </div>
//         </div>

//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Coupon Code (Optional)
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <input
//               type="text"
//               name="couponCode"
//               placeholder="Enter coupon or re-booking code"
//               value={formData.couponCode}
//               onChange={handleChange}
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         <button
//           type="submit"
//           className="w-full bg-[#1376F8] text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
//           disabled={isLoading}
//         >
//           {isLoading ? "Processing..." : "Book Appointment"}
//         </button>
//       </form>

//       {/* {showPaymentModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
//             <h2 className="text-xl font-bold text-orange-800 mb-4">
//               Complete Payment
//             </h2>
//             <p className="text-gray-700">
//               Amount: ₹{paymentDetails?.amountInINR || "Calculating..."}
//             </p>
//             <p className="text-gray-700">
//               Time Remaining: {Math.floor(timer / 60)}:
//               {timer % 60 < 10 ? "0" : ""}
//               {timer % 60}
//             </p>
//             {timer <= 0 && (
//               <button
//                 onClick={() => {
//                   setShowPaymentModal(false);
//                   setTimer(300);
//                 }}
//                 className="mt-4 w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
//               >
//                 Reload Payment
//               </button>
//             )}
//           </div>
//         </div>
//       )} */}

//       <ToastContainer position="top-right" autoClose={5001} />
//     </div>
//   );
// };

// export default DoctorForm;

// FIXME: update form with coupons and dynamic payment details and dates with slots

// import React, { useState, useEffect } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import axiosInstance from "../api/axiosInstance";
// import { generateMeetingLink } from "./generateMeetingLink ";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   User,
//   Phone,
//   Mail,
//   Calendar,
//   Clock,
//   MessageSquare,
// } from "lucide-react";

// import PhoneInput from "react-phone-input-2";
// import "react-phone-input-2/lib/style.css";

// const {
//   VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
//   VITE_GOOGLE_CLIENT_ID: clientId,
//   VITE_GOOGLE_CLIENT_SECRET: clientSecret,
// } = import.meta.env;

// const DoctorForm = () => {
//   const [formData, setFormData] = useState({
//     firstName: "",
//     lastName: "",
//     phone: "",
//     email: "",
//     meetingType: "",
//     meetingContact: "",
//     appointmentDate: "",
//     appointmentTime: "",
//   });

//   const [availableSlots, setAvailableSlots] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [timer, setTimer] = useState(300);

//   const [tokenManager, setTokenManager] = useState({
//     accessToken: "",
//     refreshToken: initialRefreshToken,
//     clientId,
//     clientSecret,
//     tokenExpiry: null,
//   });

//   useEffect(() => {
//     const storedToken = localStorage.getItem("accessToken");
//     const storedExpiry = localStorage.getItem("tokenExpiry");
//     if (storedToken && storedExpiry) {
//       setTokenManager((prev) => ({
//         ...prev,
//         accessToken: storedToken,
//         tokenExpiry: parseInt(storedExpiry, 10),
//       }));
//     }
//   }, []);

//   useEffect(() => {
//     let interval;
//     if (showPaymentModal && timer > 0) {
//       interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [showPaymentModal, timer]);

//   const initiatePayment = async () => {
//     try {
//       const response = await axiosInstance.post("/create-order", {
//         name: `${formData.firstName} ${formData.lastName}`.trim(),
//         email: formData.email,
//         phone: formData.phone,
//         slot: formData.appointmentTime,
//       });

//       setPaymentDetails(response.data); // Set payment details here

//       const options = {
//         key: response.data.key,
//         amount: response.data.amount,
//         currency: "INR",
//         name: "Doctor Consultation",
//         description: "Appointment Booking",
//         order_id: response.data.orderId,
//         handler: async function (response) {
//           try {
//             const verifyResponse = await axiosInstance.post("/verify-payment", {
//               razorpay_order_id: response.razorpay_order_id,
//               razorpay_payment_id: response.razorpay_payment_id,
//               razorpay_signature: response.razorpay_signature,
//             });

//             if (verifyResponse.data.status === "success") {
//               await handleFormSubmission({
//                 paymentId: response.razorpay_payment_id,
//                 orderId: response.razorpay_order_id,
//               });
//               setShowPaymentModal(false);
//               toast.success("Payment successful!");
//             } else {
//               toast.error("Payment verification failed");
//             }
//           } catch (error) {
//             toast.error("Error verifying payment");
//           }
//         },
//         prefill: {
//           name: `${formData.firstName} ${formData.lastName}`.trim(),
//           email: formData.email,
//           contact: formData.phone,
//         },
//         theme: { color: "#f97316" },
//         modal: {
//           ondismiss: () => {
//             setShowPaymentModal(false);
//             setTimer(300);
//             // Don’t reset paymentDetails here; do it after submission
//           },
//         },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.open();

//       setShowPaymentModal(true);
//     } catch (error) {
//       toast.error(`Error initiating payment: ${error.message}`);
//     }
//   };

  // const handleFormSubmission = async (paymentResponse = {}) => {
  //   setIsLoading(true);
  //   try {
  //     const accessToken =
  //       tokenManager.accessToken || (await refreshAccessToken());
  //     const meetingLink = await generateMeetingLink(
  //       formData.meetingType,
  //       formData.meetingContact,
  //       formData.appointmentDate,
  //       formData.appointmentTime,
  //       accessToken
  //     );

  //     if (meetingLink && meetingLink !== "Error generating Google Meet link!") {
  //       toast.success("Meeting link sent successfully!");

  //       const scriptURL =
  //         "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
  //       const formDataToSubmit = new FormData();
  //       Object.keys(formData).forEach((key) =>
  //         formDataToSubmit.append(key, formData[key])
  //       );
  //       formDataToSubmit.append("meetingLink", meetingLink);
  //       formDataToSubmit.append("paymentId", paymentResponse.paymentId || "");
  //       formDataToSubmit.append("orderId", paymentResponse.orderId || "");
  //       // Add payment details to the sheet
  //       if (paymentDetails) {
  //         formDataToSubmit.append("amount", paymentDetails.amount || "");
  //         formDataToSubmit.append(
  //           "amountInINR",
  //           paymentDetails.amountInINR || ""
  //         );
  //         formDataToSubmit.append("currency", paymentDetails.currency || "");
  //         formDataToSubmit.append("paymentStatus", "success");
  //       }

  //       const response = await fetch(scriptURL, {
  //         method: "POST",
  //         body: formDataToSubmit,
  //       });

  //       // Log payment details before resetting
  //       console.log("Payment Details after success:", {
  //         storedPaymentDetails: paymentDetails,
  //         razorpayResponse: paymentResponse,
  //       });

  //       if (response.ok) {
  //         toast.success("Appointment successfully booked!");
  //         setFormData({
  //           firstName: "",
  //           lastName: "",
  //           phone: "",
  //           email: "",
  //           meetingType: "",
  //           meetingContact: "",
  //           appointmentDate: "",
  //           appointmentTime: "",
  //         });
  //         setAvailableSlots([]);
  //         setPaymentDetails(null); // Reset only after logging and submission
  //       } else {
  //         throw new Error("Failed to submit to Google Sheet");
  //       }
  //     }
  //   } catch (error) {
  //     toast.error("Error processing submission");
  //     console.error("Submission error:", error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

//   const handleBookAppointment = (e) => {
//     e.preventDefault();
//     initiatePayment();
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   // phone
//   const handlePhoneChange = (value) => {
//     setFormData((prev) => ({
//       ...prev,
//       phone: value, // Update only phone number
//     }));
//   };

  // const refreshAccessToken = async () => {
  //   try {
  //     const response = await fetch("https://oauth2.googleapis.com/token", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //       body: new URLSearchParams({
  //         client_id: tokenManager.clientId,
  //         client_secret: tokenManager.clientSecret,
  //         refresh_token: tokenManager.refreshToken,
  //         grant_type: "refresh_token",
  //       }),
  //     });
  //     const data = await response.json();
  //     if (!response.ok) throw new Error("Token refresh failed");

  //     setTokenManager((prev) => {
  //       const newState = {
  //         ...prev,
  //         accessToken: data.access_token,
  //         tokenExpiry: Date.now() + data.expires_in * 1000,
  //       };
  //       localStorage.setItem("accessToken", data.access_token);
  //       localStorage.setItem("tokenExpiry", newState.tokenExpiry);
  //       return newState;
  //     });
  //     return data.access_token;
  //   } catch (error) {
  //     toast.error("Failed to refresh token");
  //     return null;
  //   }
  // };

//   const fetchBusySlots = async (selectedDate) => {
//     const accessToken = await refreshAccessToken();
//     if (!accessToken) return [];

//     const timeMin = `${selectedDate}T00:00:00Z`;
//     const timeMax = `${selectedDate}T23:59:59Z`;

//     try {
//       const response = await fetch(
//         "https://www.googleapis.com/calendar/v3/freeBusy",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             timeMin,
//             timeMax,
//             timeZone: "Asia/Kolkata",
//             items: [{ id: "primary" }],
//           }),
//         }
//       );
//       const data = await response.json();
//       return data.calendars?.primary?.busy || [];
//     } catch (error) {
//       console.error("Error fetching busy slots:", error);
//       return [];
//     }
//   };

//   const generateAvailableSlots = (busySlots, selectedDate) => {
//     const workingHours = [
//       "09:00 AM",
//       "10:00 AM",
//       "11:00 AM",
//       "12:00 PM",
//       "01:00 PM",
//       "02:00 PM",
//       "03:00 PM",
//       "04:00 PM",
//       "05:00 PM",
//     ];

//     const now = new Date();
//     const dateString = now.toISOString().split("T")[0];
//     let available = workingHours;

//     const busyTimes = busySlots.map((slot) => ({
//       start: new Date(slot.start).getHours(),
//       end: new Date(slot.end).getHours(),
//     }));

//     available = available.filter((slot) => {
//       const [hourStr, , period] = slot.split(/[: ]/);
//       let slotHour = parseInt(hourStr, 10);
//       if (period === "PM" && slotHour !== 12) slotHour += 12;
//       if (period === "AM" && slotHour === 12) slotHour = 0;
//       return !busyTimes.some(
//         (busy) => slotHour >= busy.start && slotHour < busy.end
//       );
//     });

//     if (dateString === selectedDate) {
//       const CheckTime = now.getHours();
//       const nextSlotIndex = available.findIndex((slot) => {
//         const [hourStr, , period] = slot.split(/[: ]/);
//         let slotHour = parseInt(hourStr, 10);
//         if (period === "PM" && slotHour !== 12) slotHour += 12;
//         if (period === "AM" && slotHour === 12) slotHour = 0;
//         return slotHour > CheckTime;
//       });
//       setAvailableSlots(
//         nextSlotIndex !== -1 ? available.slice(nextSlotIndex) : []
//       );
//     } else {
//       setAvailableSlots(available);
//     }
//   };

//   const handleDateChange = async (e) => {
//     const selectedDate = e.target.value;
//     setFormData({ ...formData, appointmentDate: selectedDate });
//     const busySlots = await fetchBusySlots(selectedDate);
//     generateAvailableSlots(busySlots, selectedDate);
//   };

//   return (
//     <div className="w-fit p-6 bg-white shadow-xl rounded-xl">
//       <h1 className="text-xl md:text-3xl font-bold text-[#011632] mb-8 text-center">
//         Book Your Appointment
//       </h1>
//       <form onSubmit={handleBookAppointment} className="space-y-6">
//         <div className="flex gap-4">
//           {/* First Name */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               First Name
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="firstName"
//                 placeholder="First Name"
//                 value={formData.firstName}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>

//           {/* Last Name */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Last Name{" "}
//               <span className="text-gray-400 italic text-xs">(optional)</span>
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="lastName"
//                 placeholder="Last Name"
//                 value={formData.lastName}
//                 onChange={handleChange}
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Phone */}
//         {/* <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Phone Number
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Phone className="w-5 h-5 text-gray-400 ml-3" />
//           <span className="ml-3 text-gray-500 font-medium">+91</span>
//             <input
//               type="tel"
//               // max={10}
//               name="phone"
//               placeholder="Phone Number"
//               value={formData.phone}
//               onChange={(e) => {
//                 const value = e.target.value;
//                 if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
//               }}
//               maxLength={10}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div> */}
//         <div className="relative">
//         <label className="block text-sm font-medium text-gray-700 mb-1">
//             Phone Number:
//           </label>
//           <PhoneInput
//             country={"in"} // Default country code
//             value={formData.phone}
//             onChange={handlePhoneChange}
//             inputProps={{
//               name: "phone",
//               required: true,
//             }}
//             containerStyle={{ width: "100%" }}
//             inputStyle={{
//               width: "100%",
//               padding: "25px",
//               paddingLeft: "45px",
//               borderRadius: "8px",
//               border: "1px solid #ccc",

//             }}
//           />

//           {/* <p className="mt-2 text-gray-600">Entered Phone: {formData.phone}</p> */}
//         </div>

//         {/* Email */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Email ID
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Mail className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="email"
//               name="email"
//               placeholder="Email ID"
//               value={formData.email}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Meeting Type */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Preferred Meeting Type
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MessageSquare className="w-5 h-5 text-gray-400 ml-3" />
//             <select
//               name="meetingType"
//               value={formData.meetingType}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//             >
//               <option value="">Select Meeting Type</option>
//               <option disabled value="WhatsApp">
//                 WhatsApp
//               </option>
//               <option value="Google Meet">Google Meet</option>
//               <option disabled value="Zoom">
//                 Zoom
//               </option>
//             </select>
//           </div>
//         </div>

//         {/* Meeting Contact */}
//         {formData.meetingType && (
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               {formData.meetingType === "WhatsApp"
//                 ? "WhatsApp Number For Meet Link"
//                 : "Email Address For Meet Link"}
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               {formData.meetingType === "WhatsApp" ? (
//                 <Phone className="w-5 h-5 text-gray-400 ml-3" />
//               ) : (
//                 <Mail className="w-5 h-5 text-gray-400 ml-3" />
//               )}
//               <input
//                 type={formData.meetingType === "WhatsApp" ? "tel" : "email"}
//                 name="meetingContact"
//                 value={formData.meetingContact}
//                 placeholder={
//                   formData.meetingType === "WhatsApp"
//                     ? "WhatsApp Number"
//                     : "Email ID for Meet Link"
//                 }
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         )}

//         {/* Date and Time */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Appointment Date
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Calendar className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="date"
//                 name="appointmentDate"
//                 value={formData.appointmentDate}
//                 onChange={handleDateChange}
//                 required
//                 min={new Date().toISOString().split("T")[0]}
//                 max={
//                   new Date(new Date().setMonth(new Date().getMonth() + 5))
//                     .toISOString()
//                     .split("T")[0]
//                 }
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Available Slots
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Clock className="w-5 h-5 text-gray-400 ml-3" />
//               <select
//                 name="appointmentTime"
//                 value={formData.appointmentTime}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//               >
//                 <option value="">Select a slot</option>
//                 {availableSlots.length > 0 ? (
//                   availableSlots.map((slot, index) => (
//                     <option key={index} value={slot}>
//                       {slot}
//                     </option>
//                   ))
//                 ) : (
//                   <option>No slots available</option>
//                 )}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Submit Button */}
//         <button
//           type="submit"
//           className="w-full bg-[#1376F8] text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
//           disabled={isLoading}
//         >
//           {isLoading ? "Processing..." : "Book Appointment"}
//         </button>
//       </form>

//       {/* Payment Modal */}
//       {/* {showPaymentModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
//             <h2 className="text-xl font-bold text-orange-800 mb-4">
//               Complete Payment
//             </h2>
//             <p className="text-gray-700">
//               Amount: ₹{paymentDetails?.amountInINR || 1000}
//             </p>
//             <p className="text-gray-700">
//               Time Remaining: {Math.floor(timer / 60)}:
//               {timer % 60 < 10 ? "0" : ""}
//               {timer % 60}
//             </p>
//             {timer <= 0 && (
//               <button
//                 onClick={() => {
//                   setShowPaymentModal(false);
//                   setTimer(300);
//                   // Keep paymentDetails intact until submission
//                 }}
//                 className="mt-4 w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
//               >
//                 Reload Payment
//               </button>
//             )}
//           </div>
//         </div>
//       )} */}

//       <ToastContainer position="top-right" autoClose={5001} />
//     </div>
//   );
// };

// export default DoctorForm;

// TODO: update exvel with payment details

// import React, { useState, useEffect } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import axiosInstance from "../api/axiosInstance";
// import { generateMeetingLink } from "./generateMeetingLink ";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   User,
//   Phone,
//   Mail,
//   Calendar,
//   Clock,
//   MessageSquare,
// } from "lucide-react";

// const {
//   VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
//   VITE_GOOGLE_CLIENT_ID: clientId,
//   VITE_GOOGLE_CLIENT_SECRET: clientSecret,
// } = import.meta.env;

// const DoctorForm = () => {
//   const [formData, setFormData] = useState({
//     firstName: "",
//     lastName: "",
//     phone: "",
//     email: "",
//     meetingType: "",
//     meetingContact: "",
//     appointmentDate: "",
//     appointmentTime: "",

//   });

//   const [availableSlots, setAvailableSlots] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [timer, setTimer] = useState(300);
//   // const [qrCode, setQrCode] = useState(null); // Commented out for now

//   const [tokenManager, setTokenManager] = useState({
//     accessToken: "",
//     refreshToken: initialRefreshToken,
//     clientId,
//     clientSecret,
//     tokenExpiry: null,
//   });

//   useEffect(() => {
//     const storedToken = localStorage.getItem("accessToken");
//     const storedExpiry = localStorage.getItem("tokenExpiry");
//     if (storedToken && storedExpiry) {
//       setTokenManager((prev) => ({
//         ...prev,
//         accessToken: storedToken,
//         tokenExpiry: parseInt(storedExpiry, 10),
//       }));
//     }
//   }, []);

//   useEffect(() => {
//     let interval;
//     if (showPaymentModal && timer > 0) {
//       interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [showPaymentModal, timer]);

//   const initiatePayment = async () => {
//     try {
//       const response = await axiosInstance.post("/create-order", {
//         name: `${formData.firstName} ${formData.lastName}`.trim(),
//         email: formData.email,
//         phone: formData.phone,
//         slot: formData.appointmentTime,
//       });

//       setPaymentDetails(response.data);

//       const options = {
//         key: response.data.key,
//         amount: response.data.amount, // Still in paise for Razorpay
//         currency: "INR",
//         name: "Doctor Consultation",
//         description: "Appointment Booking",
//         order_id: response.data.orderId,
//         handler: async function (response) {
//           try {
//             const verifyResponse = await axiosInstance.post("/verify-payment", {
//               razorpay_order_id: response.razorpay_order_id,
//               razorpay_payment_id: response.razorpay_payment_id,
//               razorpay_signature: response.razorpay_signature,
//             });

//             if (verifyResponse.data.status === "success") {
//               await handleFormSubmission({
//                 paymentId: response.razorpay_payment_id,
//                 orderId: response.razorpay_order_id,
//               });
//               setShowPaymentModal(false);
//               toast.success("Payment successful!");
//             } else {
//               toast.error("Payment verification failed");
//             }
//           } catch (error) {
//             toast.error("Error verifying payment");
//           }
//         },
//         prefill: {
//           name: `${formData.firstName} ${formData.lastName}`.trim(),
//           email: formData.email,
//           contact: formData.phone,
//         },
//         theme: { color: "#f97316" },
//         modal: {
//           ondismiss: () => {
//             setShowPaymentModal(false);
//             setTimer(300);
//           },
//         },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.open();

//       setShowPaymentModal(true);
//     } catch (error) {
//       toast.error(`Error initiating payment: ${error.message}`);
//     }
//   };

//   const handleFormSubmission = async (paymentResponse = {}) => {
//     setIsLoading(true);
//     try {
//       const accessToken =
//         tokenManager.accessToken || (await refreshAccessToken());
//       const meetingLink = await generateMeetingLink(
//         formData.meetingType,
//         formData.meetingContact,
//         formData.appointmentDate,
//         formData.appointmentTime,
//         accessToken
//       );

//       if (meetingLink && meetingLink !== "Error generating Google Meet link!") {
//         toast.success("Meeting link sent successfully!");

//         const scriptURL =
//           "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
//         const formDataToSubmit = new FormData();
//         Object.keys(formData).forEach((key) =>
//           formDataToSubmit.append(key, formData[key])
//         );
//         formDataToSubmit.append("meetingLink", meetingLink);
//         formDataToSubmit.append("paymentId", paymentResponse.paymentId || "");
//         formDataToSubmit.append("orderId", paymentResponse.orderId || "");

//         const response = await fetch(scriptURL, {
//           method: "POST",
//           body: formDataToSubmit,
//         });

//         // Log payment details before resetting
//         console.log("Payment Details after success:", {
//           storedPaymentDetails: paymentDetails,
//           razorpayResponse: paymentResponse,
//         });

//         if (response.ok) {
//           toast.success("Appointment successfully booked!");
//           setFormData({
//             firstName: "",
//             lastName: "",
//             phone: "",
//             email: "",
//             meetingType: "",
//             meetingContact: "",
//             appointmentDate: "",
//             appointmentTime: "",
//           });
//           setAvailableSlots([]);
//           setPaymentDetails(null); // Reset after logging
//         }
//       }
//     } catch (error) {
//       toast.error("Error processing submission");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // const initiatePayment = async () => {
//   //   try {
//   //     const response = await axiosInstance.post("/create-order", {
//   //       name: `${formData.firstName} ${formData.lastName}`.trim(),
//   //       email: formData.email,
//   //       phone: formData.phone,
//   //       slot: formData.appointmentTime,
//   //     });

//   //     setPaymentDetails(response.data);

//   //     const options = {
//   //       key: response.data.key,
//   //       amount: response.data.amount,
//   //       currency: "INR",
//   //       name: "Doctor Consultation",
//   //       description: "Appointment Booking",
//   //       order_id: response.data.orderId,
//   //       handler: async function (response) {
//   //         try {
//   //           const verifyResponse = await axiosInstance.post("/verify-payment", {
//   //             razorpay_order_id: response.razorpay_order_id,
//   //             razorpay_payment_id: response.razorpay_payment_id,
//   //             razorpay_signature: response.razorpay_signature,
//   //           });

//   //           if (verifyResponse.data.status === "success") {
//   //             // Pass payment response to handleFormSubmission
//   //             await handleFormSubmission({
//   //               paymentId: response.razorpay_payment_id,
//   //               orderId: response.razorpay_order_id,
//   //             });
//   //             setShowPaymentModal(false);
//   //             toast.success("Payment successful!");
//   //           } else {
//   //             toast.error("Payment verification failed");
//   //           }
//   //         } catch (error) {
//   //           toast.error("Error verifying payment");
//   //         }
//   //       },
//   //       prefill: {
//   //         name: `${formData.firstName} ${formData.lastName}`.trim(),
//   //         email: formData.email,
//   //         contact: formData.phone,
//   //       },
//   //       theme: { color: "#f97316" },
//   //       modal: {
//   //         ondismiss: () => {
//   //           setShowPaymentModal(false);
//   //           setTimer(300);
//   //           // setQrCode(null); // Commented out
//   //         },
//   //       },
//   //     };

//   //     const rzp = new window.Razorpay(options);
//   //     rzp.open();

//   //     // Commented out QR code generation for now
//   //     // const qrData = `Pay ₹1000 for appointment - Order ID: ${response.data.orderId}`;
//   //     // setQrCode(
//   //     //   `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`
//   //     // );
//   //     setShowPaymentModal(true);
//   //   } catch (error) {
//   //     toast.error(`Error initiating payment: ${error.message}`);
//   //   }
//   // };

//   // const handleFormSubmission = async (paymentResponse = {}) => {
//   //   setIsLoading(true);
//   //   try {
//   //     const accessToken =
//   //       tokenManager.accessToken || (await refreshAccessToken());
//   //     const meetingLink = await generateMeetingLink(
//   //       formData.meetingType,
//   //       formData.meetingContact,
//   //       formData.appointmentDate,
//   //       formData.appointmentTime,
//   //       accessToken
//   //     );

//   //     if (meetingLink && meetingLink !== "Error generating Google Meet link!") {
//   //       toast.success("Meeting link sent successfully!");

//   //       const scriptURL =
//   //         "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec";
//   //       const formDataToSubmit = new FormData();
//   //       Object.keys(formData).forEach((key) =>
//   //         formDataToSubmit.append(key, formData[key])
//   //       );
//   //       formDataToSubmit.append("meetingLink", meetingLink);
//   //       formDataToSubmit.append("paymentId", paymentResponse.paymentId || "");
//   //       formDataToSubmit.append("orderId", paymentResponse.orderId || "");

//   //       const response = await fetch(scriptURL, {
//   //         method: "POST",
//   //         body: formDataToSubmit,
//   //       });

//   //       // Log payment details here
//   //       console.log("Payment Details after success:", {
//   //         storedPaymentDetails: paymentDetails,
//   //         razorpayResponse: paymentResponse,
//   //       });

//   //       if (response.ok) {
//   //         toast.success("Appointment successfully booked!");
//   //         setFormData({
//   //           firstName: "",
//   //           lastName: "",
//   //           phone: "",
//   //           email: "",
//   //           meetingType: "",
//   //           meetingContact: "",
//   //           appointmentDate: "",
//   //           appointmentTime: "",
//   //         });
//   //         setAvailableSlots([]);
//   //         // Only reset paymentDetails after successful submission
//   //         setPaymentDetails(null);
//   //       }
//   //     }
//   //   } catch (error) {
//   //     toast.error("Error processing submission");
//   //   } finally {
//   //     setIsLoading(false);
//   //   }
//   // };

//   const handleBookAppointment = (e) => {
//     e.preventDefault();
//     initiatePayment();
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const refreshAccessToken = async () => {
//     try {
//       const response = await fetch("https://oauth2.googleapis.com/token", {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: new URLSearchParams({
//           client_id: tokenManager.clientId,
//           client_secret: tokenManager.clientSecret,
//           refresh_token: tokenManager.refreshToken,
//           grant_type: "refresh_token",
//         }),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error("Token refresh failed");

//       setTokenManager((prev) => {
//         const newState = {
//           ...prev,
//           accessToken: data.access_token,
//           tokenExpiry: Date.now() + data.expires_in * 1000,
//         };
//         localStorage.setItem("accessToken", data.access_token);
//         localStorage.setItem("tokenExpiry", newState.tokenExpiry);
//         return newState;
//       });
//       return data.access_token;
//     } catch (error) {
//       toast.error("Failed to refresh token");
//       return null;
//     }
//   };

//   const fetchBusySlots = async (selectedDate) => {
//     const accessToken = await refreshAccessToken();
//     if (!accessToken) return [];

//     const timeMin = `${selectedDate}T00:00:00Z`;
//     const timeMax = `${selectedDate}T23:59:59Z`;

//     try {
//       const response = await fetch(
//         "https://www.googleapis.com/calendar/v3/freeBusy",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             timeMin,
//             timeMax,
//             timeZone: "Asia/Kolkata",
//             items: [{ id: "primary" }],
//           }),
//         }
//       );
//       const data = await response.json();
//       return data.calendars?.primary?.busy || [];
//     } catch (error) {
//       console.error("Error fetching busy slots:", error);
//       return [];
//     }
//   };

//   const generateAvailableSlots = (busySlots, selectedDate) => {
//     const workingHours = [
//       "09:00 AM",
//       "10:00 AM",
//       "11:00 AM",
//       "12:00 PM",
//       "01:00 PM",
//       "02:00 PM",
//       "03:00 PM",
//       "04:00 PM",
//       "05:00 PM",
//     ];

//     const now = new Date();
//     const dateString = now.toISOString().split("T")[0];
//     let available = workingHours;

//     const busyTimes = busySlots.map((slot) => ({
//       start: new Date(slot.start).getHours(),
//       end: new Date(slot.end).getHours(),
//     }));

//     available = available.filter((slot) => {
//       const [hourStr, , period] = slot.split(/[: ]/);
//       let slotHour = parseInt(hourStr, 10);
//       if (period === "PM" && slotHour !== 12) slotHour += 12;
//       if (period === "AM" && slotHour === 12) slotHour = 0;
//       return !busyTimes.some(
//         (busy) => slotHour >= busy.start && slotHour < busy.end
//       );
//     });

//     if (dateString === selectedDate) {
//       const CheckTime = now.getHours();
//       const nextSlotIndex = available.findIndex((slot) => {
//         const [hourStr, , period] = slot.split(/[: ]/);
//         let slotHour = parseInt(hourStr, 10);
//         if (period === "PM" && slotHour !== 12) slotHour += 12;
//         if (period === "AM" && slotHour === 12) slotHour = 0;
//         return slotHour > CheckTime;
//       });
//       setAvailableSlots(
//         nextSlotIndex !== -1 ? available.slice(nextSlotIndex) : []
//       );
//     } else {
//       setAvailableSlots(available);
//     }
//   };

//   const handleDateChange = async (e) => {
//     const selectedDate = e.target.value;
//     setFormData({ ...formData, appointmentDate: selectedDate });
//     const busySlots = await fetchBusySlots(selectedDate);
//     generateAvailableSlots(busySlots, selectedDate);
//   };

//   return (
//     <div className="w-fit p-6 bg-white shadow-xl rounded-xl">
//       <h1 className="text-xl md:text-3xl font-bold text-[#011632] mb-8 text-center">
//         Book Your Appointment
//       </h1>
//       <form onSubmit={handleBookAppointment} className="space-y-6">
//         <div className="flex gap-4">
//           {/* First Name */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               First Name
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="firstName"
//                 placeholder="First Name"
//                 value={formData.firstName}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>

//           {/* Last Name */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Last Name{" "}
//               <span className="text-gray-400 italic text-xs">(optional)</span>
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="lastName"
//                 placeholder="Last Name"
//                 value={formData.lastName}
//                 onChange={handleChange}
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Phone */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Phone Number
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Phone className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="tel"
//               name="phone"
//               placeholder="Phone Number"
//               value={formData.phone}
//               onChange={(e) => {
//                 const value = e.target.value;
//                 if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
//               }}
//               maxLength={10}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Email */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Email ID
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Mail className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="email"
//               name="email"
//               placeholder="Email ID"
//               value={formData.email}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Meeting Type */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Preferred Meeting Type
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MessageSquare className="w-5 h-5 text-gray-400 ml-3" />
//             <select
//               name="meetingType"
//               value={formData.meetingType}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//             >
//               <option value="">Select Meeting Type</option>
//               <option disabled value="WhatsApp">
//                 WhatsApp
//               </option>
//               <option value="Google Meet">Google Meet</option>
//               <option disabled value="Zoom">
//                 Zoom
//               </option>
//             </select>
//           </div>
//         </div>

//         {/* Meeting Contact */}
//         {formData.meetingType && (
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               {formData.meetingType === "WhatsApp"
//                 ? "WhatsApp Number For Meet Link"
//                 : "Email Address For Meet Link"}
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               {formData.meetingType === "WhatsApp" ? (
//                 <Phone className="w-5 h-5 text-gray-400 ml-3" />
//               ) : (
//                 <Mail className="w-5 h-5 text-gray-400 ml-3" />
//               )}
//               <input
//                 type={formData.meetingType === "WhatsApp" ? "tel" : "email"}
//                 name="meetingContact"
//                 value={formData.meetingContact}
//                 placeholder={
//                   formData.meetingType === "WhatsApp"
//                     ? "WhatsApp Number"
//                     : "Email ID for Meet Link"
//                 }
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         )}

//         {/* Date and Time */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Appointment Date
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Calendar className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="date"
//                 name="appointmentDate"
//                 value={formData.appointmentDate}
//                 onChange={handleDateChange}
//                 required
//                 min={new Date().toISOString().split("T")[0]}
//                 max={
//                   new Date(new Date().setMonth(new Date().getMonth() + 5))
//                     .toISOString()
//                     .split("T")[0]
//                 }
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Available Slots
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Clock className="w-5 h-5 text-gray-400 ml-3" />
//               <select
//                 name="appointmentTime"
//                 value={formData.appointmentTime}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//               >
//                 <option value="">Select a slot</option>
//                 {availableSlots.length > 0 ? (
//                   availableSlots.map((slot, index) => (
//                     <option key={index} value={slot}>
//                       {slot}
//                     </option>
//                   ))
//                 ) : (
//                   <option>No slots available</option>
//                 )}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Submit Button */}
//         <button
//           type="submit"
//           className="w-full bg-[#1376F8] text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
//           disabled={isLoading}
//         >
//           {isLoading ? "Processing..." : "Book Appointment"}
//         </button>
//       </form>

//       {/* Payment Modal */}
//       {showPaymentModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
//             <h2 className="text-xl font-bold text-orange-800 mb-4">
//               Complete Payment
//             </h2>
//             <p className="text-gray-700">
//               Amount: ₹{paymentDetails?.amountInINR || 1000}
//             </p>
//             <p className="text-gray-700">
//               Time Remaining: {Math.floor(timer / 60)}:
//               {timer % 60 < 10 ? "0" : ""}
//               {timer % 60}
//             </p>
//             {timer <= 0 && (
//               <button
//                 onClick={() => {
//                   setShowPaymentModal(false);
//                   setTimer(300);
//                   setPaymentDetails(null);
//                 }}
//                 className="mt-4 w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
//               >
//                 Reload Payment
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//       {/* {showPaymentModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
//             <h2 className="text-xl font-bold text-orange-800 mb-4">
//               Complete Payment
//             </h2>
//             <p className="text-gray-700">Amount: ₹1000</p>
//             <p className="text-gray-700">
//               Time Remaining: {Math.floor(timer / 60)}:
//               {timer % 60 < 10 ? "0" : ""}
//               {timer % 60}
//             </p>
//             {qrCode && (
//               <div className="my-4">
//                 <img
//                   src={qrCode}
//                   alt="Payment QR Code"
//                   className="mx-auto w-32 h-32"
//                 />
//                 <p className="text-center text-sm text-gray-600">Scan to Pay</p>
//               </div>
//             )}
//             {timer <= 0 && (
//               <button
//                 onClick={() => {
//                   setShowPaymentModal(false);
//                   setTimer(300);
//                   // setQrCode(null);
//                   setPaymentDetails(null);
//                 }}
//                 className="mt-4 w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
//               >
//                 Reload Payment
//               </button>
//             )}
//           </div>
//         </div>
//       )} */}

//       <ToastContainer position="top-right" autoClose={5001} />
//     </div>
//   );
// };

// export default DoctorForm;

// FIXME: try to add payment detials of each booked appointment in excel sheet

// import React, { useState, useEffect } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import axiosInstance from "../api/axiosInstance";
// import { generateMeetingLink } from "./generateMeetingLink ";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   User,
//   Phone,
//   Mail,
//   Calendar,
//   Clock,
//   MessageSquare,
// } from "lucide-react";

// const {
//   VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
//   VITE_GOOGLE_CLIENT_ID: clientId,
//   VITE_GOOGLE_CLIENT_SECRET: clientSecret,
// } = import.meta.env;

// const DoctorForm = () => {
//   const [formData, setFormData] = useState({
//     firstName: "",
//     lastName: "",
//     phone: "",
//     email: "",
//     meetingType: "",
//     meetingContact: "",
//     appointmentDate: "",
//     appointmentTime: "",
//   });

//   const [availableSlots, setAvailableSlots] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [timer, setTimer] = useState(300);
//   const [qrCode, setQrCode] = useState(null);

//   const [tokenManager, setTokenManager] = useState({
//     accessToken: "",
//     refreshToken: initialRefreshToken,
//     clientId,
//     clientSecret,
//     tokenExpiry: null,
//   });

//   useEffect(() => {
//     const storedToken = localStorage.getItem("accessToken");
//     const storedExpiry = localStorage.getItem("tokenExpiry");
//     if (storedToken && storedExpiry) {
//       setTokenManager((prev) => ({
//         ...prev,
//         accessToken: storedToken,
//         tokenExpiry: parseInt(storedExpiry, 10),
//       }));
//     }
//   }, []);

//   useEffect(() => {
//     let interval;
//     if (showPaymentModal && timer > 0) {
//       interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
//     }
//     return () => clearInterval(interval);
//   }, [showPaymentModal, timer]);

//   const initiatePayment = async () => {
//     try {
//       const response = await axiosInstance.post("/create-order", {
//         name: `${formData.firstName} ${formData.lastName}`.trim(),
//         email: formData.email,
//         phone: formData.phone,
//         slot: formData.appointmentTime,
//       });

//       setPaymentDetails(response.data);

//       const options = {
//         key: response.data.key,
//         amount: response.data.amount,
//         currency: "INR",
//         name: "Doctor Consultation",
//         description: "Appointment Booking",
//         order_id: response.data.orderId,
//         handler: async function (response) {
//           try {
//             const verifyResponse = await axiosInstance.post("/verify-payment", {
//               razorpay_order_id: response.razorpay_order_id,
//               razorpay_payment_id: response.razorpay_payment_id,
//               razorpay_signature: response.razorpay_signature,
//             });

//             if (verifyResponse.data.status === "success") {
//               await handleFormSubmission();
//               setShowPaymentModal(false);
//               toast.success("Payment successful!");
//             } else {
//               toast.error("Payment verification failed");
//             }
//           } catch (error) {
//             toast.error("Error verifying payment");
//           }
//         },
//         prefill: {
//           name: `${formData.firstName} ${formData.lastName}`.trim(),
//           email: formData.email,
//           contact: formData.phone,
//         },
//         theme: { color: "#f97316" },
//         modal: {
//           ondismiss: () => {
//             setShowPaymentModal(false);
//             setTimer(300);
//             setQrCode(null);
//           },
//         },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.open();

//       const qrData = `Pay ₹1000 for appointment - Order ID: ${response.data.orderId}`;
//       setQrCode(
//         `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
//           qrData
//         )}`
//       );
//       setShowPaymentModal(true);
//     } catch (error) {
//       toast.error(`Error initiating payment: ${error.message}`);
//     }
//   };

//   const handleFormSubmission = async () => {
//     setIsLoading(true);
//     try {
//       const accessToken =
//         tokenManager.accessToken || (await refreshAccessToken());
//       const meetingLink = await generateMeetingLink(
//         formData.meetingType,
//         formData.meetingContact, // Changed to meetingContact to match dynamic input
//         formData.appointmentDate,
//         formData.appointmentTime,
//         accessToken
//       );

//       if (meetingLink && meetingLink !== "Error generating Google Meet link!") {
//         toast.success("Meeting link sent successfully!");

//         const scriptURL = "https://script.google.com/macros/s/AKfycbzdRH5xhnEylRsMQD6gu3gFfN03SIrj272Hu6vsR1MOOd2XCP0KkgomNccJKq7VNe2-HA/exec"; // Update with your new Google Apps Script URL
//         const formDataToSubmit = new FormData();
//         Object.keys(formData).forEach((key) =>
//           formDataToSubmit.append(key, formData[key])
//         );
//         formDataToSubmit.append("meetingLink", meetingLink);

//         const response = await fetch(scriptURL, {
//           method: "POST",
//           body: formDataToSubmit,
//         });
//         console.log(paymentDetails,"paymentDetails")

//         if (response.ok) {
//           toast.success("Appointment successfully booked!");
//           setFormData({
//             firstName: "",
//             lastName: "",
//             phone: "",
//             email: "",
//             meetingType: "",
//             meetingContact: "",
//             appointmentDate: "",
//             appointmentTime: "",
//           });
//           setAvailableSlots([]);
//         }
//       }
//     } catch (error) {
//       toast.error("Error processing submission");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleBookAppointment = (e) => {
//     e.preventDefault();
//     initiatePayment();
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const refreshAccessToken = async () => {
//     try {
//       const response = await fetch("https://oauth2.googleapis.com/token", {
//         method: "POST",
//         headers: { "Content-Type": "application/x-www-form-urlencoded" },
//         body: new URLSearchParams({
//           client_id: tokenManager.clientId,
//           client_secret: tokenManager.clientSecret,
//           refresh_token: tokenManager.refreshToken,
//           grant_type: "refresh_token",
//         }),
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error("Token refresh failed");

//       setTokenManager((prev) => {
//         const newState = {
//           ...prev,
//           accessToken: data.access_token,
//           tokenExpiry: Date.now() + data.expires_in * 1000,
//         };
//         localStorage.setItem("accessToken", data.access_token);
//         localStorage.setItem("tokenExpiry", newState.tokenExpiry);
//         return newState;
//       });
//       return data.access_token;
//     } catch (error) {
//       toast.error("Failed to refresh token");
//       return null;
//     }
//   };

//   const fetchBusySlots = async (selectedDate) => {
//     const accessToken = await refreshAccessToken();
//     if (!accessToken) return [];

//     const timeMin = `${selectedDate}T00:00:00Z`;
//     const timeMax = `${selectedDate}T23:59:59Z`;

//     try {
//       const response = await fetch(
//         "https://www.googleapis.com/calendar/v3/freeBusy",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             timeMin,
//             timeMax,
//             timeZone: "Asia/Kolkata",
//             items: [{ id: "primary" }],
//           }),
//         }
//       );
//       const data = await response.json();
//       return data.calendars?.primary?.busy || [];
//     } catch (error) {
//       console.error("Error fetching busy slots:", error);
//       return [];
//     }
//   };

//   const generateAvailableSlots = (busySlots, selectedDate) => {
//     const workingHours = [
//       "09:00 AM",
//       "10:00 AM",
//       "11:00 AM",
//       "12:00 PM",
//       "01:00 PM",
//       "02:00 PM",
//       "03:00 PM",
//       "04:00 PM",
//       "05:00 PM",
//     ];

//     const now = new Date();
//     const dateString = now.toISOString().split("T")[0];
//     let available = workingHours;

//     const busyTimes = busySlots.map((slot) => ({
//       start: new Date(slot.start).getHours(),
//       end: new Date(slot.end).getHours(),
//     }));

//     available = available.filter((slot) => {
//       const [hourStr, , period] = slot.split(/[: ]/);
//       let slotHour = parseInt(hourStr, 10);
//       if (period === "PM" && slotHour !== 12) slotHour += 12;
//       if (period === "AM" && slotHour === 12) slotHour = 0;
//       return !busyTimes.some(
//         (busy) => slotHour >= busy.start && slotHour < busy.end
//       );
//     });

//     if (dateString === selectedDate) {
//       const CheckTime = now.getHours();
//       const nextSlotIndex = available.findIndex((slot) => {
//         const [hourStr, , period] = slot.split(/[: ]/);
//         let slotHour = parseInt(hourStr, 10);
//         if (period === "PM" && slotHour !== 12) slotHour += 12;
//         if (period === "AM" && slotHour === 12) slotHour = 0;
//         return slotHour > CheckTime;
//       });
//       setAvailableSlots(
//         nextSlotIndex !== -1 ? available.slice(nextSlotIndex) : []
//       );
//     } else {
//       setAvailableSlots(available);
//     }
//   };

//   const handleDateChange = async (e) => {
//     const selectedDate = e.target.value;
//     setFormData({ ...formData, appointmentDate: selectedDate });
//     const busySlots = await fetchBusySlots(selectedDate);
//     generateAvailableSlots(busySlots, selectedDate);
//   };

//   return (
//     <div className="w-fit p-6 bg-white shadow-xl rounded-xl">
//       <h1 className="text-xl md:text-3xl font-bold text-[#011632] mb-8 text-center">
//         Book Your Appointment
//       </h1>
//       <form onSubmit={handleBookAppointment} className="space-y-6">
//         <div className="flex gap-4">
//           {/* First Name */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               First Name
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="firstName"
//                 placeholder="First Name"
//                 value={formData.firstName}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>

//           {/* Last Name */}
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Last Name{" "}
//               <span className="text-gray-400 italic text-xs">(optional)</span>
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <User className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="text"
//                 name="lastName"
//                 placeholder="Last Name"
//                 value={formData.lastName}
//                 onChange={handleChange}
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Phone */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Phone Number
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Phone className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="tel"
//               name="phone"
//               placeholder="Phone Number"
//               value={formData.phone}
//               onChange={(e) => {
//                 const value = e.target.value;
//                 if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
//               }}
//               maxLength={10}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Email */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Email ID
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Mail className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="email"
//               name="email"
//               placeholder="Email ID"
//               value={formData.email}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Meeting Type */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Preferred Meeting Type
//           </label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MessageSquare className="w-5 h-5 text-gray-400 ml-3" />
//             <select
//               name="meetingType"
//               value={formData.meetingType}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//             >
//               <option value="">Select Meeting Type</option>
//               <option disabled value="WhatsApp">
//                 WhatsApp
//               </option>
//               <option value="Google Meet">Google Meet</option>
//               <option disabled value="Zoom">
//                 Zoom
//               </option>
//             </select>
//           </div>
//         </div>

//         {/* Meeting Contact */}
//         {formData.meetingType && (
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               {formData.meetingType === "WhatsApp"
//                 ? "WhatsApp Number For Meet Link"
//                 : "Email Address For Meet Link"}
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               {formData.meetingType === "WhatsApp" ? (
//                 <Phone className="w-5 h-5 text-gray-400 ml-3" />
//               ) : (
//                 <Mail className="w-5 h-5 text-gray-400 ml-3" />
//               )}
//               <input
//                 type={formData.meetingType === "WhatsApp" ? "tel" : "email"}
//                 name="meetingContact"
//                 value={formData.meetingContact}
//                 placeholder={
//                   formData.meetingType === "WhatsApp"
//                     ? "WhatsApp Number"
//                     : "Email ID for Meet Link"
//                 }
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         )}

//         {/* Date and Time */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Appointment Date
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Calendar className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="date"
//                 name="appointmentDate"
//                 value={formData.appointmentDate}
//                 onChange={handleDateChange}
//                 required
//                 min={new Date().toISOString().split("T")[0]}
//                 max={
//                   new Date(new Date().setMonth(new Date().getMonth() + 5))
//                     .toISOString()
//                     .split("T")[0]
//                 }
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Available Slots
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Clock className="w-5 h-5 text-gray-400 ml-3" />
//               <select
//                 name="appointmentTime"
//                 value={formData.appointmentTime}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//               >
//                 <option value="">Select a slot</option>
//                 {availableSlots.length > 0 ? (
//                   availableSlots.map((slot, index) => (
//                     <option key={index} value={slot}>
//                       {slot}
//                     </option>
//                   ))
//                 ) : (
//                   <option>No slots available</option>
//                 )}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Submit Button */}
//         <button
//           type="submit"
//           className="w-full bg-[#1376F8] text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
//           disabled={isLoading}
//         >
//           {isLoading ? "Processing..." : "Book Appointment"}
//         </button>
//       </form>

//       {/* Payment Modal */}
//       {showPaymentModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
//             <h2 className="text-xl font-bold text-orange-800 mb-4">
//               Complete Payment
//             </h2>
//             <p className="text-gray-700">Amount: ₹1000</p>
//             <p className="text-gray-700">
//               Time Remaining: {Math.floor(timer / 60)}:
//               {timer % 60 < 10 ? "0" : ""}
//               {timer % 60}
//             </p>
//             {qrCode && (
//               <div className="my-4">
//                 <img
//                   src={qrCode}
//                   alt="Payment QR Code"
//                   className="mx-auto w-32 h-32"
//                 />
//                 <p className="text-center text-sm text-gray-600">Scan to Pay</p>
//               </div>
//             )}
//             {timer <= 0 && (
//               <button
//                 onClick={() => {
//                   setShowPaymentModal(false);
//                   setTimer(300);
//                   setQrCode(null);
//                   setPaymentDetails(null);
//                 }}
//                 className="mt-4 w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
//               >
//                 Reload Payment
//               </button>
//             )}
//           </div>
//         </div>
//       )}

//       <ToastContainer position="top-right" autoClose={5001} />
//     </div>
//   );
// };

// export default DoctorForm;

// FIXME: remove unwanted fields and update form

// import React, { useState, useEffect } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import axiosInstance from "../api/axiosInstance";
// import { generateMeetingLink } from "./generateMeetingLink ";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   User,
//   Phone,
//   Mail,
//   MapPin,
//   Calendar,
//   Clock,
//   Globe,
//   FileText,
//   MessageSquare,
// } from "lucide-react"; // Install lucide-react: npm install lucide-react
// import AiBot from "../AiBot";

// const {
//   VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
//   VITE_GOOGLE_CLIENT_ID: clientId,
//   VITE_GOOGLE_CLIENT_SECRET: clientSecret,
// } = import.meta.env;

// const DoctorForm = () => {
//   const [formData, setFormData] = useState({
//     doctorName: "",
//     clinicPhone: "",
//     clinicEmail: "",
//     personalPhone: "",
//     personalEmail: "",
//     sameAsClinic: "no",
//     clinicAddress: "",
//     clinicAvailability: "",
//     domainOption: "no",
//     domainName: "",
//     publications: "",
//     articles: "",
//     extraNotes: "",
//     meetingType: "",
//     meetingContact: "",
//     appointmentDate: "",
//     appointmentTime: "",
//   });

//   const [availableSlots, setAvailableSlots] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [color, setColor] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [timer, setTimer] = useState(300); // 5 minutes in seconds
//   const [qrCode, setQrCode] = useState(null);

//   const [tokenManager, setTokenManager] = useState({
//     accessToken: "",
//     refreshToken: initialRefreshToken,
//     clientId,
//     clientSecret,
//     tokenExpiry: null,
//   });

//   useEffect(() => {
//     const storedToken = localStorage.getItem("accessToken");
//     const storedExpiry = localStorage.getItem("tokenExpiry");
//     if (storedToken && storedExpiry) {
//       setTokenManager((prev) => ({
//         ...prev,
//         accessToken: storedToken,
//         tokenExpiry: parseInt(storedExpiry, 10),
//       }));
//     }
//   }, []);

//   useEffect(() => {
//     let interval;
//     if (showPaymentModal && timer > 0) {
//       interval = setInterval(() => {
//         setTimer((prev) => prev - 1);
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [showPaymentModal, timer]);

//   const initiatePayment = async () => {
//     try {
//       console.log("Initiating payment with data:", {
//         name: formData.doctorName,
//         email: formData.personalEmail,
//         phone: formData.personalPhone,
//         slot: formData.appointmentTime,
//       });

//       if (!window.Razorpay) {
//         throw new Error("Razorpay script not loaded. Please check your internet connection and try again.");
//       }

//       const response = await axiosInstance.post("/create-order", {
//         name: formData.doctorName,
//         email: formData.personalEmail,
//         phone: formData.personalPhone,
//         slot: formData.appointmentTime,
//       });

//       console.log("Payment response:", response.data);

//       setPaymentDetails(response.data);

//       const options = {
//         key: response.data.key,
//         amount: response.data.amount,
//         currency: "INR",
//         name: "Doctor Consultation",
//         description: "Appointment Booking",
//         order_id: response.data.orderId,
//         handler: async function (response) {
//           try {
//             const verifyResponse = await axiosInstance.post("/verify-payment", {
//               razorpay_order_id: response.razorpay_order_id,
//               razorpay_payment_id: response.razorpay_payment_id,
//               razorpay_signature: response.razorpay_signature,
//             });

//             console.log("Payment verification response:", verifyResponse.data);

//             if (verifyResponse.data.status === "success") {
//               await handleFormSubmission();
//               setShowPaymentModal(false);
//               toast.success("Payment successful!");
//             } else {
//               toast.error("Payment verification failed");
//             }
//           } catch (verifyError) {
//             console.error("Verification error:", verifyError);
//             toast.error("Error verifying payment");
//           }
//         },
//         prefill: {
//           name: formData.doctorName,
//           email: formData.personalEmail,
//           contact: formData.personalPhone,
//         },
//         theme: {
//           color: "#f97316", // Orange-600 to match theme
//         },
//         modal: {
//           ondismiss: () => {
//             setShowPaymentModal(false);
//             setTimer(300);
//             setQrCode(null);
//             console.log("Payment modal dismissed");
//           },
//         },
//       };

//       const rzp = new window.Razorpay(options);
//       rzp.open();

//       const qrData = `Pay ₹1000 for appointment - Order ID: ${response.data.orderId}`;
//       setQrCode(
//         `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`
//       );
//       setShowPaymentModal(true);
//       console.log("QR code set:", qrData);
//     } catch (error) {
//       console.error("Payment initiation error:", {
//         message: error.message,
//         response: error.response?.data,
//         status: error.response?.status,
//       });
//       toast.error(`Error initiating payment: ${error.response?.data?.error || error.message}`);
//     }
//   };

//   const handleFormSubmission = async () => {
//     setIsLoading(true);
//     try {
//       const accessToken =
//         tokenManager.accessToken || (await refreshAccessToken());
//       const meetingLink = await generateMeetingLink(
//         formData.meetingType,
//         formData.personalEmail,
//         formData.appointmentDate,
//         formData.appointmentTime,
//         accessToken
//       );

//       if (meetingLink && meetingLink !== "Error generating Google Meet link!") {
//         toast.success("Meeting link sent successfully!");

//         const scriptURL =
//           "https://script.google.com/macros/s/AKfycbz7kKU38kFzpaoE26OlsMihWlvEgUY9ur-Uf7fbI-bnYp_4Fee2mrWW9aJOBd4uuGhi/exec";
//         const formDataToSubmit = new FormData();
//         Object.keys(formData).forEach((key) => {
//           formDataToSubmit.append(key, formData[key]);
//         });
//         formDataToSubmit.append("meetingLink", meetingLink);

//         const response = await fetch(scriptURL, {
//           method: "POST",
//           body: formDataToSubmit,
//         });

//         if (response.ok) {
//           toast.success("Doctor details successfully submitted!");
//           setFormData({
//             doctorName: "",
//             clinicPhone: "",
//             clinicEmail: "",
//             personalPhone: "",
//             personalEmail: "",
//             sameAsClinic: "no",
//             clinicAddress: "",
//             clinicAvailability: "",
//             domainOption: "no",
//             domainName: "",
//             publications: "",
//             articles: "",
//             extraNotes: "",
//             meetingType: "",
//             meetingContact: "",
//             appointmentDate: "",
//             appointmentTime: "",
//           });
//         }
//       }
//     } catch (error) {
//       toast.error("Error processing submission");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleBookAppointment = (e) => {
//     e.preventDefault();
//     if (formData.sameAsClinic === "no") {
//       if (formData.personalPhone === formData.clinicPhone) {
//         toast.error("Personal Phone cannot be same as Clinic Phone");
//         return;
//       }
//       if (formData.personalEmail === formData.clinicEmail) {
//         toast.error("Personal Email cannot be same as Clinic Email");
//         return;
//       }
//     }
//     initiatePayment();
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prevData) => {
//       if (name === "sameAsClinic") {
//         if (value === "yes") {
//           setColor(true);
//           return {
//             ...prevData,
//             sameAsClinic: value,
//             personalPhone: prevData.clinicPhone,
//             personalEmail: prevData.clinicEmail,
//           };
//         } else {
//           setColor(false);
//           return {
//             ...prevData,
//             sameAsClinic: value,
//             personalPhone: "",
//             personalEmail: "",
//           };
//         }
//       }
//       return { ...prevData, [name]: value };
//     });
//   };

//   const fetchBusySlots = async (selectedDate) => {
//     const refreshAccessToken = async () => {
//       try {
//         const response = await fetch("https://oauth2.googleapis.com/token", {
//           method: "POST",
//           headers: { "Content-Type": "application/x-www-form-urlencoded" },
//           body: new URLSearchParams({
//             client_id: tokenManager.clientId,
//             client_secret: tokenManager.clientSecret,
//             refresh_token: tokenManager.refreshToken,
//             grant_type: "refresh_token",
//           }),
//         });
//         const data = await response.json();
//         if (!response.ok) {
//           console.error("Refresh Token Response:", data);
//           throw new Error("Token refresh failed: " + JSON.stringify(data));
//         }

//         setTokenManager((prev) => {
//           const newState = {
//             ...prev,
//             accessToken: data.access_token,
//             tokenExpiry: Date.now() + data.expires_in * 1000,
//           };
//           localStorage.setItem("accessToken", data.access_token);
//           localStorage.setItem("tokenExpiry", newState.tokenExpiry);
//           return newState;
//         });

//         console.log("New Access Token:", data.access_token);
//         return data.access_token;
//       } catch (error) {
//         console.error("Refresh Error:", error);
//         toast.error("Failed to refresh token.");
//         return null;
//       }
//     };

//     const getValidAccessToken = async () => {
//       if (!tokenManager.tokenExpiry || Date.now() >= tokenManager.tokenExpiry) {
//         return await refreshAccessToken();
//       }
//       return tokenManager.accessToken;
//     };

//     const accessToken = await getValidAccessToken();
//     if (!accessToken) return [];

//     const calendarId = "primary";
//     const timeMin = `${selectedDate}T00:00:00Z`;
//     const timeMax = `${selectedDate}T23:59:59Z`;

//     try {
//       const response = await fetch(
//         "https://www.googleapis.com/calendar/v3/freeBusy",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             timeMin,
//             timeMax,
//             timeZone: "Asia/Kolkata",
//             items: [{ id: calendarId }],
//           }),
//         }
//       );

//       const data = await response.json();
//       if (data.error) {
//         console.error("Google API Error:", data.error);
//         return [];
//       }
//       return data.calendars[calendarId]?.busy || [];
//     } catch (error) {
//       console.error("Error fetching busy slots:", error);
//       return [];
//     }
//   };

//   const generateAvailableSlots = (busySlots, selectedDate) => {
//     const workingHours = [
//       "09:00 AM",
//       "10:00 AM",
//       "11:00 AM",
//       "12:00 PM",
//       "01:00 PM",
//       "02:00 PM",
//       "03:00 PM",
//       "04:00 PM",
//       "05:00 PM",
//     ];

//     const now = new Date();
//     const dateString = now.toISOString().split("T")[0];

//     let available = workingHours;

//     const busyTimes = busySlots.map((slot) => ({
//       start: new Date(slot.start).getHours(),
//       end: new Date(slot.end).getHours(),
//     }));

//     available = available.filter((slot) => {
//       const [hourStr, , period] = slot.split(/[: ]/);
//       let slotHour = parseInt(hourStr, 10);
//       if (period === "PM" && slotHour !== 12) slotHour += 12;
//       if (period === "AM" && slotHour === 12) slotHour = 0;

//       return !busyTimes.some(
//         (busy) => slotHour >= busy.start && slotHour < busy.end
//       );
//     });

//     if (dateString === selectedDate) {
//       const CheckTime = now.getHours();
//       const nextSlotIndex = available.findIndex((slot) => {
//         const [hourStr, , period] = slot.split(/[: ]/);
//         let slotHour = parseInt(hourStr, 10);
//         if (period === "PM" && slotHour !== 12) slotHour += 12;
//         if (period === "AM" && slotHour === 12) slotHour = 0;
//         return slotHour > CheckTime;
//       });

//       const filteredSlots =
//         nextSlotIndex !== -1 ? available.slice(nextSlotIndex) : [];
//       console.log(filteredSlots, "filteredSlots");
//       setAvailableSlots(filteredSlots);
//     } else {
//       setAvailableSlots(available);
//     }
//   };

//   const handleDateChange = async (e) => {
//     const selectedDate = e.target.value;
//     setFormData({ ...formData, appointmentDate: selectedDate });
//     const busySlots = await fetchBusySlots(selectedDate);
//     generateAvailableSlots(busySlots, selectedDate);
//   };

//   const reloadPayment = () => {
//     setShowPaymentModal(false);
//     setTimer(300);
//     setQrCode(null);
//     setPaymentDetails(null);
//   };

//   return (
//     <div className="max-w-3xl mx-auto p-6 bg-white shadow-xl rounded-xl">
//       <h1 className="text-3xl font-bold text-orange-800 mb-8 text-center">
//         Book Your Appointment
//       </h1>
//       <form onSubmit={handleBookAppointment} className="space-y-6">
//         {/* Doctor Name */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Doctor Name</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <User className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="text"
//               name="doctorName"
//               placeholder="Name of the doctor"
//               value={formData.doctorName}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Clinic Phone */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Phone</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Phone className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="tel"
//               name="clinicPhone"
//               placeholder="Phone number of the clinic"
//               value={formData.clinicPhone}
//               onChange={(e) => {
//                 const value = e.target.value;
//                 if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
//               }}
//               maxLength={10}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Clinic Email */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Email</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Mail className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="email"
//               name="clinicEmail"
//               placeholder="Email of the clinic"
//               value={formData.clinicEmail}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Same as Clinic */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Are personal details same as clinic?
//           </label>
//           <div className="flex items-center space-x-6">
//             <label className="flex items-center">
//               <input
//                 type="radio"
//                 name="sameAsClinic"
//                 value="yes"
//                 checked={formData.sameAsClinic === "yes"}
//                 onChange={handleChange}
//                 className="w-4 h-4 text-orange-600 focus:ring-orange-500"
//               />
//               <span className="ml-2 text-gray-700">Yes</span>
//             </label>
//             <label className="flex items-center">
//               <input
//                 type="radio"
//                 name="sameAsClinic"
//                 value="no"
//                 checked={formData.sameAsClinic === "no"}
//                 onChange={handleChange}
//                 className="w-4 h-4 text-orange-600 focus:ring-orange-500"
//               />
//               <span className="ml-2 text-gray-700">No</span>
//             </label>
//           </div>
//         </div>

//         {/* Personal Phone */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Personal Phone</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Phone className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="tel"
//               name="personalPhone"
//               placeholder="Your personal phone number"
//               value={formData.personalPhone}
//               onChange={(e) => {
//                 const value = e.target.value;
//                 if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
//               }}
//               maxLength={10}
//               required
//               className={`w-full p-3 pl-2 border-none rounded-lg focus:outline-none ${
//                 color ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
//               }`}
//               disabled={formData.sameAsClinic === "yes"}
//             />
//           </div>
//         </div>

//         {/* Personal Email */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Mail className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               type="email"
//               name="personalEmail"
//               placeholder="Your personal email"
//               value={formData.personalEmail}
//               onChange={handleChange}
//               required
//               className={`w-full p-3 pl-2 border-none rounded-lg focus:outline-none ${
//                 color ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
//               }`}
//               disabled={formData.sameAsClinic === "yes"}
//             />
//           </div>
//         </div>

//         {/* Clinic Address */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Address</label>
//           <div className="flex items-start border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MapPin className="w-5 h-5 text-gray-400 ml-3 mt-3" />
//             <textarea
//               placeholder="Street, City, Country"
//               name="clinicAddress"
//               value={formData.clinicAddress}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none resize-none h-24"
//             />
//           </div>
//         </div>

//         {/* Clinic Availability */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Clinic Availability</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <Clock className="w-5 h-5 text-gray-400 ml-3" />
//             <input
//               placeholder="Ex: Mon-Fri: 9am-5pm"
//               type="text"
//               name="clinicAvailability"
//               value={formData.clinicAvailability}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//             />
//           </div>
//         </div>

//         {/* Domain Option */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">Do you have a domain?</label>
//           <div className="flex items-center space-x-6">
//             <label className="flex items-center">
//               <input
//                 type="radio"
//                 name="domainOption"
//                 value="yes"
//                 checked={formData.domainOption === "yes"}
//                 onChange={handleChange}
//                 className="w-4 h-4 text-orange-600 focus:ring-orange-500"
//               />
//               <span className="ml-2 text-gray-700">Yes</span>
//             </label>
//             <label className="flex items-center">
//               <input
//                 type="radio"
//                 name="domainOption"
//                 value="no"
//                 checked={formData.domainOption === "no"}
//                 onChange={handleChange}
//                 className="w-4 h-4 text-orange-600 focus:ring-orange-500"
//               />
//               <span className="ml-2 text-gray-700">No</span>
//             </label>
//           </div>
//         </div>

//         {/* Domain Name */}
//         {formData.domainOption === "yes" && (
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name</label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Globe className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 placeholder="www.example.com"
//                 type="text"
//                 name="domainName"
//                 value={formData.domainName}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         )}

//         {/* Meeting Type */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Meeting Type</label>
//           <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MessageSquare className="w-5 h-5 text-gray-400 ml-3" />
//             <select
//               name="meetingType"
//               value={formData.meetingType}
//               onChange={handleChange}
//               required
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//             >
//               <option value="">Select Meeting Type</option>
//               <option disabled value="WhatsApp">WhatsApp</option>
//               <option value="Google Meet">Google Meet</option>
//               <option disabled value="Zoom">Zoom</option>
//             </select>
//           </div>
//         </div>

//         {/* Meeting Contact */}
//         {formData.meetingType && (
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               {formData.meetingType === "WhatsApp" ? "WhatsApp Number For Meet Link" : "Email Address For Meet Link"}
//             </label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               {formData.meetingType === "WhatsApp" ? (
//                 <Phone className="w-5 h-5 text-gray-400 ml-3" />
//               ) : (
//                 <Mail className="w-5 h-5 text-gray-400 ml-3" />
//               )}
//               <input
//                 type={formData.meetingType === "WhatsApp" ? "tel" : "email"}
//                 name="meetingContact"
//                 value={formData.meetingContact}
//                 placeholder={formData.meetingType === "WhatsApp" ? "WhatsApp Number" : "Email Id"}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//         )}

//         {/* Date and Time */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Calendar className="w-5 h-5 text-gray-400 ml-3" />
//               <input
//                 type="date"
//                 name="appointmentDate"
//                 value={formData.appointmentDate}
//                 onChange={handleDateChange}
//                 required
//                 min={new Date().toISOString().split("T")[0]}
//                 max={new Date(new Date().setMonth(new Date().getMonth() + 5)).toISOString().split("T")[0]}
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none"
//               />
//             </div>
//           </div>
//           <div className="relative">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Available Slots</label>
//             <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//               <Clock className="w-5 h-5 text-gray-400 ml-3" />
//               <select
//                 name="appointmentTime"
//                 value={formData.appointmentTime}
//                 onChange={handleChange}
//                 required
//                 className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none appearance-none"
//               >
//                 <option value="">Select a slot</option>
//                 {availableSlots.length > 0 ? (
//                   availableSlots.map((slot, index) => (
//                     <option key={index} value={slot}>{slot}</option>
//                   ))
//                 ) : (
//                   <option>No slots available</option>
//                 )}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Publications */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Publications <span className="text-gray-400 italic text-xs">(optional)</span>
//           </label>
//           <div className="flex items-start border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <FileText className="w-5 h-5 text-gray-400 ml-3 mt-3" />
//             <textarea
//               placeholder="Share your drive link"
//               name="publications"
//               value={formData.publications}
//               onChange={handleChange}
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none resize-none h-24"
//             />
//           </div>
//         </div>

//         {/* Articles */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Articles <span className="text-gray-400 italic text-xs">(optional)</span>
//           </label>
//           <div className="flex items-start border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <FileText className="w-5 h-5 text-gray-400 ml-3 mt-3" />
//             <textarea
//               placeholder="Share your drive link"
//               name="articles"
//               value={formData.articles}
//               onChange={handleChange}
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none resize-none h-24"
//             />
//           </div>
//         </div>

//         {/* Extra Notes */}
//         <div className="relative">
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Extra Notes <span className="text-gray-400 italic text-xs">(optional)</span>
//           </label>
//           <div className="flex items-start border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
//             <MessageSquare className="w-5 h-5 text-gray-400 ml-3 mt-3" />
//             <textarea
//               placeholder="Share your drive link"
//               name="extraNotes"
//               value={formData.extraNotes}
//               onChange={handleChange}
//               className="w-full p-3 pl-2 border-none rounded-lg focus:outline-none resize-none h-24"
//             />
//           </div>
//         </div>
//         {/* AI bot */}

//         <AiBot/>

//         {/* Submit Button */}
//         <button
//           type="submit"
//           className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
//           disabled={isLoading}
//         >
//           {isLoading ? "Processing..." : "Book Appointment"}
//         </button>
//       </form>

//       {/* Payment Modal */}
//       {showPaymentModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
//           <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
//             <h2 className="text-xl font-bold text-orange-800 mb-4">Complete Payment</h2>
//             <p className="text-gray-700">Amount: ₹1000</p>
//             <p className="text-gray-700">
//               Time Remaining: {Math.floor(timer / 60)}:{timer % 60 < 10 ? "0" : ""}{timer % 60}
//             </p>
//             {qrCode && (
//               <div className="my-4">
//                 <img src={qrCode} alt="Payment QR Code" className="mx-auto w-32 h-32" />
//                 <p className="text-center text-sm text-gray-600">Scan to Pay</p>
//               </div>
//             )}
//             {timer <= 0 && (
//               <div>
//                 <p className="text-red-500 text-center">Payment time expired!</p>
//                 <button
//                   onClick={reloadPayment}
//                   className="mt-4 w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 transition"
//                 >
//                   Reload Payment
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       <ToastContainer
//         position="top-right"
//         autoClose={5001}
//         hideProgressBar={false}
//         closeOnClick
//         pauseOnHover
//         draggable
//       />
//     </div>
//   );
// };

// export default DoctorForm;

// Old

// import React, { useState, useEffect } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import axiosInstance from "../api/axiosInstance";
// import { generateMeetingLink } from "./generateMeetingLink ";
// import "react-toastify/dist/ReactToastify.css";

// const {
//   VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
//   VITE_GOOGLE_CLIENT_ID: clientId,
//   VITE_GOOGLE_CLIENT_SECRET: clientSecret,
// } = import.meta.env;

// const DoctorForm = () => {
//   const [formData, setFormData] = useState({
//     doctorName: "",
//     clinicPhone: "",
//     clinicEmail: "",
//     personalPhone: "",
//     personalEmail: "",
//     sameAsClinic: "no",
//     clinicAddress: "",
//     clinicAvailability: "",
//     domainOption: "no",
//     domainName: "",
//     publications: "",
//     articles: "",
//     extraNotes: "",
//     meetingType: "",
//     meetingContact: "",
//     appointmentDate: "",
//     appointmentTime: "",
//   });

//   const [availableSlots, setAvailableSlots] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [color, setColor] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [paymentDetails, setPaymentDetails] = useState(null);
//   const [timer, setTimer] = useState(300); // 5 minutes in seconds
//   const [qrCode, setQrCode] = useState(null);

//   const [tokenManager, setTokenManager] = useState({
//     accessToken: "",
//     refreshToken: initialRefreshToken,
//     clientId,
//     clientSecret,
//     tokenExpiry: null,
//   });

//   useEffect(() => {
//     const storedToken = localStorage.getItem("accessToken");
//     const storedExpiry = localStorage.getItem("tokenExpiry");
//     if (storedToken && storedExpiry) {
//       setTokenManager((prev) => ({
//         ...prev,
//         accessToken: storedToken,
//         tokenExpiry: parseInt(storedExpiry, 10),
//       }));
//     }
//   }, []);

//   useEffect(() => {
//     let interval;
//     if (showPaymentModal && timer > 0) {
//       interval = setInterval(() => {
//         setTimer((prev) => prev - 1);
//       }, 1000);
//     }
//     return () => clearInterval(interval);
//   }, [showPaymentModal, timer]);

//   const initiatePayment = async () => {
//     try {
//       console.log("Initiating payment with data:", {
//         name: formData.doctorName,
//         email: formData.personalEmail,
//         phone: formData.personalPhone,
//         slot: formData.appointmentTime,
//       });

//       // Check if Razorpay script is loaded
//       if (!window.Razorpay) {
//         throw new Error("Razorpay script not loaded. Please check your internet connection and try again.");
//       }

//       const response = await axiosInstance.post("/create-order", {
//         name: formData.doctorName,
//         email: formData.personalEmail,
//         phone: formData.personalPhone,
//         slot: formData.appointmentTime,
//       });

//       console.log("Payment response:", response.data);

//       // Set payment details but don't show modal yet
//       setPaymentDetails(response.data);

//       const options = {
//         key: response.data.key,
//         amount: response.data.amount,
//         currency: "INR",
//         name: "Doctor Consultation",
//         description: "Appointment Booking",
//         order_id: response.data.orderId,
//         handler: async function (response) {
//           try {
//             const verifyResponse = await axiosInstance.post("/verify-payment", {
//               razorpay_order_id: response.razorpay_order_id,
//               razorpay_payment_id: response.razorpay_payment_id,
//               razorpay_signature: response.razorpay_signature,
//             });

//             console.log("Payment verification response:", verifyResponse.data);

//             if (verifyResponse.data.status === "success") {
//               await handleFormSubmission();
//               setShowPaymentModal(false);
//               toast.success("Payment successful!");
//             } else {
//               toast.error("Payment verification failed");
//             }
//           } catch (verifyError) {
//             console.error("Verification error:", verifyError);
//             toast.error("Error verifying payment");
//           }
//         },
//         prefill: {
//           name: formData.doctorName,
//           email: formData.personalEmail,
//           contact: formData.personalPhone,
//         },
//         theme: {
//           color: "#3399cc",
//         },
//         modal: {
//           ondismiss: () => {
//             setShowPaymentModal(false);
//             setTimer(300);
//             setQrCode(null);
//             console.log("Payment modal dismissed");
//           },
//         },
//       };

//       // Open Razorpay and show modal only if everything is ready
//       const rzp = new window.Razorpay(options);
//       rzp.open();

//       // Generate QR code and show modal only after successful setup
//       const qrData = `Pay ₹1000 for appointment - Order ID: ${response.data.orderId}`;
//       setQrCode(
//         `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`
//       );
//       setShowPaymentModal(true); // Show modal only here
//       console.log("QR code set:", qrData);

//     } catch (error) {
//       console.error("Payment initiation error:", {
//         message: error.message,
//         response: error.response?.data,
//         status: error.response?.status,
//       });
//       toast.error(`Error initiating payment: ${error.response?.data?.error || error.message}`);
//       // Don't setShowPaymentModal(true) on error
//     }
//   };

//   const handleFormSubmission = async () => {
//     setIsLoading(true);
//     try {
//       const accessToken =
//         tokenManager.accessToken || (await refreshAccessToken());
//       const meetingLink = await generateMeetingLink(
//         formData.meetingType,
//         formData.personalEmail,
//         formData.appointmentDate,
//         formData.appointmentTime,
//         accessToken
//       );

//       if (meetingLink && meetingLink !== "Error generating Google Meet link!") {
//         toast.success("Meeting link sent successfully!");

//         const scriptURL =
//           "https://script.google.com/macros/s/AKfycbz7kKU38kFzpaoE26OlsMihWlvEgUY9ur-Uf7fbI-bnYp_4Fee2mrWW9aJOBd4uuGhi/exec";
//         const formDataToSubmit = new FormData();
//         Object.keys(formData).forEach((key) => {
//           formDataToSubmit.append(key, formData[key]);
//         });
//         formDataToSubmit.append("meetingLink", meetingLink);

//         const response = await fetch(scriptURL, {
//           method: "POST",
//           body: formDataToSubmit,
//         });

//         if (response.ok) {
//           toast.success("Doctor details successfully submitted!");
//           setFormData({
//             doctorName: "",
//             clinicPhone: "",
//             clinicEmail: "",
//             personalPhone: "",
//             personalEmail: "",
//             sameAsClinic: "no",
//             clinicAddress: "",
//             clinicAvailability: "",
//             domainOption: "no",
//             domainName: "",
//             publications: "",
//             articles: "",
//             extraNotes: "",
//             meetingType: "",
//             meetingContact: "",
//             appointmentDate: "",
//             appointmentTime: "",
//           });
//         }
//       }
//     } catch (error) {
//       toast.error("Error processing submission");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleBookAppointment = (e) => {
//     e.preventDefault();
//     if (formData.sameAsClinic === "no") {
//       if (formData.personalPhone === formData.clinicPhone) {
//         toast.error("Personal Phone cannot be same as Clinic Phone");
//         return;
//       }
//       if (formData.personalEmail === formData.clinicEmail) {
//         toast.error("Personal Email cannot be same as Clinic Email");
//         return;
//       }
//     }
//     initiatePayment();
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prevData) => {
//       if (name === "sameAsClinic") {
//         if (value === "yes") {
//           setColor(true);
//           return {
//             ...prevData,
//             sameAsClinic: value,
//             personalPhone: prevData.clinicPhone,
//             personalEmail: prevData.clinicEmail,
//           };
//         } else {
//           setColor(false);
//           return {
//             ...prevData,
//             sameAsClinic: value,
//             personalPhone: "",
//             personalEmail: "",
//           };
//         }
//       }
//       return { ...prevData, [name]: value };
//     });
//   };

//   const fetchBusySlots = async (selectedDate) => {
//     const refreshAccessToken = async () => {
//       try {
//         const response = await fetch("https://oauth2.googleapis.com/token", {
//           method: "POST",
//           headers: { "Content-Type": "application/x-www-form-urlencoded" },
//           body: new URLSearchParams({
//             client_id: tokenManager.clientId,
//             client_secret: tokenManager.clientSecret,
//             refresh_token: tokenManager.refreshToken,
//             grant_type: "refresh_token",
//           }),
//         });
//         const data = await response.json();
//         if (!response.ok) {
//           console.error("Refresh Token Response:", data);
//           throw new Error("Token refresh failed: " + JSON.stringify(data));
//         }

//         setTokenManager((prev) => {
//           const newState = {
//             ...prev,
//             accessToken: data.access_token,
//             tokenExpiry: Date.now() + data.expires_in * 1000,
//           };
//           localStorage.setItem("accessToken", data.access_token);
//           localStorage.setItem("tokenExpiry", newState.tokenExpiry);
//           return newState;
//         });

//         console.log("New Access Token:", data.access_token);
//         return data.access_token;
//       } catch (error) {
//         console.error("Refresh Error:", error);
//         toast.error("Failed to refresh token.");
//         return null;
//       }
//     };

//     const getValidAccessToken = async () => {
//       if (!tokenManager.tokenExpiry || Date.now() >= tokenManager.tokenExpiry) {
//         return await refreshAccessToken();
//       }
//       return tokenManager.accessToken;
//     };

//     const accessToken = await getValidAccessToken();
//     if (!accessToken) return [];

//     const calendarId = "primary";
//     const timeMin = `${selectedDate}T00:00:00Z`;
//     const timeMax = `${selectedDate}T23:59:59Z`;

//     try {
//       const response = await fetch(
//         "https://www.googleapis.com/calendar/v3/freeBusy",
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             timeMin,
//             timeMax,
//             timeZone: "Asia/Kolkata",
//             items: [{ id: calendarId }],
//           }),
//         }
//       );

//       const data = await response.json();
//       if (data.error) {
//         console.error("Google API Error:", data.error);
//         return [];
//       }
//       return data.calendars[calendarId]?.busy || [];
//     } catch (error) {
//       console.error("Error fetching busy slots:", error);
//       return [];
//     }
//   };

//   const generateAvailableSlots = (busySlots, selectedDate) => {
//     const workingHours = [
//       "09:00 AM",
//       "10:00 AM",
//       "11:00 AM",
//       "12:00 PM",
//       "01:00 PM",
//       "02:00 PM",
//       "03:00 PM",
//       "04:00 PM",
//       "05:00 PM",
//     ];

//     const now = new Date();
//     const dateString = now.toISOString().split("T")[0];

//     let available = workingHours;

//     const busyTimes = busySlots.map((slot) => ({
//       start: new Date(slot.start).getHours(),
//       end: new Date(slot.end).getHours(),
//     }));

//     available = available.filter((slot) => {
//       const [hourStr, , period] = slot.split(/[: ]/);
//       let slotHour = parseInt(hourStr, 10);
//       if (period === "PM" && slotHour !== 12) slotHour += 12;
//       if (period === "AM" && slotHour === 12) slotHour = 0;

//       return !busyTimes.some(
//         (busy) => slotHour >= busy.start && slotHour < busy.end
//       );
//     });

//     if (dateString === selectedDate) {
//       const CheckTime = now.getHours();
//       const nextSlotIndex = available.findIndex((slot) => {
//         const [hourStr, , period] = slot.split(/[: ]/);
//         let slotHour = parseInt(hourStr, 10);
//         if (period === "PM" && slotHour !== 12) slotHour += 12;
//         if (period === "AM" && slotHour === 12) slotHour = 0;
//         return slotHour > CheckTime;
//       });

//       const filteredSlots =
//         nextSlotIndex !== -1 ? available.slice(nextSlotIndex) : [];
//       console.log(filteredSlots, "filteredSlots");
//       setAvailableSlots(filteredSlots);
//     } else {
//       setAvailableSlots(available);
//     }
//   };

//   const handleDateChange = async (e) => {
//     const selectedDate = e.target.value;
//     setFormData({ ...formData, appointmentDate: selectedDate });
//     const busySlots = await fetchBusySlots(selectedDate);
//     generateAvailableSlots(busySlots, selectedDate);
//   };

//   const reloadPayment = () => {
//     setShowPaymentModal(false);
//     setTimer(300);
//     setQrCode(null);
//     setPaymentDetails(null);
//   };

//   return (
//     <div className="max-w-lg mx-auto p-8 bg-white shadow-lg rounded-lg">
//       <h1 className="text-2xl font-bold mb-6 text-center">
//         Submit Doctor Details
//       </h1>
//       <form onSubmit={handleBookAppointment}>
//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">Doctor Name</label>
//           <input
//             type="text"
//             name="doctorName"
//             placeholder="Name of the doctor"
//             value={formData.doctorName}
//             onChange={handleChange}
//             required
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">Clinic Phone</label>
//           <input
//             type="tel"
//             name="clinicPhone"
//             placeholder="Phone number of the clinic"
//             value={formData.clinicPhone}
//             onChange={(e) => {
//               const value = e.target.value;
//               if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
//             }}
//             maxLength={10}
//             required
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">Clinic Email</label>
//           <input
//             type="email"
//             name="clinicEmail"
//             placeholder="Email of the clinic"
//             value={formData.clinicEmail}
//             onChange={handleChange}
//             required
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">
//             Are personal details same as clinic?
//           </label>
//           <div className="flex items-center space-x-4">
//             <label>
//               <input
//                 type="radio"
//                 name="sameAsClinic"
//                 value="yes"
//                 checked={formData.sameAsClinic === "yes"}
//                 onChange={handleChange}
//                 className="mr-2"
//               />
//               Yes
//             </label>
//             <label>
//               <input
//                 type="radio"
//                 name="sameAsClinic"
//                 value="no"
//                 checked={formData.sameAsClinic === "no"}
//                 onChange={handleChange}
//                 className="mr-2"
//               />
//               No
//             </label>
//           </div>
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">Personal Phone</label>
//           <input
//             type="tel"
//             name="personalPhone"
//             placeholder="Your personal phone number"
//             value={formData.personalPhone}
//             onChange={(e) => {
//               const value = e.target.value;
//               if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
//             }}
//             maxLength={10}
//             required
//             className={`w-full border rounded px-3 py-2 ${
//               color ? "bg-gray-200 text-gray-400" : ""
//             }`}
//             disabled={formData.sameAsClinic === "yes"}
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">Personal Email</label>
//           <input
//             type="email"
//             name="personalEmail"
//             placeholder="Your personal email"
//             value={formData.personalEmail}
//             onChange={handleChange}
//             required
//             className={`w-full border rounded px-3 py-2 ${
//               color ? "bg-gray-200 text-gray-400" : ""
//             }`}
//             disabled={formData.sameAsClinic === "yes"}
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">Clinic Address</label>
//           <textarea
//             placeholder="Street, City, Country"
//             name="clinicAddress"
//             value={formData.clinicAddress}
//             onChange={handleChange}
//             required
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">Clinic Availability</label>
//           <input
//             placeholder="Ex: Mon-Fri: 9am-5pm"
//             type="text"
//             name="clinicAvailability"
//             value={formData.clinicAvailability}
//             onChange={handleChange}
//             required
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">
//             Do you have a domain?
//           </label>
//           <div className="flex items-center space-x-4">
//             <label>
//               <input
//                 type="radio"
//                 name="domainOption"
//                 value="yes"
//                 checked={formData.domainOption === "yes"}
//                 onChange={handleChange}
//                 className="mr-2"
//               />
//               Yes
//             </label>
//             <label>
//               <input
//                 type="radio"
//                 name="domainOption"
//                 value="no"
//                 checked={formData.domainOption === "no"}
//                 onChange={handleChange}
//                 className="mr-2"
//               />
//               No
//             </label>
//           </div>
//         </div>

//         {formData.domainOption === "yes" && (
//           <div className="mb-4 text-left">
//             <label className="block font-medium mb-1">Domain Name</label>
//             <input
//               placeholder="www.example.com"
//               type="text"
//               name="domainName"
//               value={formData.domainName}
//               onChange={handleChange}
//               required
//               className="w-full border rounded px-3 py-2"
//             />
//           </div>
//         )}

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">
//             Preferred Meeting Type
//           </label>
//           <select
//             name="meetingType"
//             value={formData.meetingType}
//             onChange={handleChange}
//             required
//             className="w-full border rounded px-3 py-2"
//           >
//             <option value="">Select Meeting Type</option>
//             <option disabled value="WhatsApp">
//               WhatsApp
//             </option>
//             <option value="Google Meet">Google Meet</option>
//             <option disabled value="Zoom">
//               Zoom
//             </option>
//           </select>
//         </div>

//         {formData.meetingType && (
//           <div className="mb-4 text-left">
//             <label className="block font-medium mb-1">
//               {formData.meetingType === "WhatsApp"
//                 ? "WhatsApp Number For Meet Link"
//                 : "Email Address For Meet Link"}
//             </label>
//             <input
//               type={formData.meetingType === "WhatsApp" ? "tel" : "email"}
//               name="meetingContact"
//               value={formData.meetingContact}
//               placeholder={
//                 formData.meetingType === "WhatsApp"
//                   ? "WhatsApp Number"
//                   : "Email Id"
//               }
//               onChange={handleChange}
//               required
//               className="w-full border rounded px-3 py-2"
//             />
//           </div>
//         )}

//         <div className="flex items-center justify-between mb-4">
//           <div className="text-left">
//             <label>Date</label>
//             <input
//               type="date"
//               name="appointmentDate"
//               value={formData.appointmentDate}
//               onChange={handleDateChange}
//               required
//               min={new Date().toISOString().split("T")[0]}
//               max={
//                 new Date(new Date().setMonth(new Date().getMonth() + 5))
//                   .toISOString()
//                   .split("T")[0]
//               }
//               className="w-full border rounded px-3 py-2"
//             />
//           </div>
//           <div className="flex flex-col">
//             <label>Available Slots:</label>
//             <select
//               name="appointmentTime"
//               value={formData.appointmentTime}
//               onChange={handleChange}
//               required
//               className="w-full border rounded px-3 py-2"
//             >
//               <option value="">Select a slot</option>
//               {availableSlots.length > 0 ? (
//                 availableSlots.map((slot, index) => (
//                   <option key={index} value={slot}>
//                     {slot}
//                   </option>
//                 ))
//               ) : (
//                 <option>No slots available</option>
//               )}
//             </select>
//           </div>
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">
//             Publications{" "}
//             <span className="text-gray-400 italic text-sm">(optional)</span>
//           </label>
//           <textarea
//             placeholder="Share your drive link"
//             name="publications"
//             value={formData.publications}
//             onChange={handleChange}
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">
//             Articles{" "}
//             <span className="text-gray-400 italic text-sm">(optional)</span>
//           </label>
//           <textarea
//             placeholder="Share your drive link"
//             name="articles"
//             value={formData.articles}
//             onChange={handleChange}
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <div className="mb-4 text-left">
//           <label className="block font-medium mb-1">
//             Extra Notes{" "}
//             <span className="text-gray-400 italic text-sm">(optional)</span>
//           </label>
//           <textarea
//             placeholder="Share your drive link"
//             name="extraNotes"
//             value={formData.extraNotes}
//             onChange={handleChange}
//             className="w-full border rounded px-3 py-2"
//           />
//         </div>

//         <button
//           type="submit"
//           className="w-full bg-orange-600 text-white py-2 rounded hover:bg-blue-700"
//           disabled={isLoading}
//         >
//           {isLoading ? "Processing..." : "Book Appointment"}
//         </button>
//       </form>

//       {showPaymentModal && (
//         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
//           <div className="bg-white p-6 rounded-lg w-96">
//             <h2 className="text-xl font-bold mb-4">Complete Payment</h2>
//             <p>Amount: ₹1000</p>
//             <p>
//               Time Remaining: {Math.floor(timer / 60)}:
//               {timer % 60 < 10 ? "0" : ""}
//               {timer % 60}
//             </p>

//             {qrCode && (
//               <div className="my-4">
//                 <img src={qrCode} alt="Payment QR Code" className="mx-auto" />
//                 <p className="text-center text-sm">Scan to Pay</p>
//               </div>
//             )}

//             {timer <= 0 && (
//               <div>
//                 <p className="text-red-500">Payment time expired!</p>
//                 <button
//                   onClick={reloadPayment}
//                   className="mt-4 w-full bg-blue-600 text-white py-2 rounded"
//                 >
//                   Reload Payment
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       <ToastContainer
//         position="top-right"
//         autoClose={5001}
//         hideProgressBar={false}
//         closeOnClick
//         pauseOnHover
//         draggable
//       />
//     </div>
//   );
// };

// export default DoctorForm;
