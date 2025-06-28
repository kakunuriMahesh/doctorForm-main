import emailjs from "emailjs-com";

const doctorEmail = "srcdesigns24@gmail.com";
const doctorPhone = "9087654321";

const serviceId = "service_grfmcgg";
const templateId = "template_7meqepu";
const userId = "I3FrnElOF94OEwk9Z";

const generateMeetingLink = async (
  meetingType,
  patientEmail,
  appointmentDate,
  appointmentTime,
  accessToken
) => {
  console.log("generateMeetingLink inputs:", {
    meetingType,
    patientEmail,
    appointmentDate,
    appointmentTime,
    accessToken: accessToken ? "Provided" : "Missing",
  });

  let meetingLink = "";

  if (meetingType === "Google Meet") {
    meetingLink = await generateGoogleMeetLink(
      appointmentDate,
      appointmentTime,
      accessToken
    );
    console.log(meetingLink, "Google Meet Condition");
    if (meetingLink !== "Error generating Google Meet link!") {
      try {
        await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink, appointmentDate, appointmentTime });
      } catch (emailError) {
        console.error("Failed to send email, proceeding with link:", emailError);
        // Continue even if email fails
      }
    }
  } else if (meetingType === "Zoom") {
    meetingLink = generateZoomLink();
    try {
      await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink, appointmentDate, appointmentTime });
    } catch (emailError) {
      console.error("Failed to send email, proceeding with link:", emailError);
    }
  } else if (meetingType === "WhatsApp") {
    meetingLink = generateWhatsAppLink(doctorPhone);
    await sendWhatsAppMessage({
      doctorPhone,
      patientPhone: patientEmail,
      meetingLink,
    });
  }
  console.log(meetingLink, "generated link");
  return meetingLink;
};

const generateGoogleMeetLink = async (date, appointmentTime, accessToken) => {
  try {
    if (!date || !appointmentTime || !accessToken) {
      throw new Error("Date, appointment time, and access token are required.");
    }

    console.log("generateGoogleMeetLink inputs:", { date, appointmentTime, accessToken });

    // Split and normalize the time range (e.g., "9:00 - 9:45" to "09:00" and "09:45")
    const [startTimeStr, endTimeStr] = appointmentTime.split(" - ");
    if (!startTimeStr || !endTimeStr) {
      throw new Error(`Invalid time format: ${appointmentTime}. Expected format: HH:mm - HH:mm`);
    }

    // Pad hours with leading zeros (e.g., "9:00" -> "09:00")
    const padTime = (timeStr) => {
      const [hours, minutes] = timeStr.split(":");
      return `${hours.padStart(2, "0")}:${minutes}`;
    };

    const formattedStartTime = padTime(startTimeStr.trim());
    const formattedEndTime = padTime(endTimeStr.trim());

    // Create Date objects with Asia/Kolkata timezone offset
    const startTime = new Date(`${date}T${formattedStartTime}:00+05:30`);
    const endTime = new Date(`${date}T${formattedEndTime}:00+05:30`);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error(`Invalid date/time format: ${date} ${formattedStartTime} - ${formattedEndTime}`);
    }

    console.log("Formatted Start Time:", startTime.toISOString());
    console.log("Formatted End Time:", endTime.toISOString());

    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: "Doctor Appointment",
          start: {
            dateTime: startTime.toISOString(),
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: endTime.toISOString(),
            timeZone: "Asia/Kolkata",
          },
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );
    console.log(response, "response from google meet link");

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to create Meet link");
    }

    return (
      data.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video"
      )?.uri || "Failed to generate Google Meet link"
    );
  } catch (error) {
    console.error("Error generating Google Meet link:", error.message);
    return "Error generating Google Meet link!";
  }
};

const generateZoomLink = () => "https://zoom.us/j/123456789"; // Replace with real Zoom logic
const generateWhatsAppLink = (phone) => `https://wa.me/${phone}`;

const sendEmail = async ({ doctorEmail, userEmail, meetingLink, appointmentDate, appointmentTime }) => {
  try {
    console.log("Sending emails with params:", { doctorEmail, userEmail, meetingLink, appointmentDate, appointmentTime });

    // Send email to the patient
    const patientResponse = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: userEmail, // Patient's email
        doctor_email: doctorEmail,
        user_email: userEmail,
        message: `
Hello,

Your appointment is confirmed!

Meeting Link: ${meetingLink}
Date: ${appointmentDate}
Time: ${appointmentTime}

You can add this event to your calendar:
https://www.google.com/calendar/render?action=TEMPLATE&text=Doctor+Appointment&dates=${appointmentDate.replace(/-/g, '')}T${appointmentTime.split(' - ')[0].replace(':', '')}00Z/${appointmentDate.replace(/-/g, '')}T${appointmentTime.split(' - ')[1].replace(':', '')}00Z&details=Join+the+meeting+at:+${encodeURIComponent(meetingLink)}

Thank you!
        `,
      },
      userId
    );
    console.log("Patient email response:", patientResponse);

    // Send email to the doctor
    const doctorResponse = await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: doctorEmail, // Doctor's email
        doctor_email: doctorEmail,
        user_email: userEmail,
        message: `
        Hello Doctor,

A patient has successfully booked an appointment. Here are the details:

Meeting Link: ${meetingLink}
Date: ${appointmentDate}
Time: ${appointmentTime}

Please use the above link to join the consultation at the scheduled time.


Thank you!
`,
},
userId
);
console.log("Doctor email response:", doctorResponse);

// You can add this event to your calendar:
// https://www.google.com/calendar/render?action=TEMPLATE&text=Doctor+Appointment&dates=${appointmentDate.replace(/-/g, '')}T${appointmentTime.split(' - ')[0].replace(':', '')}00Z/${appointmentDate.replace(/-/g, '')}T${appointmentTime.split(' - ')[1].replace(':', '')}00Z&details=Join+the+meeting+at:+${encodeURIComponent(meetingLink)}

return { patientResponse, doctorResponse };
  } catch (error) {
    console.error("EmailJS error:", error);
    throw error;
  }
};

const sendWhatsAppMessage = async ({ doctorPhone, patientPhone, meetingLink }) => {
  console.log("Sending WhatsApp:", { doctorPhone, patientPhone, meetingLink });
};

export { generateMeetingLink };

// TODO: getting error while generating meetinglink because of date format


// import emailjs from "emailjs-com";

// const doctorEmail = "srcdesigns24@gmail.com";
// const doctorPhone = "9087654321";

// const serviceId = "service_grfmcgg";
// const templateId = "template_7meqepu";
// const userId = "I3FrnElOF94OEwk9Z";

// const generateMeetingLink = async (
//   meetingType,
//   patientEmail,
//   appointmentDate,
//   appointmentTime,
//   accessToken
// ) => {
//   console.log("generateMeetingLink inputs:", {
//     meetingType,
//     patientEmail,
//     appointmentDate,
//     appointmentTime,
//     accessToken: accessToken ? "Provided" : "Missing",
//   });

//   let meetingLink = "";

//   if (meetingType === "Google Meet") {
//     meetingLink = await generateGoogleMeetLink(
//       appointmentDate,
//       appointmentTime,
//       accessToken
//     );
//     console.log(meetingLink, "Google Meet Condition");
//     if (meetingLink !== "Error generating Google Meet link!") {
//       try {
//         await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
//       } catch (emailError) {
//         console.error("Failed to send email, proceeding with link:", emailError);
//         // Continue even if email fails
//       }
//     }
//   } else if (meetingType === "Zoom") {
//     meetingLink = generateZoomLink();
//     try {
//       await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
//     } catch (emailError) {
//       console.error("Failed to send email, proceeding with link:", emailError);
//     }
//   } else if (meetingType === "WhatsApp") {
//     meetingLink = generateWhatsAppLink(doctorPhone);
//     await sendWhatsAppMessage({
//       doctorPhone,
//       patientPhone: patientEmail,
//       meetingLink,
//     });
//   }
//   console.log(meetingLink, "generated link");
//   return meetingLink;
// };

// const generateGoogleMeetLink = async (date, appointmentTime, accessToken) => {
//   try {
//     if (!date || !appointmentTime || !accessToken) {
//       throw new Error("Date, appointment time, and access token are required.");
//     }

//     console.log("generateGoogleMeetLink inputs:", { date, appointmentTime, accessToken });

//     const [startTimeStr, endTimeStr] = appointmentTime.split(" - ");
//     const startTime = new Date(`${date}T${startTimeStr}:00+05:30`);
//     const endTime = new Date(`${date}T${endTimeStr}:00+05:30`);

//     if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
//       throw new Error(`Invalid date/time format: ${date} ${appointmentTime}`);
//     }

//     console.log("Formatted Start Time:", startTime.toISOString());
//     console.log("Formatted End Time:", endTime.toISOString());

//     const response = await fetch(
//       "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           summary: "Doctor Appointment",
//           start: {
//             dateTime: startTime.toISOString(),
//             timeZone: "Asia/Kolkata",
//           },
//           end: {
//             dateTime: endTime.toISOString(),
//             timeZone: "Asia/Kolkata",
//           },
//           conferenceData: {
//             createRequest: {
//               requestId: `meet-${Date.now()}`,
//               conferenceSolutionKey: { type: "hangoutsMeet" },
//             },
//           },
//         }),
//       }
//     );
//     console.log(response, "response from google meet link");

//     const data = await response.json();
//     if (!response.ok) {
//       throw new Error(data.error?.message || "Failed to create Meet link");
//     }

//     return (
//       data.conferenceData?.entryPoints?.find(
//         (ep) => ep.entryPointType === "video"
//       )?.uri || "Failed to generate Google Meet link"
//     );
//   } catch (error) {
//     console.error("Error generating Google Meet link:", error.message);
//     return "Error generating Google Meet link!";
//   }
// };

// const generateZoomLink = () => "https://zoom.us/j/123456789"; // Replace with real Zoom logic
// const generateWhatsAppLink = (phone) => `https://wa.me/${phone}`;

// const sendEmail = async ({ doctorEmail, userEmail, meetingLink }) => {
//   try {
//     console.log("Sending emails with params:", { doctorEmail, userEmail, meetingLink });

//     // Send email to the patient
//     const patientResponse = await emailjs.send(
//       serviceId,
//       templateId,
//       {
//         to_email: userEmail, // Patient's email
//         doctor_email: doctorEmail,
//         user_email: userEmail,
//         meeting_link: meetingLink,
//       },
//       userId
//     );
//     console.log("Patient email response:", patientResponse);

//     // Send email to the doctor
//     const doctorResponse = await emailjs.send(
//       serviceId,
//       templateId,
//       {
//         to_email: doctorEmail, // Doctor's email
//         doctor_email: doctorEmail,
//         user_email: userEmail,
//         meeting_link: meetingLink,
//       },
//       userId
//     );
//     console.log("Doctor email response:", doctorResponse);

//     return { patientResponse, doctorResponse };
//   } catch (error) {
//     console.error("EmailJS error:", error);
//     throw error;
//   }
// };

// const sendWhatsAppMessage = async ({ doctorPhone, patientPhone, meetingLink }) => {
//   console.log("Sending WhatsApp:", { doctorPhone, patientPhone, meetingLink });
// };

// export { generateMeetingLink };

// TODO: fix sending email getting 422 error
// import emailjs from "emailjs-com";

// const doctorEmail = "srcdesigns24@gmail.com";
// const doctorPhone = "9087654321";

// const generateMeetingLink = async (
//   meetingType,
//   patientEmail,
//   appointmentDate,
//   appointmentTime,
//   accessToken
// ) => {
//   console.log("generateMeetingLink inputs:", {
//     meetingType,
//     patientEmail,
//     appointmentDate,
//     appointmentTime,
//     accessToken: accessToken ? "Provided" : "Missing",
//   });

//   let meetingLink = "";

//   if (meetingType === "Google Meet") {
//     meetingLink = await generateGoogleMeetLink(
//       appointmentDate,
//       appointmentTime,
//       accessToken
//     );
//     console.log(meetingLink, "Google Meet Condition");
//     if (meetingLink !== "Error generating Google Meet link!") {
//       await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
//     }
//   } else if (meetingType === "Zoom") {
//     meetingLink = generateZoomLink();
//     await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
//   } else if (meetingType === "WhatsApp") {
//     meetingLink = generateWhatsAppLink(doctorPhone);
//     await sendWhatsAppMessage({
//       doctorPhone,
//       patientPhone: patientEmail,
//       meetingLink,
//     });
//   }
//   console.log(meetingLink, "generated link");
//   return meetingLink;
// };

// const generateGoogleMeetLink = async (date, appointmentTime, accessToken) => {
//   try {
//     if (!date || !appointmentTime || !accessToken) {
//       throw new Error("Date, appointment time, and access token are required.");
//     }

//     console.log("generateGoogleMeetLink inputs:", { date, appointmentTime, accessToken });

//     const [startTimeStr, endTimeStr] = appointmentTime.split(" - ");
//     const startTime = new Date(`${date}T${startTimeStr}:00+05:30`);
//     const endTime = new Date(`${date}T${endTimeStr}:00+05:30`);

//     if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
//       throw new Error(`Invalid date/time format: ${date} ${appointmentTime}`);
//     }

//     console.log("Formatted Start Time:", startTime.toISOString());
//     console.log("Formatted End Time:", endTime.toISOString());

//     const response = await fetch(
//       "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           summary: "Doctor Appointment",
//           start: {
//             dateTime: startTime.toISOString(),
//             timeZone: "Asia/Kolkata",
//           },
//           end: {
//             dateTime: endTime.toISOString(),
//             timeZone: "Asia/Kolkata",
//           },
//           conferenceData: {
//             createRequest: {
//               requestId: `meet-${Date.now()}`,
//               conferenceSolutionKey: { type: "hangoutsMeet" },
//             },
//           },
//         }),
//       }
//     );
// console.log(response, "response from google meet link")
//     const data = await response.json();
//     if (!response.ok) {
//       throw new Error(data.error?.message || "Failed to create Meet link");
//     }

//     return (
//       data.conferenceData?.entryPoints?.find(
//         (ep) => ep.entryPointType === "video"
//       )?.uri || "Failed to generate Google Meet link"
//     );
//   } catch (error) {
//     console.error("Error generating Google Meet link:", error.message);
//     return "Error generating Google Meet link!";
//   }
// };

// // Placeholder functions (ensure these are implemented as needed)
// const generateZoomLink = () => "https://zoom.us/j/123456789"; // Replace with real Zoom logic
// const generateWhatsAppLink = (phone) => `https://wa.me/${phone}`;

//   const serviceId = "service_grfmcgg";
//   const templateId = "template_7meqepu";
//   const userId = "I3FrnElOF94OEwk9Z";
// const sendEmail = async ({ doctorEmail, userEmail, meetingLink }) => {
//   return emailjs.send(serviceId, templateId, {
//     doctor_email: doctorEmail,
//     user_email: userEmail,
//     meeting_link: meetingLink,
//   }, userId);
// };
// const sendWhatsAppMessage = async ({ doctorPhone, patientPhone, meetingLink }) => {
//   console.log("Sending WhatsApp:", { doctorPhone, patientPhone, meetingLink });
// };

// export { generateMeetingLink };

// FIXME: updating to generateMeetingLink for new freature adding after admin except whatsapp and zoom
// import emailjs from "emailjs-com";

// const doctorEmail = "srcdesigns24@gmail.com";
// const doctorPhone = "9087654321";

// const generateMeetingLink = async (
//   meetingType,
//   patientEmail,
//   appointmentDate,
//   appointmentTime,
//   accessToken
// ) => {
//   console.log("generateMeetingLink inputs:", {
//     meetingType,
//     patientEmail,
//     appointmentDate,
//     appointmentTime,
//     accessToken: accessToken ? "Provided" : "Missing",
//   });

//   let meetingLink = "";

//   if (meetingType === "Google Meet") {
//     console.log(meetingLink, "user selected meet");
//     meetingLink = await generateGoogleMeetLink(
//       appointmentDate,
//       appointmentTime,
//       accessToken
//     );
//     console.log(meetingLink, "Google Meet Condition");
//     if (meetingLink !== "Error generating Google Meet link!") {
//       console.log( patientEmail)
//       await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
//     }
//   } else if (meetingType === "Zoom") {
//     meetingLink = generateZoomLink();
//     await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
//   } else if (meetingType === "WhatsApp") {
//     meetingLink = generateWhatsAppLink(doctorPhone);
//     await sendWhatsAppMessage({
//       doctorPhone,
//       patientPhone: patientEmail,
//       meetingLink,
//     });
//   }
//   console.log(meetingLink, "generated link");

//   return meetingLink;
// };

// const generateGoogleMeetLink = async (date, appointmentTime, accessToken) => {
//   try {
//     if (!date || !appointmentTime || !accessToken) {
//       throw new Error("Date, appointment time, and access token are required.");
//     }

//     console.log("generateGoogleMeetLink inputs:", {
//       date,
//       appointmentTime,
//       accessToken,
//     });

//     const convertTo24Hour = (time12h) => {
//       console.log("Converting time:", time12h);
//       const match = time12h.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
//       if (!match) throw new Error(`Invalid time format: ${time12h}`);

//       let [_, hours, minutes, meridian] = match;
//       hours = parseInt(hours, 10);
//       if (meridian.toUpperCase() === "PM" && hours !== 12) {
//         hours += 12;
//       } else if (meridian.toUpperCase() === "AM" && hours === 12) {
//         hours = 0;
//       }

//       return `${String(hours).padStart(2, "0")}:${minutes}`;
//     };

//     const appointmentTime24 = convertTo24Hour(appointmentTime); // Use appointmentTime, not date
//     const startTimeString = `${date}T${appointmentTime24}:00.000+05:30`;
//     const startTime = new Date(startTimeString);

//     if (isNaN(startTime.getTime())) {
//       throw new Error(`Invalid start date format: ${startTimeString}`);
//     }

//     const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

//     console.log("Formatted Start Time:", startTime.toISOString());
//     console.log("Formatted End Time:", endTime.toISOString());

//     const response = await fetch(
//       "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           summary: "Doctor Appointment",
//           start: {
//             dateTime: startTime.toISOString(),
//             timeZone: "Asia/Kolkata",
//           },
//           end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
//           conferenceData: {
//             createRequest: {
//               requestId: `meet-${Date.now()}`,
//               conferenceSolutionKey: { type: "hangoutsMeet" },
//             },
//           },
//         }),
//       }
//     );

//     const data = await response.json();
//     if (!response.ok) {
//       throw new Error(data.error?.message || "Failed to create Meet link");
//     }

//     return (
//       data.conferenceData?.entryPoints?.find(
//         (ep) => ep.entryPointType === "video"
//       )?.uri || "Failed to generate Google Meet link"
//     );
//   } catch (error) {
//     console.error("Error generating Google Meet link:", error.message);
//     return "Error generating Google Meet link!";
//   }
// };

// const generateZoomLink = () => {
//   return `https://zoom.us/j/${Math.floor(
//     1000000000 + Math.random() * 9000000000
//   )}`;
// };

// const generateWhatsAppLink = (phone) => {
//   return `https://wa.me/${phone}?text=Your appointment is confirmed!`;
// };

// const sendEmail = async ({ doctorEmail, userEmail, meetingLink }) => {
//   const serviceId = "service_grfmcgg";
//   const templateId = "template_7meqepu";
//   const userId = "I3FrnElOF94OEwk9Z";

//   const templateParams = {
//     to_email: `${doctorEmail}, ${userEmail}`,
//     from_name: "Dr",
//     to_name: `${userEmail}`,
//     message: meetingLink,
//     reply_to: `${doctorEmail}`,
//   };

//   try {
//     await emailjs.send(serviceId, templateId, templateParams, userId);
//     console.log("Email sent successfully");
//   } catch (error) {
//     console.error("Error sending email:", error);
//   }
// };

// // const sendEmail = async ({ doctorEmail, userEmail, meetingLink }) => {
// //   const serviceId = "service_grfmcgg";
// //   const templateId = "template_7meqepu";
// //   const userId = "CXpZcm-Yy6Clgru_h";

// //   const templateParams = {
// //     to_email: doctorEmail, // Test with one email first
// //     from_name: "Dr",
// //     to_name: userEmail,
// //     message: meetingLink,
// //     reply_to: doctorEmail,
// //   };

// //   try {
// //     // Ensure initialization (if required by your version)
// //     // emailjs.init(userId); // Uncomment if needed
// //     const response = await emailjs.send(serviceId, templateId, templateParams, userId);
// //     console.log("Email sent successfully:", response);
// //   } catch (error) {
// //     console.error("Error sending email:", error.message, error.response);
// //     throw error; // Optional: rethrow for upstream handling
// //   }
// // };

// const sendWhatsAppMessage = async ({
//   doctorPhone,
//   patientPhone,
//   meetingLink,
// }) => {
//   const accountSid = "YOUR_TWILIO_ACCOUNT_SID";
//   const authToken = "YOUR_TWILIO_AUTH_TOKEN";
//   const fromNumber = "whatsapp:+YOUR_TWILIO_WHATSAPP_NUMBER";

//   const messageBody = `Your appointment is confirmed! Click to join: ${meetingLink}`;

//   try {
//     await fetch(
//       `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Basic ${btoa(accountSid + ":" + authToken)}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         body: new URLSearchParams({
//           From: fromNumber,
//           To: `whatsapp:+${doctorPhone}`,
//           Body: messageBody,
//         }),
//       }
//     );

//     await fetch(
//       `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Basic ${btoa(accountSid + ":" + authToken)}`,
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//         body: new URLSearchParams({
//           From: fromNumber,
//           To: `whatsapp:+${patientPhone}`,
//           Body: messageBody,
//         }),
//       }
//     );

//     console.log("WhatsApp messages sent successfully");
//   } catch (error) {
//     console.error("Error sending WhatsApp message:", error);
//   }
// };

// export { generateMeetingLink };
