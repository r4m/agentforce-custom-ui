"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

const CrispChat: React.FC = () => {

  function userLogout() {
    // Execute this sequence when your users are logging out
    Crisp.setTokenId(); // 1. Clear the token value
    Crisp.session.reset(); // 2. Unbind the current session
  }

  useEffect(() => {
    Crisp.configure(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || "", {
      lockMaximized: false, // Lock the chatbox in maximized state
      safeMode: process.env.NODE_ENV == "production", // Disable errors from the SDK
      locale: "en",        // Set default language (can be dynamic)
    });

    userLogout();

    // Mock user data setup (to be replaced with actual user data)
    Crisp.user.setEmail("mock.user@example.com");
    Crisp.user.setNickname("Mock User");

    Crisp.session.setData({
      user_id: "123456", // Dynamic user identifier
    });

    Crisp.chat.onChatOpened(() => {
      const sessionId = Crisp.session.getIdentifier();
    })
    
    Crisp.chat.open();

    // Sends a message as visitor to conversation.
    // Crisp.message.send("text", "Hello there!");
    // Crisp.message.sendText("Hello there!");

    // Listen for user messages and respond dynamically
    Crisp.message.onMessageSent((data) => {
      console.log("Message received:", data);

      if (data.type === "text") {
        // Example: Respond to specific user queries
        if (data.content === "Help") {
          // Shows a message as operator in local chatbox.
          // Crisp.message.showText("Can I help?!");
          Crisp.message.show("text", "Sure! How can I help you?");
        }
      }
    });

    return () => {
      Crisp.message.offMessageReceived();
    };
  }, []);

  return null;
};

export default CrispChat;
