import emailjs from "emailjs-com";

// Fixed doctor details
const doctorEmail = "srcdesigns24@gmail.com"; //checking with working email
const doctorPhone = "9087654321";

const generateMeetingLink = async (meetingType, patientEmail, patientPhone) => {
  console.log(meetingType, "check meet type");
  // let meetingLink = "You need to add Google calender to get Meet link";
  let meetingLink = "";

  if (meetingType === "Google Meet") {
    console.log(meetingLink, "user selected meet");
    meetingLink = await generateGoogleMeetLink(); // 👉 enable this once calender is available to integrate
    console.log(meetingLink, "Google Meet Condition");
    await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
  } else if (meetingType === "Zoom") {
    meetingLink = generateZoomLink();
    await sendEmail({ doctorEmail, userEmail: patientEmail, meetingLink });
  } else if (meetingType === "WhatsApp") {
    meetingLink = generateWhatsAppLink(doctorPhone);
    await sendWhatsAppMessage({ doctorPhone, patientPhone, meetingLink });
  }
  console.log(meetingLink, "generated link");

  return meetingLink;
};

// Generate Google Meet Link (Using Calendar API)
const generateGoogleMeetLink = async () => {
  const accessToken =
    "ya29.a0AXeO80SmXv-IWUWY0Gruj3F1hC6PznK_vvui1IY90mOROOjNu8gp02xkFbbvRN_08zYtrG31E5ojEVr0q_qjZCoShvq3hXIp6wquE0pBT14JvJy_7R1Pv4uqwyErMlLRqpTB5x2CUV4sCT5A7rMlXLbfTNgKmX0oFRTUzvMeaCgYKAQ8SARASFQHGX2MitCPXrMVHld4UIJg3Bxiorw0175";

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
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`, // Unique ID for Meet link
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );

  const data = await response.json();
  console.log("Full Response:", data);

  // ✅ Extract Google Meet link
  const meetLink = data.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === "video"
  )?.uri;
  console.log(meetLink, "meetlink should go in mail");
  return meetLink || "Failed to generate Google Meet link";
  // const response = await fetch(
  //   "https://www.googleapis.com/calendar/v3/calendars/primary/events",
  //   {
  //     method: "POST",
  //     headers: {
  //       Authorization: `Bearer ${accessToken}`,
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       summary: "Doctor Appointment",
  //       start: { dateTime: new Date().toISOString() },
  //       end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
  //       conferenceData: {
  //         createRequest: {
  //           requestId: "meet123",
  //           conferenceSolutionKey: { type: "hangoutsMeet" },
  //         },
  //       },
  //     }),
  //   }
  // );

  // const data = await response.json();
  // console.log(data, ":response from calender");
  // return data.hangoutLink || "You must Update Access Token for calender dates!";
};

// Generate Zoom Meeting Link (Fake for now, replace with Zoom API)
const generateZoomLink = () => {
  return `https://zoom.us/j/${Math.floor(
    1000000000 + Math.random() * 9000000000
  )}`;
};

// Generate WhatsApp Link
const generateWhatsAppLink = (phone) => {
  return `https://wa.me/${phone}?text=Your appointment is confirmed!`;
};

// Send Email using EmailJS //working✅
const sendEmail = async ({ doctorEmail, userEmail, meetingLink }) => {
  const serviceId = "service_grfmcgg";
  const templateId = "template_7meqepu";
  const userId = "CXpZcm-Yy6Clgru_h";

  const templateParams = {
    to_email: `${doctorEmail}, ${userEmail}`,
    // meeting_link: meetingLink,
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

// Send WhatsApp Message (Using Twilio API) // FIXME:
const sendWhatsAppMessage = async ({
  doctorPhone,
  patientPhone,
  meetingLink,
}) => {
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
