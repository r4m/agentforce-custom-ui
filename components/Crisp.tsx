"use client";

import { useEffect, useState, useCallback } from "react";
import { Crisp } from "crisp-sdk-web";
import axios from "axios";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const CrispChat: React.FC = () => {
  // const [socket, setSocket] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  async function generateAccessToken() {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/authorization/unauthenticated/access-token`, {
        orgId: process.env.NEXT_PUBLIC_SF_ORG_ID,
        esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
        capabilitiesVersion: "1",
        platform: "Web",
      });
      return response.data.accessToken;
    } catch (error) {
      console.error("Failed to generate access token:", error);
      return null;
    }
  }

  async function createConversation(conversationId: string, accessToken: string) {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/conversation`, {
        esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
        conversationId,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  }

  const sendMessageToSalesforce = useCallback(
    async (message: string) => {
      if (!conversationId || !accessToken) {
        console.error("No active conversation or access token. Cannot send message.");
        return;
      }

      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/conversation/${conversationId}/message`, {
          message: {
            id: uuidv4(),
            messageType: "StaticContentMessage",
            staticContent: {
              formatType: "Text",
              text: message,
            },
          },
          esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
        }, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        console.log("Message sent to Salesforce:", response.data);
      } catch (error) {
        console.error("Failed to send message to Salesforce:", error);
      }
    },
    [accessToken, conversationId]
  );

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
      // Generate access token and create a conversation
      (async () => {
        const accessToken = await generateAccessToken();
        const conversationId = uuidv4();
        if (accessToken) {
          setAccessToken(accessToken);
          const response = await createConversation(conversationId, accessToken);
          if (response?.status === 201) {
            setConversationId(conversationId);
            console.log("Conversation created with ID:", conversationId);
          }
        }
      })();
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
        sendMessageToSalesforce(data.content); // Relay message to Salesforce
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
  }, [sendMessageToSalesforce]);

  return null;
};

export default CrispChat;