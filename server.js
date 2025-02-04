import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import axios from "axios";
import { EventSourcePolyfill } from "event-source-polyfill";
import { v4 as uuidv4 } from "uuid";
import express from "express";
import { v2 as cloudinary } from "cloudinary";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

const sessionStore = new Map(); // Temporary in-memory session store
const caseStore = new Map();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.prepare().then(() => {
  const expressApp = express();
  expressApp.use(express.json());

  // Route to handle file uploads
  expressApp.post("/uploadFile", async (req, res) => {
    try {
      if (!req.files || !req.files.image) {
        return res.status(400).json({ error: "No file uploaded" });
      }
  
      const file = req.files.image;
  
      // Upload and resize the image to max width 800px
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: "agentforce_cases",
        width: 800,
        height: 800,
        crop: "limit", // Resize without distorting
      });
  
      return res.json({ fileUrl: result.secure_url });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ error: "File upload failed" });
    }
  });

  const server = createServer(expressApp);

  expressApp.post("/emit-heroku-event", (req, res) => {
    console.log("Heroku event received:", req.body);

    const { subject } = req.body;
    console.log(subject);

    if (subject === "/event/Agentforce_Case_Creation_Event__e") {
      console.log("Heroku event parsing...");
      const { Case_ID__c, Case_Number__c } = req.body.data;
      const lastConversationId = [...sessionStore.keys()].pop();
      caseStore.set(lastConversationId, {caseId: Case_ID__c?.string, caseNumber: Case_Number__c?.string});
      console.log("...done. Heroku event is ", req.body.data);
      console.log("Case ID is ", caseStore.get(lastConversationId));
      console.log("Case ID had been attached to conversation ", lastConversationId);

      // io.emit("pdf-update", {
      //   fileUrl: File_URL__c?.string,
      //   fileContent: File_Content__c?.string,
      //   chunk: Chunk__c?.string,
      //   sessionId: Session_ID__c?.string,
      // });
    }

    if (subject === "/event/Agentforce_RAG_Response_Event__e") {
      console.log("Heroku event parsing...");
      const { File_URL__c, File_Content__c, Chunk__c, Session_ID__c } = req.body.data;
      console.log("...done. Heroku event is ", req.body.data);

      io.emit("pdf-update", {
        fileUrl: File_URL__c?.string,
        fileContent: File_Content__c?.string,
        chunk: Chunk__c?.string,
        sessionId: Session_ID__c?.string,
      });
    }
    res.json({ success: true });
  });

  expressApp.all("*", (req, res) => {
    return handle(req, res);
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
        await sendMessage(sessionId, "StaticContentMessage", content);
      } catch (err) {
        console.error("Failed to send message:", err);
        socket.emit("internal", {type: "error", data: {content: "Failed to send message"}});
      }
    });

    socket.on("send-file", async ({ sessionId, content }) => {
      try {
        await sendMessage(sessionId, "StaticContentLinks", content);
      } catch (err) {
        console.error("Failed to send message:", err);
        socket.emit("internal", {type: "error", data: {content: "Failed to send message"}});
      }
    });
  
    socket.on("disconnect", () => {
      console.log("Salesforce WebSocket disconnected:", socket.id);
    });
  });

  sfIo.on("connection", () => {
    console.log("Active connections on Salesforce namespace:", sfIo.sockets.size);
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
      sfIo.emit("internal", {type: "error", data: {content: "Failed to create conversion: " + error.message}});
      return null;
    }
  }

  // Function to send a message
  async function sendMessage(sessionId, type, content) {
    console.log('Sending message to Salesforce:', content);
    try {
      const { accessToken, conversationId } = sessionStore.get(sessionId) || {};
      if (!accessToken) {
        throw new Error("Access token missing for session");
      }

      let staticContent;
      if (type === "StaticContentLinks") {
        staticContent = {
          "formatType": "Text",
          "text":  `Please attach the following file '${content.name}' of type ${content.type} and url '${content.url}' to case with id ${caseStore.get(sessionId)?.caseId} and case number ${caseStore.get(sessionId)?.caseNumber}`,
        }
      } else {
        staticContent = {
          formatType: "Text",
          text: content,
        }
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/conversation/${conversationId}/message`,
        {
          message: {
            id: uuidv4(),
            messageType: "StaticContentMessage",
            staticContent,
          },
          esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
          language: "en",
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      console.log('Message sent to Salesforce.', response?.data);
    } catch (error) {
      if (error.message === 'Access token missing for session') {
        try {
          const { accessToken, lastEventId } = await generateAccessToken();
          sessionStore.set(sessionId, { accessToken, lastEventId });

          await sendMessage(sessionId, type, content);
        } catch (tokenError) {
          console.error('Failed to refresh access token and resend message to Salesforce:', tokenError.message);
          sfIo.emit("internal", {type: "error", data: {content: "Failed to send message to Salesforce: " + tokenError.message}});
        }
      } else {
        console.error("Failed to send message to Salesforce:", error);
        sfIo.emit("internal", {type: "error", data: {content: "Failed to send message to Salesforce: " + error.message}});
      }
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