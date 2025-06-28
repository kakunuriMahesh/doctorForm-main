import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p>
        We value your privacy. All information collected through this website is used solely for the purpose of booking and managing your appointments with Dr. Suhasini. We do not share your personal information with third parties except as required by law or to facilitate your appointment.
      </p>
      <h2 className="text-lg font-semibold mt-4">Information We Collect</h2>
      <ul className="list-disc ml-6">
        <li>Name, contact number, and email address</li>
        <li>Appointment details</li>
        <li>Payment information (processed securely via Razorpay)</li>
      </ul>
      <h2 className="text-lg font-semibold mt-4">How We Use Your Information</h2>
      <ul className="list-disc ml-6">
        <li>To confirm and manage your appointments</li>
        <li>To send you appointment reminders and meeting links</li>
        <li>To process payments securely</li>
      </ul>
      <p className="mt-4">
        For any privacy-related concerns, please contact us at <a href="mailto:care@drsuhasini.com" className="text-blue-600 underline">care@drsuhasini.com</a>.
      </p>
    </div>
  );
} 