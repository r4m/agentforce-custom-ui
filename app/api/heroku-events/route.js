export async function POST(req) {
    try {
      const event = await req.json();
  
      console.log("Evento ricevuto da Heroku:", event);
  
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { File_URL__c, Chunk__c, Session_ID__c, User_ID__c, Conversation_ID__c } = event;
  
      // Logica per gestire l'evento
      console.log("URL del file:", File_URL__c);
      console.log("Chunk:", Chunk__c);
  
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (error) {
      console.error("Errore durante l'elaborazione dell'evento:", error);
      return new Response(JSON.stringify({ error: "Errore durante l'elaborazione dell'evento." }), { status: 500 });
    }
  }
  