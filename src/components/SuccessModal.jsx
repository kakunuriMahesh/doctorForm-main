import React, { useRef } from 'react';
import { X, Mail, Calendar, Clock, User, Phone, CheckCircle, Copy, Download, MapPin, Stethoscope, Building2, MessageSquare } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const SuccessModal = ({ isOpen, onClose, formData, completePaymentResponse, meetingLink }) => {
  if (!isOpen) return null;

  const contentRef = useRef();
  const isOffline = formData?.bookingMode === "offline";
  const isOnline = formData?.bookingMode === "online";

  const formatAmount = (amount) => {
    if (!amount) return 'N/A';
    return `₹${(amount / 100).toFixed(2)}`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadPDF = () => {
    if (!contentRef.current) return;
    html2pdf()
      .set({
        margin: 0.5,
        filename: 'Appointment-Details.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      })
      .from(contentRef.current)
      .save();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-gray-200 ${
          isOffline
            ? "bg-gradient-to-r from-green-50 to-emerald-50"
            : "bg-gradient-to-r from-green-50 to-blue-50"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isOffline ? "bg-green-100" : "bg-green-100"}`}>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Booking Confirmed</h2>
              <p className="text-sm text-gray-500">
                {isOffline ? "Offline Consultation" : "Online Consultation"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              className="text-white font-semibold flex items-center gap-2 bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition-colors"
              title="Download as PDF"
            >
              <Download className="w-6 h-6" />
              Download
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content to export */}
        <div ref={contentRef} className="p-6 space-y-6">
          {/* Success Message */}
          <div className={`border rounded-lg p-4 ${
            isOffline
              ? "bg-green-50 border-green-200"
              : "bg-green-50 border-green-200"
          }`}>
            <p className="text-green-800 font-medium">
              {isOffline
                ? "Your offline appointment at Asha Neuro Clinic has been confirmed. A confirmation email has been sent to your email address."
                : "Your online consultation has been booked successfully. The meeting link will be shared to your email address before the scheduled time."}
            </p>
          </div>

          {/* Consultation Type Badge */}
          <div className="flex items-center gap-2">
            {isOffline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                <Building2 className="w-4 h-4" />
                Offline - Asha Neuro Clinic
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                <MessageSquare className="w-4 h-4" />
                Online Consultation
              </span>
            )}
            {formData.serviceType && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                <Stethoscope className="w-4 h-4" />
                {formData.serviceType}
              </span>
            )}
          </div>

          {/* Patient Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Patient Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-800">
                    {formData.firstName} {formData.lastName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-800">{formData.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium text-gray-800">{formData.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Appointment Date</p>
                  <p className="font-medium text-gray-800">{formData.appointmentDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-500">Appointment Time</p>
                  <p className="font-medium text-gray-800">{formData.appointmentTime}</p>
                </div>
              </div>

              {formData.serviceType && (
                <div className="flex items-center gap-3">
                  <Stethoscope className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-500">Service Type</p>
                    <p className="font-medium text-gray-800">{formData.serviceType}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clinic Address (Offline only) */}
          {isOffline && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Clinic Information
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Asha Neuro Clinic</p>
                    <p className="text-sm text-green-700">Shop Number F - 21, Sreeman Rama Complex, Hyderabad</p>
                    <p className="text-xs text-green-600 mt-1">Please arrive 10 minutes before your scheduled time</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meeting Details (Online only) */}
          {isOnline && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Meeting Information
              </h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">Meeting Link</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-blue-800 break-all flex-1">
                        {meetingLink || 'Link will be sent to your email before the session'}
                      </p>
                      {meetingLink && (
                        <button
                          onClick={() => copyToClipboard(meetingLink)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Copy meeting link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Details (Online only) */}
          {isOnline && completePaymentResponse && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Payment Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 text-green-500 flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <p className="font-medium text-green-600">Success</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 text-green-500 flex items-center justify-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Paid</p>
                    <p className="font-medium text-gray-800">
                      {formatAmount(completePaymentResponse.amount)}
                    </p>
                  </div>
                </div>

                {completePaymentResponse.orderId && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-green-500 flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Order ID</p>
                      <p className="font-medium text-gray-800 text-sm">
                        {completePaymentResponse.orderId}
                      </p>
                    </div>
                  </div>
                )}

                {completePaymentResponse.paymentId && (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 text-green-500 flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment ID</p>
                      <p className="font-medium text-gray-800 text-sm">
                        {completePaymentResponse.paymentId}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No payment note for offline */}
          {isOffline && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-medium">💡 No payment is required for offline consultations.</p>
              <p className="text-xs text-blue-600 mt-1">Payment, if applicable, can be made at the clinic.</p>
            </div>
          )}

          {/* Additional Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {isOnline ? (
                <>
                  <li>• Please check your email for the meeting link</li>
                  <li>• Join the meeting 5 minutes before your scheduled time</li>
                  <li>• Each session duration is 45 minutes</li>
                  <li>• Keep your payment receipt for reference</li>
                  <li>• Contact us if you need to reschedule</li>
                </>
              ) : (
                <>
                  <li>• Please arrive at the clinic 10 minutes early</li>
                  <li>• Bring any previous medical records if applicable</li>
                  <li>• Each session duration is 45 minutes</li>
                  <li>• Contact us if you need to reschedule</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;