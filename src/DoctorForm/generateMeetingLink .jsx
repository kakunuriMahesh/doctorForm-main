import emailjs from "emailjs-com";

const doctorEmail = "srcdesigns24@gmail.com";
const doctorPhone = "9087654321";

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
    console.log(meetingLink, "user selected meet");
    meetingLink = await generateGoogleMeetLink(
      appointmentDate,
      appointmentTime,
      accessToken
    );
    console.log(meetingLink, "Google Meet Condition");
    if (meetingLink !== "Error generating Google Meet link!") {
      await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
    }
  } else if (meetingType === "Zoom") {
    meetingLink = generateZoomLink();
    await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
  } else if (meetingType === "WhatsApp") {
    meetingLink = generateWhatsAppLink(doctorPhone);
    await sendWhatsAppMessage({ doctorPhone, patientPhone: patientEmail, meetingLink });
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

    const convertTo24Hour = (time12h) => {
      console.log("Converting time:", time12h);
      const match = time12h.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
      if (!match) throw new Error(`Invalid time format: ${time12h}`);

      let [_, hours, minutes, meridian] = match;
      hours = parseInt(hours, 10);
      if (meridian.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      } else if (meridian.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }

      return `${String(hours).padStart(2, "0")}:${minutes}`;
    };

    const appointmentTime24 = convertTo24Hour(appointmentTime); // Use appointmentTime, not date
    const startTimeString = `${date}T${appointmentTime24}:00.000+05:30`;
    const startTime = new Date(startTimeString);

    if (isNaN(startTime.getTime())) {
      throw new Error(`Invalid start date format: ${startTimeString}`);
    }

    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

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
          start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
          end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );

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

const generateZoomLink = () => {
  return `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}`;
};

const generateWhatsAppLink = (phone) => {
  return `https://wa.me/${phone}?text=Your appointment is confirmed!`;
};

const sendEmail = async ({ doctorEmail, userEmail, meetingLink }) => {
  const serviceId = "service_grfmcgg";
  const templateId = "template_7meqepu";
  const userId = "CXpZcm-Yy6Clgru_h";

  const templateParams = {
    to_email: `${doctorEmail}, ${userEmail}`,
    from_name: "Dr",
    to_name: `${userEmail}`,
    message: meetingLink,
    reply_to: `${doctorEmail}`,
  };

  try {
    await emailjs.send(serviceId, templateId, templateParams, userId);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const sendWhatsAppMessage = async ({ doctorPhone, patientPhone, meetingLink }) => {
  const accountSid = "YOUR_TWILIO_ACCOUNT_SID";
  const authToken = "YOUR_TWILIO_AUTH_TOKEN";
  const fromNumber = "whatsapp:+YOUR_TWILIO_WHATSAPP_NUMBER";

  const messageBody = `Your appointment is confirmed! Click to join: ${meetingLink}`;

  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(accountSid + ":" + authToken)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: `whatsapp:+${doctorPhone}`,
          Body: messageBody,
        }),
      }
    );

    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(accountSid + ":" + authToken)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: `whatsapp:+${patientPhone}`,
          Body: messageBody,
        }),
      }
    );

    console.log("WhatsApp messages sent successfully");
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
  }
};

export { generateMeetingLink };