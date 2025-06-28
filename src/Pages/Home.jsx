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
} from "lucide-react";
import doctorImg from "../assets/doctor.jpg";
import onlineMeet from "../assets/video-call.jpg";
import { MdOutlineManageAccounts } from "react-icons/md";
import { GiPsychicWaves,GiStrongMan } from "react-icons/gi";
import { SiCodementor } from "react-icons/si";
import { FaChevronDown } from "react-icons/fa";

import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import testimonials from "../data";
import UnderLine from "../assets/UnderLine.svg";

const Home = () => {
  const [viewOption, setViewOption] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const filteredTestimonials =
    activeTab === "All"
      ? testimonials
      : testimonials.filter((t) => t.category === activeTab);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: false,
    adaptiveHeight: true,
  };

  const [showNavbar, setShowNavbar] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);
  const [scrollDir, setScrollDir] = useState("up");
  const [scrollPos, setScrollPos] = useState(0);
  const [atTop, setAtTop] = useState(true);

  // FAQ state for open/close
  const [openFAQ, setOpenFAQ] = useState(null);
  const faqData = [
    {
      question: "What conditions does Dr. Suhasini Geetha Barla treat?",
      answer:
        "She treats a wide range of psychiatric conditions including depression, anxiety, dementia, and behavioral issues.",
    },
    {
      question: "Do I need a referral to book an appointment?",
      answer: "No, you can book an appointment directly without a referral.",
    },
    {
      question: "Are online consultations available?",
      answer:
        "Yes, online consultations are available. Please use the Book Appointment button to schedule.",
    },
    {
      question: "What is the clinic's approach to patient privacy?",
      answer:
        "Patient privacy and confidentiality are strictly maintained at all times.",
    },
  ];

  React.useEffect(() => {
    let lastScroll = window.scrollY;

    const handleScroll = () => {
      const currentScroll = window.scrollY;

      setScrollDir(currentScroll > lastScroll ? "down" : "up");
      setScrollPos(currentScroll);
      setAtTop(currentScroll <= 10); // near top

      lastScroll = currentScroll;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const disorders = [
    {
      img: "https://www.bestpsychiatristindelhi.com/blog/wp-content/uploads/2021/03/Ways-to-Overcome-Depression-Naturally.jpg",
      tag: "Depression",
      title: "Overcoming Depression",
      desc: "Therapy, support, and lifestyle changes can help you regain joy.",
      author: "~Dr. Suhasini"
    },
    {
      img: "https://calendar.duke.edu/images//2025/20250523/7b077561727abb821f29dd23d0ef11ec-CR-PAS%20Flyer%20Let%20Your%20Mind%20Breathe%202025_20250505104605PM.png",
      tag: "Anxiety",
      title: "Managing Anxiety",
      desc: "Mindfulness and counseling are key to calming anxious thoughts.",
      author: "~Dr. Suhasini"
    },
    {
      img: "https://www.zamplo.org/hubfs/Featured%20Image%20Website%20%26%20Landing%20Pages-Jul-19-2023-09-32-37-9921-PM.png",
      tag: "OCD",
      title: "Living with OCD",
      desc: "CBT and support groups empower you to break free from compulsions.",
      author: "~Clinic Team"
    },
    {
      img: "https://resilient-mind.com/wp-content/uploads/2024/02/Treatment-for-Bipolar-Disorder.jpg",
      tag: "Bipolar Disorder",
      title: "Balancing Bipolar Disorder",
      desc: "Medication and therapy help stabilize mood swings for a better life.",
      author: "~Dr. Suhasini"
    },
    {
      img: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
      tag: "PTSD",
      title: "Healing from PTSD",
      desc: "Trauma-focused therapy can restore peace and confidence.",
      author: "~Clinic Team"
    },
    {
      img: "https://cdn2.psychologytoday.com/assets/styles/manual_crop_4_3_1200x900/public/field_blog_entry_images/2024-05/dim-hou-2P6Q7_uiDr0-unsplash.jpg?itok=vUT_7-J8",
      tag: "Schizophrenia",
      title: "Hope with Schizophrenia",
      desc: "Early intervention and medication support long-term recovery.",
      author: "~Dr. Suhasini"
    },
    {
      img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
      tag: "Dementia",
      title: "Caring for Dementia",
      desc: "Routine, support, and medication improve quality of life.",
      author: "~Clinic Team"
    },
    {
      img: "https://www.recoverykeys.org/wp-content/themes/recovery-keys/images/post-no-img.jpg",
      tag: "Addiction",
      title: "Breaking Addiction",
      desc: "Rehabilitation and counseling pave the way to recovery.",
      author: "~Dr. Suhasini"
    }
  ];

  return (
    <div className="overflow-hidden">
      {/* Navigation */}
      <div className="w-full max-w-6xl mx-auto p-1">

      <nav
          // ${!atTop && scrollDir === "down" ? "opacity-0 -translate-y-10 pointer-events-none" : "opacity-100 translate-y-0"}
        className={`
          w-full max-w-6xl fixed mx-auto z-40 transition-all duration-500
          bg-[#E6F6FE] shadow-md rounded-lg
          flex h-fit  justify-between items-center p-4
        `}
        style={{
          willChange: "transform, opacity",
        }}
      >
        <h1 className="text-md md:text-2xl font-bold text-[#011632]">Dr. Suhasini</h1>
        <div className="flex items-center space-x-6">
          <ul className={`${viewOption ? "absolute right-0 top-[70px] bg-[#E6F6FE] rounded-md w-full flex flex-col items-center justify-center space-y-4 z-50" : "hidden"} md:flex md:flex-row items-center md:space-x-8 md:bg-transparent md:static text-white text-lg font-medium`}>
            <li><a href="#home" className="text-[#011632] transition hover:text-blue-500">Home</a></li>
            <li><a href="#about" className="text-[#011632] transition hover:text-blue-500">About</a></li>
            <li><a href="#services" className="text-[#011632] transition hover:text-blue-500">Services</a></li>
            <li><a href="#stories" className="text-[#011632] transition hover:text-blue-500">Stories</a></li>
            <li><a href="#contact" className="text-[#011632] transition hover:text-blue-500">Contact</a></li>
          </ul>
        </div>
        <button className="hidden md:block bg-[#1376F8] text-[#FFF] rounded-lg p-2 md:px-6 md:py-3 font-semibold hover:bg-blue-600 transition">
          <a href="#book-appointment" className="text-[15px]">Book Appointment</a>
        </button>
        <button className="block md:hidden" onClick={() => setViewOption(!viewOption)} aria-label="Toggle mobile menu">
          <Menu className="w-8 h-8 text-[#011632]" />
        </button>
      </nav>
      </div>

      {/* Hero Section */}
      <section id="home" className="flex flex-col w-full md:flex-row items-center justify-center md:justify-between py-12 px-4 bg-[#FFF] max-w-6xl mx-auto mt-10 md:mt-[100px]">
        <div className="max-w-lg text-center md:text-left md:pr-8">
          <h2 className="text-xl md:text-4xl font-bold text-[#011632]">Compassionate Psychiatric Care for </h2>
          <h2 className="text-xl md:text-4xl font-bold text-[#011632]"><span>Your Wellbeing</span></h2>
          <div className="flex justify-center md:justify-start mb-8">
            <img src={UnderLine} alt="Underline" className="w-32 md:w-48" />
          </div>
          <p className="text-sm md:text-lg text-[#3C4959] mb-6">Dr. Suhasini Geetha Barla, MBBS, DPM<br/>Consultant Psychiatrist at Asha Neuromodulation Clinic, Dilsukhnagar</p>
          <div className="flex md:justify-start justify-center space-x-4">
            <a href="#book-appointment" className="inline-block text-[12px] md:text-[20px] bg-[#1376F8] text-white p-2 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-blue-600 transition">Book Appointment</a>
            <a href="https://maps.google.com/?q=Metro Piller Number 1556, G24 & F21, Sreeman Rama Complex, Next to Swagath Hotel, Dilsukhnagar, Hyderabad" target="_blank" rel="noopener noreferrer" className="inline-block text-[12px] md:text-[20px] border border-[#1376F8] text-[#1376F8] p-2 md:px-6 md:py-3 rounded-lg font-semibold hover:bg-gray-100 transition">Location</a>
          </div>
        </div>
        <div className="mt-8 md:mt-0 md:ml-10 flex-shrink-0">
          <img src={doctorImg} alt="Doctor Banner" className="rounded-lg shadow-lg w-full h-auto max-w-md md:max-w-lg lg:max-w-xl object-cover" />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 px-4 bg-white text-center max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-bold text-[#011632] text-center">
          About <span className="">Dr. Suhasini Geetha Barla</span>
        </h2>
        <div className="flex justify-center mb-8">
          <img src={UnderLine} alt="Underline" className="w-32 md:w-48" />
        </div>
        <div>
          <p className="text-lg text-gray-700 mb-4">Dr. Suhasini Geetha Barla is a highly qualified psychiatrist with an MBBS from Alluri Sitaram Raju Academy of Medical Sciences (2009) and a DPM from Guntur Medical College (2013). She has extensive experience in adult and geriatric psychiatry, and is known for her empathetic approach and evidence-based treatments. Dr. Barla has worked in both clinical and academic settings, and is passionate about mental health awareness, patient education, and holistic care. She regularly participates in mental health workshops and community outreach programs, and is dedicated to helping individuals achieve emotional well-being and resilience. Her areas of expertise include mood disorders, anxiety, dementia, and behavioral interventions.</p>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-6 px-4 max-w-4xl mx-auto mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-[#011632] text-center">Services</h2>
        <div className="flex justify-center mb-4">
          <img src={UnderLine} alt="Underline" className="w-24 md:w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-[#E6F6FE] rounded-lg p-6 shadow flex flex-col items-center text-center">
            {/* Yoga icon */}
            {/* <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 text-blue-500" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="7" r="3"/><path d="M12 10v4m0 0l-2 2m2-2l2 2m-2-2v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> */}
            <GiPsychicWaves className="mb-2 text-white bg-[#1376F8] rounded-full p-2" size={42} />
            <h3 className="font-semibold text-lg mb-1">Psychiatry Consultation and Treatment</h3>
            <p>Comprehensive psychiatric evaluation, diagnosis, and treatment planning for mental health concerns.</p>
          </div>
          <div className="bg-[#E6F6FE] rounded-lg p-6 shadow flex flex-col items-center text-center">
            {/* Meditation icon */}
            {/* <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 text-blue-500" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="7" r="3"/><path d="M5 21c1-4 6-4 7-4s6 0 7 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> */}
            <MdOutlineManageAccounts className="mb-2 text-white bg-[#1376F8] rounded-full p-2" size={42}/>
            <h3 className="font-semibold text-lg mb-1">Management of Depression in Adults</h3>
            <p>Personalized care and evidence-based therapies for adults experiencing depression.</p>
          </div>
          <div className="bg-[#E6F6FE] rounded-lg p-6 shadow flex flex-col items-center text-center">
            {/* Refresh/energy icon */}
            {/* <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 text-blue-500" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 4v5h.582M20 20v-5h-.581M5.635 19.364A9 9 0 1 1 19.364 5.636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> */}
            <SiCodementor className="mb-2 text-white bg-[#1376F8] rounded-full p-2" size={42} />
            <h3 className="font-semibold text-lg mb-1">Dementia Management</h3>
            <p>Support and management for patients and families dealing with dementia and memory disorders.</p>
          </div>
          <div className="bg-[#E6F6FE] rounded-lg p-6 shadow flex flex-col items-center text-center">
            {/* Group/connection icon */}
            {/* <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 text-blue-500" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="7" r="3"/><path d="M17 21v-2a4 4 0 0 0-8 0v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> */}
            <GiStrongMan className="mb-2 text-white bg-[#1376F8] rounded-full p-2" size={42} />
            <h3 className="font-semibold text-lg mb-1">Anger Management</h3>
            <p>Therapeutic interventions to help manage anger and improve emotional regulation.</p>
          </div>
        </div>
      </section>

      {/* Book Appointment Section (original, unchanged) */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="flex md:flex-row flex-col md:items-start justify-center items-center gap-8">
          <div className="md:order-2 w-full md:w-1/2" id="book-appointment">
            <DoctorForm />
          </div>
          <div className="order-1 flex flex-col w-full md:w-1/2">
            <div className="w-full mb-8">
              <img src={onlineMeet} alt="onlineMeet" className="w-full mb-4 rounded-lg shadow-md" />
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3807.575086812845!2d78.5306644747761!3d17.3879201021469!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcba3ff605e54d3%3A0x6b8f3a3a4c4e7c7a!2sChaitanyapuri%2C%20Hyderabad%2C%20Telangana%20500035%2C%20India!5e0!3m2!1sen!2sus!4v1718688461502!5m2!1sen!2sus" width="100%" height="300" allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="rounded-lg shadow-md"></iframe>
            </div>
            <div className="w-full">
              <Slider {...settings}>
                {/* Office Timings */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <Clock5 size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#011632]">Office Timings</h2>
                    <p className="text-[12px] text-[#3C4959] ">Monday - Saturday (9:00am to 5pm) Sunday (Closed)</p>
                  </div>
                </div>
                {/* Email */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <Send size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#011632]">Email</h2>
                    <p className="text-[12px] text-[#3C4959] "><a href="mailto:Check@email.com" className="hover:underline">Check@email.com</a></p>
                  </div>
                </div>
                {/* Phone Number */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <Phone size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#011632]">Phone Number</h2>
                    <p className="text-[12px] text-[#3C4959] "><a href="tel:0900-78601" className="hover:underline">0900-78601</a></p>
                  </div>
                </div>
                {/* Message */}
                <div className="flex gap-3 items-center shadow-xl drop-shadow-xl rounded-lg p-5 w-full bg-white">
                  <div className="bg-[#1376F8] rounded-[50%] text-white p-2 w-fit">
                    <MessageSquareText size={20} />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-semibold text-[#011632]">Message</h2>
                    <p className="text-[12px] text-[#3C4959] "><a href="https://wa.me/+12064512559" target="_blank" rel="noopener noreferrer" className="hover:underline">+1-2064512559</a></p>
                  </div>
                </div>
              </Slider>
            </div>
          </div>
        </div>
      </section>

      {/* Stories/Testimonials Section with improved scroll and card sizing */}
      <section id="stories" className="py-16 px-4 max-w-6xl mx-auto">
        <h2 className="text-xl md:text-3xl font-bold text-[#011632]">Stories</h2>
        <div className="flex justify-start mb-4">
          <img src={UnderLine} alt="Underline" className="w-24 md:w-32" />
        </div>
        <div className="flex gap-2 mb-6 flex-wrap">
          {['All', 'General', 'OCD'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md text-sm md:text-[14px] p-2 px-4 ${activeTab === tab ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'} hover:bg-blue-600 hover:text-white transition-colors duration-200`}
            >
              {tab} {activeTab === tab ? `(${filteredTestimonials.length})` : ''}
            </button>
          ))}
        </div>
        {/* Responsive scroll logic */}
        {filteredTestimonials.length < 3 ? (
          // Less than 3: manual scroll only
          <div className="flex overflow-x-auto gap-5 pb-4 flex-nowrap items-stretch sm:justify-start min-h-[200px]">
            {filteredTestimonials.length > 0 ? (
              filteredTestimonials.map((t, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 min-w-[320px] max-w-[320px]  border p-4 rounded-md shadow-md bg-white flex flex-col justify-between overflow-hidden"
                >
                  <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">{t.feedback.charAt(0).toUpperCase()}</span>
                    </div>
                    <h3 className="font-semibold text-lg truncate max-w-[180px]">{t.name}</h3>
                  </div>
                  <p className="text-gray-600 text-base break-words whitespace-normal">{t.feedback}</p>
                  </div>
                  <a href={t.source} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors">View on Google</a>
                </div>
              ))
            ) : (
              <div className="w-full flex justify-center items-center min-h-[180px] text-gray-500">No Stories available for this category.</div>
            )}
          </div>
        ) : (
          // 3 or more: auto-scroll (marquee) + manual scroll
          <div
            className="relative overflow-x-auto group "
            tabIndex={0}
            onMouseEnter={e => { const el = e.currentTarget.querySelector('.marquee'); if (el) el.style.animationPlayState = 'paused'; }}
            onMouseLeave={e => { const el = e.currentTarget.querySelector('.marquee'); if (el) el.style.animationPlayState = 'running'; }}
            onTouchStart={e => { const el = e.currentTarget.querySelector('.marquee'); if (el) el.style.animationPlayState = 'paused'; }}
            onTouchEnd={e => { const el = e.currentTarget.querySelector('.marquee'); if (el) el.style.animationPlayState = 'running'; }}
          >
            <div className="flex gap-5 flex-nowrap items-stretch whitespace-nowrap marquee" style={{animation: 'marquee 30s linear infinite'}}>
              {filteredTestimonials.concat(filteredTestimonials).map((t, index) => (
                <div
                  key={index}
                  className="inline-block min-w-[320px] max-w-[320px] border p-4 rounded-md shadow-md bg-white align-top mx-2 flex flex-col justify-between items-start overflow-hidden"
                >
                  <div>
                  <div className="flex items-center gap-3 mb-2">
                    {/* <img src={doctorImg} alt="Patient" className="w-10 h-10 rounded-full object-cover border" /> */}
                    <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">{t.feedback.charAt(0).toUpperCase()}</span>
                    </div>
                    <h3 className="font-semibold text-lg truncate max-w-[180px]">{t.name}</h3>
                  </div>
                  <p className="text-gray-600 text-base break-words whitespace-normal">{t.feedback}</p>
                  </div>
                  <a href={t.source} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors">View on Google</a>
                </div>
              ))}
            </div>
            <style>{`
              @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
            `}</style>
          </div>
        )}
      </section>

      {/* Patient Reviews Section with carousel */}
      {/* <section className="py-6 px-4 max-w-4xl mx-auto mb-6">
        <h2 className="text-xl font-bold text-[#011632]  text-center">Patient Reviews</h2>
        <div className="flex justify-center mb-8">
          <img src={UnderLine} alt="Underline" className="w-32 md:w-48" />
        </div>
        <div className="bg-[#F8FAFC] rounded-lg p-6 shadow text-center">
          <Slider {...settings}>
            <div>
              <p className="text-gray-700 italic mb-2">"Dr. Barla is very understanding and helped me manage my anxiety. Highly recommended!"</p>
              <span className="font-semibold">- Priya S.</span>
            </div>
            <div>
              <p className="text-gray-700 italic mb-2">"She listens patiently and provides practical solutions. I felt comfortable throughout my sessions."</p>
              <span className="font-semibold">- Ramesh K.</span>
            </div>
            <div>
              <p className="text-gray-700 italic mb-2">"Professional and empathetic. My family is grateful for her support during a tough time."</p>
              <span className="font-semibold">- Anjali M.</span>
            </div>
          </Slider>
        </div>
      </section> */}

      {/* News & Articles Section */}
      <section className="py-12 px-4 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#011632] mb-2">
              News & Articles
            </h2>
            <div className="flex justify-start mb-4">
              <img src={UnderLine} alt="Underline" className="w-24 md:w-32" />
            </div>
            <p className="text-gray-500 max-w-xl text-base md:text-lg">
              Stay updated with the latest in psychiatric care, mental health tips, and clinic news.
            </p>
          </div>
          <button className="self-start md:self-center bg-[#1376F8] text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition text-base md:text-lg">
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {disorders.map((article, idx) => (
            <div key={idx} className="bg-[#F8FAFC] rounded-xl shadow p-3 flex flex-col hover:shadow-lg transition-shadow border border-[#e6f6fe]">
              <img src={article.img} alt={article.title} className="rounded-lg w-full h-40 object-cover mb-3" />
              <span className="inline-block bg-[#011632] text-white text-xs font-semibold px-3 py-1 rounded mb-2 w-fit">{article.tag}</span>
              <h3 className="font-bold text-lg text-[#011632] mb-1">{article.title}</h3>
              <p className="text-gray-600 text-sm mb-2 flex-1">{article.desc}</p>
              <div className="text-right text-xs text-gray-500 font-medium">{article.author}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section with sample FAQs in accordion style */}
      <section className="py-6 px-4 max-w-4xl mx-auto mb-6">
        <h2 className="text-xl font-bold text-[#011632] text-center">Frequently Asked Questions</h2>
        <div className="flex justify-center mb-8">
          <img src={UnderLine} alt="Underline" className="w-32 md:w-48" />
        </div>
        <div className="space-y-4">
          {faqData.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[#F8FAFC] rounded-lg shadow transition-all duration-300 overflow-hidden border border-gray-200"
            >
              <button
                className="w-full flex justify-between items-center px-6 py-4 focus:outline-none font-semibold text-left text-[#011632] text-base md:text-lg hover:bg-[#e6f6fe] transition-colors"
                onClick={() => setOpenFAQ(openFAQ === idx ? null : idx)}
                aria-expanded={openFAQ === idx}
                aria-controls={`faq-content-${idx}`}
              >
                <span>{faq.question}</span>
                <FaChevronDown
                  className={`ml-4 text-blue-500 transition-transform duration-300 ${openFAQ === idx ? "rotate-180" : "rotate-0"}`}
                  size={20}
                />
              </button>
              <div
                id={`faq-content-${idx}`}
                className="transition-all duration-300 px-6"
                style={{
                  maxHeight: openFAQ === idx ? '200px' : '0px',
                  opacity: openFAQ === idx ? 1 : 0,
                  paddingBottom: openFAQ === idx ? '16px' : '0px',
                  pointerEvents: openFAQ === idx ? 'auto' : 'none',
                }}
              >
                <p className="text-gray-700 text-base mt-2">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#E6F6FE] py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#home" className="text-[#011632] transition hover:text-blue-500">Home</a></li>
              <li><a href="#about" className="text-[#011632] transition hover:text-blue-500">About</a></li>
              <li><a href="#services" className="text-[#011632] transition hover:text-blue-500">Services</a></li>
              <li><a href="#stories" className="text-[#011632] transition hover:text-blue-500">Stories</a></li>
              <li><a href="#contact" className="text-[#011632] transition hover:text-blue-500">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
            <p className="flex justify-center md:justify-start items-center space-x-2 mb-2"><MapPin size={20} /><span>Shop Number F - 21, Sreeman Rama Complex, Hyderabad</span></p>
            <p className="mb-2">Email: <a href="mailto:care@dr-Suhasini.com" className="hover:underline">care@dr-Suhasini.com</a></p>
            <p>Phone: <a href="tel:+915551234567" className="hover:underline">(555) 123-4567</a></p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Follow Us</h3>
            <div className="flex justify-center md:justify-start space-x-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={24} className="text-[#011632] transition hover:text-blue-600" /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter"><Twitter size={24} className="text-[#011632] transition hover:text-blue-400" /></a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={24} className="text-[#011632] transition hover:text-pink-500" /></a>
            </div>
          </div>
        </div>
        <div className="text-center mt-8 text-sm">
          <p>© 2025 Dr. Suhasini. All rights reserved. Designed by <a href="https://srcdesigns.in" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">srcdesigns</a></p>
          <div className="flex justify-center md:justify-center space-x-4 mt-4">  
            <a href="/privacy-policy" className="text-[#011632] transition hover:text-blue-500">Privacy Policy</a>
                <a href="/terms-and-conditions" className="text-[#011632] transition hover:text-blue-500">Terms and Conditions</a>
                <a href="/cancellation-and-refund" className="text-[#011632] transition hover:text-blue-500">Cancellation and Refund</a>
                <a href="/shipping-and-delivery" className="text-[#011632] transition hover:text-blue-500">Shipping and Delivery</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;



