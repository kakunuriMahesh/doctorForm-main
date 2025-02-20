import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import { generateMeetingLink } from "./generateMeetingLink ";
import "react-toastify/dist/ReactToastify.css";

const DoctorForm = () => {
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
    meetingType: "", // WhatsApp, Google Meet, Zoom
    meetingContact: "", // Phone for WhatsApp, Email for Meet/Zoom
  });

  const [isLoading, setIsLoading] = useState(false);
  const [color, setColor] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const res = await generateMeetingLink(
        formData.meetingType,
        formData.personalEmail,
        formData.personalPhone
      );
      console.log(res);
      toast.success("Meeting link sent successfully!");
    } catch (error) {
      toast.error("Error sending meeting link.");
    }

    

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

      const jsonResponse = await response.json();

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
        });
      } else {
        throw new Error("Failed to submit the form");
      }
    } catch (error) {
      toast.error("Error submitting the form. Please try again.");
    } finally {
      setIsLoading(false);
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
      } else if (name === "meetingType") {
        return {
          ...prevData,
          meetingType: value,
        };
      }
      return { ...prevData, [name]: value };
    });
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
            type="number"
            name="clinicPhone"
            placeholder="Phone number of the clinic"
            value={formData.clinicPhone}
            onChange={handleChange}
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

        {/*  */}

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
            type="text"
            name="personalPhone"
            placeholder="Your personal phone number"
            value={formData.personalPhone}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 10 && /^\d*$/.test(value)) {
                handleChange(e);
              }
            }}
            maxLength={10}
            required
            className={`w-full border rounded px-3 py-2 ${
              color
                ? "bg-gray-200 outline-gray-400 border-2 border-gray-200 text-gray-400"
                : ""
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
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 10 && /^\d*$/.test(value)) {
                handleChange(e);
              }
            }}
            maxLength={10}
            required
            className={`w-full border rounded px-3 py-2 ${
              color
                ? "bg-gray-200 outline-gray-400 border-2 border-gray-200 text-gray-400"
                : ""
            }`}
            disabled={formData.sameAsClinic === "yes"}
          />
        </div>

        {/*  */}

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
          <div className="mb-4 text-left text-left">
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

        {/* Meet */}
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
            <option value="WhatsApp">WhatsApp</option>
            <option value="Google Meet">Google Meet</option>
            <option value="Zoom">Zoom</option>
          </select>
        </div>

        {/* Dynamic Contact Field */}
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

        


        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Publications
            <span className=" text-gray-400 italic text-sm"> (optional)</span>
          </label>
          <textarea
            placeholder="share your drive link"
            name="publications"
            value={formData.publications}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left text-left">
          <label className="block font-medium mb-1">
            Articles
            <span className=" text-gray-400 italic text-sm"> (optional)</span>
          </label>
          <textarea
            placeholder="share your drive link"
            name="articles"
            value={formData.articles}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4 text-left">
          <label className="block font-medium mb-1">
            Extra Notes
            <span className=" text-gray-400 italic text-sm"> (optional)</span>
          </label>
          <textarea
            placeholder="share your drive link"
            name="extraNotes"
            value={formData.extraNotes}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
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
    </div>
  );
};

export default DoctorForm;
