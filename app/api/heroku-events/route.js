import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

let io;

export async function POST(req) {
  try {
    const event = await req.json();
    const { File_URL__c, Chunk__c, Session_ID__c } = event;

    console.log("Event received:", event);

    if (io) {
      io.emit("pdf-update", {
        fileUrl: File_URL__c,
        chunk: Chunk__c,
        sessionId: Session_ID__c,
      });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Error processing event:", error);
    return new Response(JSON.stringify({ error: "Error processing event." }), { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

if (!io) {
  const PORT = process.env.NODE_ENV === "production" ? process.env.PORT : 3001
  io = new Server(PORT, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? process.env.DOMAIN_PRODUCTION : process.env.DOMAIN_LOCAL,
    },
  });
  console.log(`WebSocket server started on port ${PORT}`);
}