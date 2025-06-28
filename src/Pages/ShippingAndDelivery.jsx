import React from "react";

export default function ShippingAndDelivery() {
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Shipping and Delivery Policy</h1>
      <p>
        This website does not offer any physical products or shipping services. All services provided are online consultations and appointment bookings only.
      </p>
      <p className="mt-4">
        Upon successful booking and payment, you will receive an email with your appointment details and meeting link.
      </p>
      <p className="mt-4">
        For any queries, please contact us at <a href="mailto:care@drsuhasini.com" className="text-blue-600 underline">care@drsuhasini.com</a>.
      </p>
    </div>
  );
} 