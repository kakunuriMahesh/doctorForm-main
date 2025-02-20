# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh



// {
    //   if (!formData.meetingType) {
    //     toast.error("Please select a meeting type.");
    //     setIsLoading(false);
    //     return;
    //   }

    //   if (
    //     (formData.meetingType === "WhatsApp" && !formData.meetingContact) ||
    //     ((formData.meetingType === "Google Meet" ||
    //       formData.meetingType === "Zoom") &&
    //       !formData.meetingContact.includes("@"))
    //   ) {
    //     toast.error(
    //       "Please enter a valid contact (Phone for WhatsApp, Email for Meet/Zoom)."
    //     );
    //     setIsLoading(false);
    //     return;
    //   }

    //   let meetingLink = "";
    //   if (formData.meetingType === "WhatsApp") {
    //     meetingLink = `https://wa.me/${formData.meetingContact}?text=Your%20appointment%20is%20scheduled`;
    //   } else if (formData.meetingType === "Google Meet") {
    //     meetingLink = `https://meet.google.com/new`; // Generate actual link via API if needed
    //   } else if (formData.meetingType === "Zoom") {
    //     meetingLink = `https://zoom.us/start/videomeeting`; // Generate actual link via API if needed
    //   }

    //   toast.success("Meeting link generated!");
    //   console.log("Generated Meeting Link: ", meetingLink);
    // }