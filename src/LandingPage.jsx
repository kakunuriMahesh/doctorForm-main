import React from "react";
import DoctorForm from "../src/DoctorForm/DoctorForm"

const LandingPage = () => {
  return (
    <div className="bg-gray-100 min-h-screen font-sans">
      {/* Hero Section */}
      <header className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left animate-slide-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Book Your Doctor Appointment
            </h1>
            <p className="text-lg md:text-xl">
              Fast, secure, and easy scheduling with top professionals.
            </p>
          </div>
          <img
            src="https://images.unsplash.com/photo-1550832801-295dbea11b9e?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Doctor"
            className="w-full md:w-1/3 mt-6 md:mt-0 rounded-full shadow-lg animate-slide-right"
          />
        </div>
      </header>

      {/* Form Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-semibold text-center mb-8 animate-fade-in">
            Schedule Your Visit
          </h2>
          <div className="max-w-lg mx-auto animate-fade-in delay-1">
            <DoctorForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center animate-fade-in delay-2">
          <p>© 2025 Doctor Appointment Booking. All rights reserved.</p>
          <p>
            Contact:{" "}
            <a href="mailto:srcdesigns24@gmail.com" className="underline">
              srcdesigns24@gmail.com
            </a>
          </p>
        </div>
      </footer>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .animate-fade-in {
          animation: fadeIn 1s ease-in-out forwards;
        }

        .animate-slide-left {
          animation: slideInLeft 1s ease-in-out forwards;
        }

        .animate-slide-right {
          animation: slideInRight 1s ease-in-out forwards;
        }

        .delay-1 {
          animation-delay: 0.5s;
        }

        .delay-2 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;