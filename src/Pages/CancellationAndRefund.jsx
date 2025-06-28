import React from "react";

export default function CancellationAndRefund() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Cancellation and Refund Policy</h1>
      <p>
        <strong>No Refunds:</strong> Once an appointment is booked and payment is made, no refunds will be issued under any circumstances.
      </p>
      <p className="mt-2">
        <strong>Rescheduling:</strong> If you are unable to attend your appointment, you may request to reschedule by contacting us at least 24 hours in advance. Rescheduling is subject to availability.
      </p>
      <p className="mt-4">
        For assistance, please contact us at <a href="mailto:care@drsuhasini.com" className="text-blue-600 underline">care@drsuhasini.com</a>.
      </p>
    </div>
  );
} 