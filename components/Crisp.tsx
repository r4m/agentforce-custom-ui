"use client";

import { useEffect, useRef } from "react";
import { Crisp } from "crisp-sdk-web";
import { getSocketConnection, closeSocketConnection } from "../utils/socketInstance";

const CrispChat: React.FC = () => {
  const sessionInitialized = useRef(false); // Track if the session is already initialized
  const conversationId = useRef<string | null>(null);

  function userLogout() {
    // Reset session and clear token
    Crisp.session.reset();
    sessionInitialized.current = false;
  }

  useEffect(() => {
    // Configure Crisp
    Crisp.configure(process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || "", {
      lockMaximized: false,
      safeMode: process.env.NODE_ENV === "production",
      locale: "en",
    });

    const socketConnection = getSocketConnection();

    // Handle chat opened
    Crisp.chat.onChatOpened(() => {
      console.log("Chat opened");
      const sessionId = Crisp.session.getIdentifier();
      if (sessionId && !sessionInitialized.current) {
        console.log("Initializing session for ID:", sessionId);
        socketConnection.emit("init-session", { sessionId });
        sessionInitialized.current = true; // Mark session as initialized
      }
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
    socketConnection.off("salesforce-message");
    socketConnection.on("salesforce-message", (message) => {
      console.log("Message from Salesforce received:", message);
    
      if (message?.content.staticContent?.text) {
        if (conversationId.current == message.conversationId && message.sender.role != "EndUser") {
          Crisp.message.show("text", message.content.staticContent?.text);
        }
      } else {
        console.error("Received malformed message from Salesforce:", message);
      }
    });

    // Listen for messages from Salesforce
    socketConnection.off("internal");
    socketConnection.on("internal", (message) => {
      console.log("Message from backend received:", message);
    
      if (message.type === "error") {
        Crisp.message.show("text", message.data.content);
      }
      if (message.type === "info" && message.data?.conversationId) {
        conversationId.current = message.data?.conversationId;
      }
    });

    Crisp.user.setEmail("mock.user@example.com");
    Crisp.user.setNickname("Mock User");

    Crisp.chat.open();

    // Cleanup on component unmount
    return () => {
      Crisp.message.offMessageReceived();
      Crisp.message.offMessageSent();
      Crisp.chat.offChatOpened();
      Crisp.chat.offChatClosed();
      socketConnection.off("salesforce-message");
      socketConnection.off("internal");
      closeSocketConnection();
    };
  }, []);

  return null;
};

export default CrispChat;