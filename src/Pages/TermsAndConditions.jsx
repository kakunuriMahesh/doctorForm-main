import React from "react";

export default function TermsAndConditions() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Terms and Conditions</h1>
      <p>
        By booking an appointment through this website, you agree to the following terms:
      </p>
      <ul className="list-disc ml-6 mt-2">
        <li>All appointments are subject to availability and confirmation.</li>
        <li>Payment is required to confirm your booking.</li>
        <li>Meeting links and appointment details will be sent to your provided email address.</li>
        <li>We reserve the right to reschedule or cancel appointments in case of emergencies or unforeseen circumstances.</li>
      </ul>
      <p className="mt-4">
        For any questions, please contact us at <a href="mailto:care@drsuhasini.com" className="text-blue-600 underline">care@drsuhasini.com</a>.
      </p>
    </div>
  );
} 