import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = process.env.PORT || 3000;

app.prepare().then(() => {

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    if (req.url === "/emit-event" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", () => {
        const event = JSON.parse(body);
        const { File_URL__c, Chunk__c, Session_ID__c } = event;

        console.log("Event received:", event);

        io.emit("pdf-update", {
          fileUrl: File_URL__c,
          chunk: Chunk__c,
          sessionId: Session_ID__c,
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
      origin: dev ? process.env.DOMAIN_LOCAL : process.env.DOMAIN_PRODUCTION,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("New WebSocket connection:", socket.id);

    socket.on("message", (data) => {
      console.log("Message received from client:", data);
    });

    socket.on("disconnect", () => {
      console.log("WebSocket connection closed:", socket.id);
    });
  });

  server.listen(PORT, (err) => {
    if (err) throw err;
  
    if (process.env.NODE_ENV === "production") {
      console.log(`> Server running in production mode on port ${PORT}`);
      console.log(`> WebSocket server attached`);
    } else {
      console.log(`> Server running in development mode at http://localhost:${PORT}`);
      console.log(`> WebSocket server attached`);
    }
  });
});