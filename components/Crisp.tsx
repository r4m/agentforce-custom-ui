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
    const savedConversationId = localStorage.getItem('conversationId');
    if (savedConversationId) {
      conversationId.current = savedConversationId;
    }

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

        const lastHsov5Div = document.querySelectorAll('.cc-hsov5');
        const lastDiv = lastHsov5Div[lastHsov5Div.length - 1];

        if (lastDiv) {
          const newDiv = document.createElement('div');
          newDiv.className = 'loading-message';
          newDiv.innerHTML = `
            <span style="
                  padding: 8px 14px !important;
                  font-size: 12.6px !important;
                  display: flex !important;
                  align-items: center !important;
                ">
              The Agent will respond shortly, please wait
              <span class="loader" style="display: flex !important; align-items: center !important; margin-left: 5px !important;">
                <span class="dot" style="margin-left: 2px !important;">.</span>
                <span class="dot" style="margin-left: 2px !important;">.</span>
                <span class="dot" style="margin-left: 2px !important;">.</span>
              </span>
            </span>
          `;

          const style = document.createElement('style');
          style.innerHTML = `
            .dot {
              animation: blink 1.4s infinite both;
              font-size: 12.6px !important;
              color: rgb(255, 255, 255) !important;
            }
            .dot:nth-child(1) {
              animation-delay: 0s;
            }
            .dot:nth-child(2) {
              animation-delay: 0.2s;
            }
            .dot:nth-child(3) {
              animation-delay: 0.4s;
            }
            @keyframes blink {
              0% {
                opacity: 0;
              }
              20% {
                opacity: 1;
              }
              100% {
                opacity: 0;
              }
            }
          `;
          document.head.appendChild(style);
          lastDiv.parentNode?.insertBefore(newDiv, lastDiv.nextSibling);
        }
      }
    });

    // Listen for messages from Salesforce
    socketConnection.off("salesforce-message");
    socketConnection.on("salesforce-message", (message) => {
      console.log("Message from Salesforce received:", message);
    
      console.log("Local conversation ID:", conversationId.current);
      console.log("Server conversation ID:", message.conversationId);
      if (message?.content.staticContent?.text) {
        const loadingMessageDiv = document.querySelector('.loading-message');
        if (loadingMessageDiv && message.sender.role != "EndUser") {
          loadingMessageDiv.remove();
        }
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
        localStorage.setItem('conversationId', message.data?.conversationId);
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