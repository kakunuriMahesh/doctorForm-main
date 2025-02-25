import React, { useState } from "react";

const AiBot = () => {
  const [inputValue, setInputValue] = useState("");

  // Function to handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent page refresh

    const webhookUrl = "https://srcdesigns.app.n8n.cloud/webhook-test/37fc1a2b-3c09-434d-9eea-5ecb569e5ce6"; // Replace with your n8n webhook URL

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instruction: inputValue }), // Send input value as JSON
      });

      if (response.ok) {
        console.log("Request sent successfully");
        // Optional: Handle the response from n8n
        const data = await response.json();
        console.log("Response from n8n:", data);
      } else {
        console.error("Failed to send request");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)} // Update state on input change
          placeholder="Enter your instruction"
        />
        <button type="submit">Submit</button> {/* Button to submit the form */}
      </form>
    </div>
  );
};

export default AiBot;
