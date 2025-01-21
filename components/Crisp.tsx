"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";
import { io } from "socket.io-client";

const CrispChat: React.FC = () => {
  function userLogout() {
    // Reset session and clear token
    Crisp.session.reset();
  }

  useEffect(() => {
    // Configure Crisp
    Crisp.configure(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || "", {
      lockMaximized: false,
      safeMode: process.env.NODE_ENV === "production",
      locale: "en",
    });

    const socketConnection = io(
      process.env.NODE_ENV === "production"
        ? `${process.env.NEXT_PUBLIC_DOMAIN_PRODUCTION}/salesforce`
        : `${process.env.NEXT_PUBLIC_DOMAIN_LOCAL}/salesforce`
    );

    // setSocket(socketConnection);

    // Handle Crisp session loaded
    Crisp.session.onLoaded((sessionId: string) => {
      console.log("Crisp session loaded with ID:", sessionId);
      socketConnection.emit("init-session", { sessionId });
    });

    // Handle chat closed
    Crisp.chat.onChatClosed(() => {
      console.log("Chat closed");
      userLogout();
    });

    // Listen for user messages
    Crisp.message.onMessageSent((data: { type: string; content: string }) => {
      console.log("Message received:", data);
      if (data.type === "text") {
        console.log("User message sent:", data.content);
        const sessionId = Crisp.session.getIdentifier();
        socketConnection.emit("send-message", { sessionId, content: data.content });
      }
    });

    // Listen for messages from Salesforce
    socketConnection.on("salesforce-message", (message) => {
      console.log("Message from Salesforce received:", message);
      Crisp.message.show("text", message.content); // Show the message in Crisp chatbox
    });

    Crisp.user.setEmail("mock.user@example.com");
    Crisp.user.setNickname("Mock User");

    Crisp.chat.open();

    // Cleanup on component unmount
    return () => {
      Crisp.message.offMessageReceived();
      Crisp.message.offMessageSent();
      socketConnection.disconnect();
    };
  }, []);

  return null;
};

export default CrispChat;