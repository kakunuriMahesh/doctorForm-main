import React, { useState } from "react";
import DoctorForm from "../DoctorForm/DoctorForm";
import {
  Facebook,
  Twitter,
  Instagram,
  MapPin,
  Phone,
  Clock5,
  Send,
  MessageSquareText,
  Menu,
} from "lucide-react"; // Install lucide-react: npm install lucide-react
import doctorImg from "../assets/doctor.jpg";
import onlineMeet from "../assets/video-call.jpg";

import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Home = () => {
  const [viewOption, setViewOption] = useState(false);

  const settings = {
    dots: true, // Show dots for navigation
    infinite: true,
    speed: 500,
    slidesToShow: 1, // Show one card at a time
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: false, // Hide navigation buttons
    adaptiveHeight: true, // Adjust height dynamically
  };

  return (
    <div className="">
      {/* Navigation */}
      <nav className="flex h-fit md:h-[100px] justify-between items-center p-4 bg-[#E6F6FE] shadow-md rounded-lg m-3 relative">
        <h1 className="text-md md:text-2xl font-bold text-[#011632]">
          Dr. Suhasini
        </h1>

        <div className="flex items-center space-x-6">
          {/* Mobile Menu */}
          <ul
            className={`${
              viewOption
                ? "absolute right-0 top-[70px] bg-[#E6F6FE] rounded-md w-full flex flex-col items-center justify-center space-y-4 py-4 z-50"
                : "hidden"
            } md:flex md:flex-row items-center md:space-x-8 md:bg-transparent md:static text-white text-lg font-medium`}
          >
            <li>
              <a href="#home" className="text-[#011632] transition">
                Home
              </a>
            </li>
            <li>
              <a href="#about" className="text-[#011632] transition">
                About
              </a>
            </li>
            <li>
              <a href="#contact" className="text-[#011632] transition">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <button className="hidden md:block bg-[#1376F8] text-[#FFF] rounded-lg p-2 md:px-6 md:py-3 font-semibold">
          <a href="#book-appointment" className="text-[15px]">
            Book Appointment
          </a>
        </button>

        {/* Mobile Menu Button */}
        <button
          className="block md:hidden"
          onClick={() => setViewOption(!viewOption)}
        >
          <Menu className="w-8 h-8 text-[#011632]" />
        </button>
      </nav>

      {/* Home Banner Content with Image */}
      <section
        id="home"
        className="flex flex-col w-full md:flex-row items-center justify-center md:justify-between py-12 px-4 bg-[#FFF] md:h-[80vh]"
      >
        <div className="max-w-lg text-center md:text-left">
          <h2 className="text-xl md:text-4xl font-bold text-[#011632] mb-4">
            Get ready for your best ever Dental Experience!
          </h2>
          <p className=" text-sm md:text-lg text-[#3C4959] mb-6">
            Expert care, compassionate service. Book your appointment today and
            take the first step towards wellness.
          </p>
          <div className="flex md:justify-start justify-center">
            <a
              href="#book-appointment"
              className="inline-block text-[12px] md:text-[20px] bg-[#1376F8] text-white p-2 md:px-6 md:py-3 rounded-lg font-semibold"
            >
              Book Appointment
            </a>
            <a
              href="#book-appointment"
              className="flex items-center  text-[12px] md:text-[20px] ml-4 border text-[#1376F8] p-2 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              <Phone className="mr-4" size={18} /> Emergency
            </a>
          </div>
        </div>
        <div className="mt-8 md:mt-0 md:ml-10">
          <img
            src={doctorImg} // Replace with actual doctor-related image URL
            alt="Doctor Banner 690x670"
            className="rounded-lg shadow-lg max-w-full h-auto "
          />
        </div>
      </section>

      {/* Book Appointment Section */}
      <section className="py-16 px-4 ">
        <div className=" flex md:flex-row flex-col md:items-start justify-center items-center gap-3">
          <div className="md:order-2" id="book-appointment">
            <DoctorForm />
          </div>
          <div className="order-1 flex flex-col">
            <div className=" max-w-sm md:max-w-lg p-5">
              <div className="">
                <img src={onlineMeet} alt="onlineMeet" className="w-fit" />
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d950.0807726843784!2d83.32308892160653!3d17.72940934942777!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a394344d0f58c67%3A0x51369ec0d4f2546e!2sAUCE%20New%20Girls%20Hostel%20block%205!5e0!3m2!1sen!2sin!4v1742298646900!5m2!1sen!2sin"
                  width="100%"
                  height="fit"
                  // style="border:0;"
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <Slider {...settings}>
                {/* Office Timings */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <Clock5 size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px]">Office Timings</h2>
                    <p className="text-[12px] text-[#3C4959] ">
                      Monday - Saturday (9:00am to 5pm) Sunday (Closed)
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <Send size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px]">Email</h2>
                    <p className="text-[12px] text-[#3C4959] ">
                      Check@email.com
                    </p>
                  </div>
                </div>

                {/* Phone Number */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px]">Phone Number</h2>
                    <p className="text-[12px] text-[#3C4959] ">0900-78601</p>
                  </div>
                </div>

                {/* Message */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <MessageSquareText size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px]">Message</h2>
                    <p className="text-[12px] text-[#3C4959] ">+1-2064512559</p>
                  </div>
                </div>
              </Slider>
            </div>
          </div>
          {/* <div className="px-[10px] w-[fit]">
            <div className="">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d950.0807726843784!2d83.32308892160653!3d17.72940934942777!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a394344d0f58c67%3A0x51369ec0d4f2546e!2sAUCE%20New%20Girls%20Hostel%20block%205!5e0!3m2!1sen!2sin!4v1742298646900!5m2!1sen!2sin"
                width="100%"
                height="fit"
                // style="border:0;"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-[100%]">
              <div className="bg-[#1376F8] rounded-[50%] text-white p-2">
                <Clock5 size={20} />
              </div>
              <div>
                <h2 className="text-[18px]">Office Timings</h2>
                <p className="text-[12px] text-[#3C4959] ">
                  Monday - Saturday (9:00am to 5pm) Sunday (Closed)
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-[100%]">
              <div className="bg-[#1376F8] rounded-[50%] text-white p-2">
                <Send size={20} />
              </div>
              <div>
                <h2 className="text-[18px]">Email</h2>
                <p className="text-[12px] text-[#3C4959] ">Check@email.com</p>
              </div>
            </div>
            <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-[100%]">
              <div className="bg-[#1376F8] rounded-[50%] text-white p-2">
                <Phone size={20} />
              </div>
              <div>
                <h2 className="text-[18px]">Phone Number</h2>
                <p className="text-[12px] text-[#3C4959] ">0900-78601</p>
              </div>
            </div>
            <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-[100%]">
              <div className="bg-[#1376F8] rounded-[50%] text-white p-2">
                <MessageSquareText size={20} />
              </div>
              <div>
                <h2 className="text-[18px]">Message</h2>
                <p className="text-[12px] text-[#3C4959] ">+1-2064512559</p>
              </div>
            </div>
          </div> */}
        </div>
      </section>

      {/* Articals section */}
      {/* <section id="about" className="py-16 px-4 bg-white">
        <h2 className="text-xl md:text-3xl font-bold text-[#011632] mb-2">
          News & Articles
        </h2>
        <p className="mb-5">
          We use only the best quality materials on the market in order to
          provide the best products to our patients.
        </p>

        <div className=" flex flex-wrap">
          <div className=" flex flex-col justify-between bg-[#E6F6FE] p-4 rounded-lg m-2 md:w-[305px] w-[250px] md:h-[420px]">
            <img className="md:h-[230px]" src="" alt="image" />
            <button className="bg-[#1376F8] px-[5px] py-[3px] rounded text-[10px] md:text-[13px] text-white w-fit">
              Self Care
            </button>
            <p>Care of your Teeth</p>
            <p>Lorem ipsum dolor sit amet consectetur.</p>
            <p className="flex justify-end">~Anita Jackson</p>
          </div>
          <div className=" flex flex-col justify-between bg-[#E6F6FE] p-4 rounded-lg m-2 md:w-[305px] w-[250px] md:h-[420px]">
            <img className="md:h-[230px]" src="" alt="image" />
            <button className="bg-[#1376F8] px-[5px] py-[3px] rounded text-[10px] md:text-[13px] text-white w-fit">
              Self Care
            </button>
            <p>Care of your Teeth</p>
            <p>Lorem ipsum dolor sit amet consectetur.</p>
            <p className="flex justify-end">~Anita Jackson</p>
          </div>
          <div className=" flex flex-col justify-between bg-[#E6F6FE] p-4 rounded-lg m-2 md:w-[305px] w-[250px] md:h-[420px]">
            <img className="md:h-[230px]" src="" alt="image" />
            <button className="bg-[#1376F8] px-[5px] py-[3px] rounded text-[10px] md:text-[13px] text-white w-fit">
              Self Care
            </button>
            <p>Care of your Teeth</p>
            <p>Lorem ipsum dolor sit amet consectetur.</p>
            <p className="flex justify-end">~Anita Jackson</p>
          </div>
          
        </div>
      </section> */}

      {/* About Doctor and Services */}
      <section id="about" className="py-16 px-4 bg-white text-center">
        <h2 className="text-xl md:text-3xl font-bold text-[#011632] mb-8">
          About Dr. Suhasini Geetha Barla
        </h2>
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-lg text-gray-700 mb-4">
              Dr. Suhasini Geetha Barla is a board-certified Psychiatrist with
              over 15 years of experience, specializing in family medicine.
            </p>
            <p className="text-lg text-gray-700">
              Our services include routine check-ups, chronic disease
              management, and preventive care tailored to your needs.
            </p>
          </div>
          <div>
            <ul className="text-left text-lg text-gray-700 space-y-2">
              <li>✔ Comprehensive Health Assessments</li>
              <li>✔ Personalized Treatment Plans</li>
              <li>✔ Telemedicine Consultations</li>
              <li>✔ Emergency Care Support</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#E6F6FE] py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Navigation Links */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#home" className="text-[#011632] transition">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" className="text-[#011632] transition">
                  About
                </a>
              </li>
              <li>
                <a href="#contact" className="text-[#011632] transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact and Location */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
            <p className="flex justify-center md:justify-start items-center space-x-2">
              <MapPin size={20} /> <span>123 Health St, Wellness City</span>
            </p>
            <p>Email: care@dr-Suhasini.com</p>
            <p>Phone: (555) 123-4567</p>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Follow Us</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={24} className="text-[#011632] transition" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter size={24} className="text-[#011632] transition" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={24} className="text-[#011632] transition" />
              </a>
            </div>
          </div>
        </div>
        <div className="text-center mt-8 text-sm">
          <p>
            &copy; 2025 Dr. Suhasini. All rights reserved. Designed by{" "}
            <a
              href="https://srcdesigns.in"
              target="_blank"
              className="underline"
            >
              srcdesigns
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
