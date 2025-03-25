import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import { generateMeetingLink } from "./DoctorForm/generateMeetingLink ";
import "react-toastify/dist/ReactToastify.css";
import AiBot from "./AiBot";

const {
  VITE_GOOGLE_REFRESH_TOKEN: initialRefreshToken,
  VITE_GOOGLE_CLIENT_ID: clientId,
  VITE_GOOGLE_CLIENT_SECRET: clientSecret,
} = import.meta.env;

const Dummy = () => {
  // console.log("Refresh Token✅:", initialRefreshToken);
  // console.log("Client ID✅:", clientId);
  // console.log("Client Secret✅:", clientSecret);
  const [formData, setFormData] = useState({
    doctorName: "",
    clinicPhone: "",
    clinicEmail: "",
    personalPhone: "",
    personalEmail: "",
    sameAsClinic: "no",
    clinicAddress: "",
    clinicAvailability: "",
    domainOption: "no",
    domainName: "",
    publications: "",
    articles: "",
    extraNotes: "",

    meetingType: "",
    meetingContact: "",
    appointmentDate: "",
    appointmentTime: "",
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [color, setColor] = useState(false);

  const [tokenManager, setTokenManager] = useState({
    accessToken: "",
    refreshToken: initialRefreshToken,
    clientId,
    clientSecret,
    tokenExpiry: null,
  });

  console.log(tokenManager.accessToken, "checkTokenchanging are not");

  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedExpiry = localStorage.getItem("tokenExpiry");
    if (storedToken && storedExpiry) {
      setTokenManager((prev) => ({
        ...prev,
        accessToken: storedToken,
        tokenExpiry: parseInt(storedExpiry, 10),
      }));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (
        tokenManager.tokenExpiry &&
        Date.now() >= tokenManager.tokenExpiry - 60000
      ) {
        await refreshAccessToken();
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tokenManager.tokenExpiry]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    // Validation
    if (formData.sameAsClinic === "no") {
      if (formData.personalPhone === formData.clinicPhone) {
        toast.error("Personal Phone cannot be the same as Clinic Phone.");
        setIsLoading(false);
        return;
      }
      if (formData.personalEmail === formData.clinicEmail) {
        toast.error("Personal Email cannot be the same as Clinic Email.");
        setIsLoading(false);
        return;
      }
    }

    try {
      const accessToken =
        tokenManager.accessToken ||
        (await fetchBusySlots(formData.appointmentDate).then(
          () => tokenManager.accessToken
        ));
      if (!accessToken) throw new Error("No valid access token available");
      const meetingLink = await generateMeetingLink(
        formData.meetingType,
        formData.personalEmail, // Patient email
        formData.appointmentDate,
        formData.appointmentTime,
        accessToken
        // formData.meetingContact, // WhatsApp number or email for link
      );
      console.log("Meeting Link:", meetingLink);
      if (meetingLink !== "Error generating Google Meet link!") {
        toast.success("Meeting link sent successfully!");
        const scriptURL =
          "https://script.google.com/macros/s/AKfycbz7kKU38kFzpaoE26OlsMihWlvEgUY9ur-Uf7fbI-bnYp_4Fee2mrWW9aJOBd4uuGhi/exec";

        try {
          const formDataToSubmit = new FormData();
          Object.keys(formData).forEach((key) => {
            formDataToSubmit.append(key, formData[key]);
          });

          const response = await fetch(scriptURL, {
            method: "POST",
            body: formDataToSubmit,
          });

          if (response.ok) {
            toast.success("Doctor details successfully submitted!");
            setFormData({
              doctorName: "",
              clinicPhone: "",
              clinicEmail: "",
              personalPhone: "",
              personalEmail: "",
              sameAsClinic: "no",
              clinicAddress: "",
              clinicAvailability: "",
              domainOption: "no",
              domainName: "",
              publications: "",
              articles: "",
              extraNotes: "",
              meetingType: "",
              meetingContact: "",
              appointmentDate: "",
              appointmentTime: "",
            });
          } else {
            throw new Error("Failed to submit the form");
          }
        } catch (error) {
          toast.error("Error submitting the form. Please try again.");
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      toast.error("Error sending meeting link.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => {
      if (name === "sameAsClinic") {
        if (value === "yes") {
          setColor(true);
          return {
            ...prevData,
            sameAsClinic: value,
            personalPhone: prevData.clinicPhone,
            personalEmail: prevData.clinicEmail,
          };
        } else {
          setColor(false);
          return {
            ...prevData,
            sameAsClinic: value,
            personalPhone: "",
            personalEmail: "",
          };
        }
      }
      return { ...prevData, [name]: value };
    });
  };

  const fetchBusySlots = async (selectedDate) => {
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
        if (!response.ok) {
          console.error("Refresh Token Response:", data);
          throw new Error("Token refresh failed: " + JSON.stringify(data));
        }

        // setTokenManager((prev) => ({
        //   ...prev,
        //   accessToken: data.access_token,
        //   tokenExpiry: Date.now() + data.expires_in * 1000,
        // }));
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

        console.log("New Access Token:", data.access_token);
        return data.access_token;
      } catch (error) {
        console.error("Refresh Error:", error);
        toast.error("Failed to refresh token.");
        return null;
      }
    };

    const getValidAccessToken = async () => {
      if (!tokenManager.tokenExpiry || Date.now() >= tokenManager.tokenExpiry) {
        return await refreshAccessToken();
      }
      return tokenManager.accessToken;
    };

    const accessToken = await getValidAccessToken();
    if (!accessToken) return [];

    const calendarId = "primary";
    const timeMin = `${selectedDate}T00:00:00Z`;
    const timeMax = `${selectedDate}T23:59:59Z`;

    try {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeMin,
            timeMax,
            timeZone: "Asia/Kolkata",
            items: [{ id: calendarId }],
          }),
        }
      );

      const data = await response.json();
      if (data.error) {
        console.error("Google API Error:", data.error);
        return [];
      }
      return data.calendars[calendarId]?.busy || [];
    } catch (error) {
      console.error("Error fetching busy slots:", error);
      return [];
    }
  };

  const generateAvailableSlots = (busySlots, selectedDate) => {
    const workingHours = [
      "09:00 AM",
      "10:00 AM",
      "11:00 AM",
      "12:00 PM",
      "01:00 PM",
      "02:00 PM",
      "03:00 PM",
      "04:00 PM",
      "05:00 PM",
    ];

    const now = new Date();
    const dateString = now.toISOString().split("T")[0];

    let available = workingHours;

    const busyTimes = busySlots.map((slot) => ({
      start: new Date(slot.start).getHours(),
      end: new Date(slot.end).getHours(),
    }));

    available = available.filter((slot) => {
      const [hourStr, , period] = slot.split(/[: ]/);
      let slotHour = parseInt(hourStr, 10);
      if (period === "PM" && slotHour !== 12) slotHour += 12;
      if (period === "AM" && slotHour === 12) slotHour = 0;

      return !busyTimes.some(
        (busy) => slotHour >= busy.start && slotHour < busy.end
      );
    });

    if (dateString === selectedDate) {
      const CheckTime = now.getHours();
      const nextSlotIndex = available.findIndex((slot) => {
        const [hourStr, , period] = slot.split(/[: ]/);
        let slotHour = parseInt(hourStr, 10);
        if (period === "PM" && slotHour !== 12) slotHour += 12;
        if (period === "AM" && slotHour === 12) slotHour = 0;
        return slotHour > CheckTime;
      });

      const filteredSlots =
        nextSlotIndex !== -1 ? available.slice(nextSlotIndex) : [];
      console.log(filteredSlots, "filteredSlots");
      setAvailableSlots(filteredSlots);
    } else {
      setAvailableSlots(available);
    }
  };

  const handleDateChange = async (e) => {
    const selectedDate = e.target.value;
    setFormData({ ...formData, appointmentDate: selectedDate });
    const busySlots = await fetchBusySlots(selectedDate);
    generateAvailableSlots(busySlots, selectedDate);
  };

  return (
    <div className="max-w-lg mx-auto p-8 bg-white shadow-lg rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Submit Doctor Details
      </h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">Doctor Name</label>
          <input
            type="text"
            name="doctorName"
            placeholder="Name of the doctor"
            value={formData.doctorName}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">Clinic Phone</label>
          <input
            type="tel"
            name="clinicPhone"
            placeholder="Phone number of the clinic"
            value={formData.clinicPhone}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
            }}
            maxLength={10}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">Clinic Email</label>
          <input
            type="email"
            name="clinicEmail"
            placeholder="Email of the clinic"
            value={formData.clinicEmail}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Are personal details same as clinic?
          </label>
          <div className="flex items-center space-x-4">
            <label>
              <input
                type="radio"
                name="sameAsClinic"
                value="yes"
                checked={formData.sameAsClinic === "yes"}
                onChange={handleChange}
                className="mr-2"
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="sameAsClinic"
                value="no"
                checked={formData.sameAsClinic === "no"}
                onChange={handleChange}
                className="mr-2"
              />
              No
            </label>
          </div>
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">Personal Phone</label>
          <input
            type="tel"
            name="personalPhone"
            placeholder="Your personal phone number"
            value={formData.personalPhone}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 10 && /^\d*$/.test(value)) handleChange(e);
            }}
            maxLength={10}
            required
            className={`w-full border rounded px-3 py-2 ${
              color ? "bg-gray-200 text-gray-400" : ""
            }`}
            disabled={formData.sameAsClinic === "yes"}
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">Personal Email</label>
          <input
            type="email"
            name="personalEmail"
            placeholder="Your personal email"
            value={formData.personalEmail}
            onChange={handleChange}
            required
            className={`w-full border rounded px-3 py-2 ${
              color ? "bg-gray-200 text-gray-400" : ""
            }`}
            disabled={formData.sameAsClinic === "yes"}
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">Clinic Address</label>
          <textarea
            placeholder="Street, City, Country"
            name="clinicAddress"
            value={formData.clinicAddress}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">Clinic Availability</label>
          <input
            placeholder="Ex: Mon-Fri: 9am-5pm"
            type="text"
            name="clinicAvailability"
            value={formData.clinicAvailability}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Do you have a domain?
          </label>
          <div className="flex items-center space-x-4">
            <label>
              <input
                type="radio"
                name="domainOption"
                value="yes"
                checked={formData.domainOption === "yes"}
                onChange={handleChange}
                className="mr-2"
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="domainOption"
                value="no"
                checked={formData.domainOption === "no"}
                onChange={handleChange}
                className="mr-2"
              />
              No
            </label>
          </div>
        </div>

        {formData.domainOption === "yes" && (
          <div className="mb-4 text-left">
            <label className="block font-medium mb-1">Domain Name</label>
            <input
              placeholder="www.example.com"
              type="text"
              name="domainName"
              value={formData.domainName}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        )}

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Preferred Meeting Type
          </label>
          <select
            name="meetingType"
            value={formData.meetingType}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select Meeting Type</option>
            <option disabled value="WhatsApp">
              WhatsApp
            </option>
            <option value="Google Meet">Google Meet</option>
            <option disabled value="Zoom">
              Zoom
            </option>
          </select>
        </div>

        {formData.meetingType && (
          <div className="mb-4 text-left">
            <label className="block font-medium mb-1">
              {formData.meetingType === "WhatsApp"
                ? "WhatsApp Number For Meet Link"
                : "Email Address For Meet Link"}
            </label>
            <input
              type={formData.meetingType === "WhatsApp" ? "tel" : "email"}
              name="meetingContact"
              value={formData.meetingContact}
              placeholder={
                formData.meetingType === "WhatsApp"
                  ? "WhatsApp Number"
                  : "Email Id"
              }
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="text-left">
            <label>Date</label>
            <input
              type="date"
              name="appointmentDate"
              value={formData.appointmentDate}
              onChange={handleDateChange}
              required
              min={new Date().toISOString().split("T")[0]}
              max={
                new Date(new Date().setMonth(new Date().getMonth() + 5))
                  .toISOString()
                  .split("T")[0]
              }
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex flex-col">
            <label>Available Slots:</label>
            <select
              name="appointmentTime"
              value={formData.appointmentTime}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select a slot</option>
              {availableSlots.length > 0 ? (
                availableSlots.map((slot, index) => (
                  <option key={index} value={slot}>
                    {slot}
                  </option>
                ))
              ) : (
                <option>No slots available</option>
              )}
            </select>
          </div>
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Publications{" "}
            <span className="text-gray-400 italic text-sm">(optional)</span>
          </label>
          <textarea
            placeholder="Share your drive link"
            name="publications"
            value={formData.publications}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Articles{" "}
            <span className="text-gray-400 italic text-sm">(optional)</span>
          </label>
          <textarea
            placeholder="Share your drive link"
            name="articles"
            value={formData.articles}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Extra Notes{" "}
            <span className="text-gray-400 italic text-sm">(optional)</span>
          </label>
          <textarea
            placeholder="Share your drive link"
            name="extraNotes"
            value={formData.extraNotes}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? "Submitting..." : "Submit"}
        </button>
      </form>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
      />
      {/* <AiBot/>  */}
    </div>
  );
};

export default Dummy;