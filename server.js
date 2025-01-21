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
        const { File_URL__c, Chunk__c, Session_ID__c } = event.data;

        console.log("Event received:", event);

        io.emit("pdf-update", {
          fileUrl: File_URL__c?.string,
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
        if (!sessionStore.has(sessionId)) {
          try {
            const accessToken = await generateAccessToken(sessionId);
            sessionStore.set(sessionId, { accessToken });
            console.log(`Session initialized for ${sessionId}`);
            socket.emit("session-acknowledged", { sessionId });
            setupSSEListener(sessionId, accessToken);
          } catch (err) {
            console.error("Failed to initialize session:", err);
            socket.emit("error", "Failed to initialize session");
          }
        } else {
          console.log(`Session already exists for ${sessionId}`);
          socket.emit("session-acknowledged", { sessionId });
        }
      });
  
      socket.on("send-message", async ({ conversationId, content }) => {
        try {
          const { accessToken } = sessionStore.get(conversationId) || {};
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
            },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
        } catch (err) {
          console.error("Failed to send message to Salesforce:", err);
          socket.emit("error", "Failed to send message");
        }
      });
  
      socket.on("disconnect", () => {
        console.log("Salesforce WebSocket disconnected:", socket.id);
        sessionStore.forEach((value, key) => {
          if (value.socketId === socket.id) {
            sessionStore.delete(key);
            console.log(`Session ${key} cleaned up.`);
          }
        });
      });
    });
  
    // Function to generate access token
    async function generateAccessToken(sessionId) {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_SF_URL}/iamessage/api/v2/authorization/unauthenticated/access-token`, {
        orgId: process.env.NEXT_PUBLIC_SF_ORG_ID,
        esDeveloperName: process.env.NEXT_PUBLIC_SF_DEV_NAME,
        capabilitiesVersion: "1",
        platform: "Web",
        deviceId: sessionId,
        context: { appName: "agentforce-ui", clientVersion: "1.0" },
      });
      return response.data.accessToken;
    }

    // SSE Integration with Salesforce
    function setupSSEListener(sessionId, accessToken) {
      const headers = {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
        "X-Org-Id": process.env.NEXT_PUBLIC_SF_ORG_ID,
      };
  
      const eventSource = new EventSourcePolyfill(
        `${process.env.NEXT_PUBLIC_SF_URL}/eventrouter/v1/sse`,
        { headers }
      );
  
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
  
        if (data.conversationEntry?.entryType === "Message") {
          sfIo.emit("salesforce-message", {
            content: data.conversationEntry.entryPayload.staticContent.text,
            sender: data.conversationEntry.sender,
          });
        }
      };
  
      eventSource.onerror = (err) => {
        console.error("SSE Error:", err);
        eventSource.close();
      };
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