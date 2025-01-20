export async function POST(req) {
    try {
      const event = await req.json();
  
      const emitEventUrl =
      process.env.NODE_ENV === "production"
        ? `${process.env.DOMAIN_PRODUCTION}/emit-event`
        : `${process.env.DOMAIN_LOCAL}/emit-event`;

      const response = await fetch(emitEventUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        });
        
      console.log("Attempting to emit event to:", emitEventUrl);
      console.log("Event payload:", event);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Emit event response error:", errorText);
        throw new Error(`Failed to emit event: ${response.statusText}`);
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
  