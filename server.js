import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import axios from "axios";
import { EventSourcePolyfill } from "event-source-polyfill";
import { v4 as uuidv4 } from "uuid";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

const sessionStore = new Map(); // Temporary in-memory session store

app.prepare().then(() => {

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    if (req.url === "/emit-heroku-event" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        const event = JSON.parse(body);
        const { File_URL__c, File_Content__c, Chunk__c, Session_ID__c } = event.data;

        console.log("Event received:", event);

        io.emit("pdf-update", {
          fileUrl: File_URL__c?.string,
          fileContent: File_Content__c?.string,
          chunk: Chunk__c?.string,
          sessionId: Session_ID__c?.string,
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      });

      return;
    }

    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: !dev ? process.env.NEXT_PUBLIC_DOMAIN_PRODUCTION : process.env.NEXT_PUBLIC_DOMAIN_LOCAL,
      methods: ["GET", "POST"],
    },
  });

  // Separate namespace for PDF Viewer
  const pdfIo = io.of("/pdf");
  pdfIo.on("connection", (socket) => {
    console.log("PDF Viewer WebSocket connected:", socket.id);

    socket.on("message", (data) => {
      console.log("PDF message received from client:", data);
    });

    socket.on("disconnect", () => {
      console.log("PDF Viewer WebSocket disconnected:", socket.id);
    });
  });

  // Main namespace for Salesforce Messaging
  const sfIo = io.of("/salesforce");
  sfIo.on("connection", (socket) => {
    console.log("Salesforce WebSocket connected:", socket.id);
  
    socket.on("init-session", async ({ sessionId }) => {
      // if (!sessionStore.has(sessionId)) {
        try {
          const { accessToken, lastEventId } = await generateAccessToken();
          sessionStore.set(sessionId, { accessToken, lastEventId });
          console.log(`Session initialized for ${sessionId}`);
          createConversation(sessionId);
          setupSSEListener(sessionId);
        } catch (err) {
          console.error("Failed to initialize session:", err);
          socket.emit("internal", {type: "error", data: {content: "Failed to initialize session"}});
        }
      // } else {
      //   console.log(`Session already exists for ${sessionId}`);
      // }
    });
  
    socket.on("send-message", async ({ sessionId, content }) => {
      try {
        await sendMessage(sessionId, content);
      } catch (err) {
        console.error("Failed to send message:", err);
        socket.emit("internal", {type: "error", data: {content: "Failed to send message"}});
      }
    });
  
    socket.on("disconnect", () => {
      console.log("Salesforce WebSocket disconnected:", socket.id);
    });
  });

  sfIo.on("connection", (socket) => {
    console.log("Connessioni attive su Salesforce namespace:", sfIo.sockets.size);
  });
  
  // Function to generate access token
  async function generateAccessToken() {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/authorization/unauthenticated/access-token`, {
        orgId: process.env.NEXT_PUBLIC_SF_ORG_ID,
        esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
        capabilitiesVersion: "1",
        platform: "Web",
      });
      return {accessToken: response.data.accessToken, lastEventId: response.data.lastEventId};
    } catch (error) {
      console.error("Failed to generate access token:", error);
      return null;
    }
  }

  // Function to create a conversation
  async function createConversation(sessionId) {
    try {
      const { accessToken } = sessionStore.get(sessionId) || {};
      if (!accessToken) {
        throw new Error("Access token missing for session");
      }

      const conversationId = uuidv4();
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/conversation`, {
        esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
        conversationId,
      }, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response?.status === 201) {
        console.log("Conversation created with ID:", conversationId);
        const sessionData = sessionStore.get(sessionId) || {}; 
        sessionData.conversationId = conversationId;
        sessionStore.set(sessionId, sessionData); 
        sfIo.emit("internal", {type: "info", data: {conversationId}});
      }
      return response;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  }

  // Function to send a message
  async function sendMessage(sessionId, content) {
    try {
      const { accessToken, conversationId } = sessionStore.get(sessionId) || {};
      if (!accessToken) {
        throw new Error("Access token missing for session");
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/conversation/${conversationId}/message`,
        {
          message: {
            id: uuidv4(),
            messageType: "StaticContentMessage",
            staticContent: {
              formatType: "Text",
              text: content,
            },
          },
          esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
          language: "en",
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      console.log('Message sent to Salesforce:', content);

    } catch (err) {
      console.error("Failed to send message to Salesforce:", err);
    }
  }

  // SSE Integration with Salesforce
  function setupSSEListener(sessionId) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken, lastEventId } = sessionStore.get(sessionId) || {};
    if (!accessToken) {
      throw new Error("Access token missing for session");
    }

    const headers = {
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
      "X-Org-Id": process.env.NEXT_PUBLIC_SF_ORG_ID,
      // "Last-Event-ID": lastEventId,
    };

    const eventSource = new EventSourcePolyfill(
      `${process.env.NEXT_PUBLIC_SF_URL}/eventrouter/v1/sse`,
      { headers }
    );

    eventSource.addEventListener("CONVERSATION_ROUTING_RESULT", (event) => {
      console.log("Routing result event received:", event.data);
    });
    
    eventSource.addEventListener("CONVERSATION_MESSAGE", (event) => {
      console.log("Message event received:", event.data);
      const data = JSON.parse(event.data);
  
      sfIo.emit("salesforce-message", createConversationEntry(data));
    });

    eventSource.addEventListener("CONVERSATION_CLOSE_CONVERSATION", () => {
      console.log("Conversation closed by Salesforce");
      cleanupSession(sessionId);
    });

    eventSource.onopen = () => {
      console.log("EventSource connection opened.");
      console.log("EventSource instance created:", eventSource.readyState);
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      eventSource.close();
    };
  }

  function cleanupSession(sessionId) {
    sessionStore.delete(sessionId);
  }

  function createConversationEntry(data) {
    try {
        if (typeof data === "object") {
            const entryPayload = JSON.parse(data.conversationEntry.entryPayload);
    
            return {
                conversationId: data.conversationId,
                messageId: data.conversationEntry.identifier,
                content: entryPayload.abstractMessage || entryPayload,
                messageType: entryPayload.abstractMessage ? entryPayload.abstractMessage.messageType : (entryPayload.routingType || entryPayload.entries[0].operation) ,
                entryType: entryPayload.entryType,
                sender: data.conversationEntry.sender,
                actorName: data.conversationEntry.senderDisplayName ? (data.conversationEntry.senderDisplayName || data.conversationEntry.sender.role) : (entryPayload.entries[0].displayName || entryPayload.entries[0].participant.role),
                actorType: data.conversationEntry.sender.role,
                transcriptedTimestamp: data.conversationEntry.transcriptedTimestamp,
                messageReason: entryPayload.messageReason
            };
        } else {
            throw new Error(`Expected an object to create a new conversation entry but instead, received ${data}`);
        }
    } catch (err) {
        throw new Error(`Something went wrong while creating a conversation entry: ${err}`);
    }
  }

  server.listen(PORT, (err) => {
    if (err) throw err;
  
    if (process.env.NODE_ENV === "production") {
      console.log(`> Server running in production mode on port ${PORT}`);
    } else {
      console.log(`> Server running in development mode at http://localhost:${PORT}`);
    }
    console.log(`> WebSocket server attached`);
  });
});