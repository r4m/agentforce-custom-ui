# End-to-End Architecture: Real-Time Document Highlighting Using Heroku Events and Next.js

## Overview
This project demonstrates how to build a scalable, real-time, event-driven system using Heroku Events, Next.js, Salesforce Platform Events, and WebSocket communication. It integrates Salesforce, Heroku, and Data Cloud to deliver a seamless user experience by highlighting relevant portions of documents in real-time.


## Use Case: Enhancing Agentforce with Real-Time Insights
The use case augments Agentforce by providing users with:

1. Real-time RAG (Retrieval-Augmented Generation) insights: Users receive contextually relevant responses with highlighted document sections.
2. Seamless integration with Salesforce Platform Events: Automates communication between Salesforce and Heroku.
3. Scalable, event-driven architecture: Built using Heroku's real-time eventing platform.


## How It Works

1. User Interaction in Agentforce:

- A user asks a question in Agentforce.
- Agentforce performs a RAG operation on documents stored in Data Cloud and generates a response.
- The response is saved in a custom Salesforce object (`Agentforce_RAG_Response__c`).

2. Platform Event Trigger:

Saving Agentforce_RAG_Response__c triggers a Salesforce Platform Event (`Agentforce_RAG_Response_Event__e`).

3. Heroku Events Subscription:

A Heroku subscription listens for this platform event and processes the payload.
The Heroku Events add-on is configured to subscribe to `Agentforce_RAG_Response_Event__e`.

4. WebSocket Communication:

The Heroku application publishes the event payload to a custom server's `/emit-heroku-event` endpoint.
The server emits the data via WebSockets to the Next.js frontend.

5. Real-Time Document Rendering:

The Next.js app listens for WebSocket events and dynamically renders the document with highlighted text.

## Local testing

You can test Heroku events via the following command:

curl -X POST "http://localhost:3000/emit-heroku-event" \
     -H "Content-Type: application/json" \
     --data "@tests/payload_html_5.json"

## Customer journey test

0. The user ask for the final checks of a turbine setup `what are the final checks of a turbine setup?`
    Agentforce replies with the detail and the app highlights the relevant chunks in the rendered KB
1. The user ask in the chat which is the return policy `can you tell me what is your return policy?`
    Agentforce return the details of the policy
2. The user communicate that the turbine is broken `My wind turbine is broken`
    Agentforce ask the user email
3. The user write its email `fzanella@salesforce.com`
    Agentforce asks to create a ticket
4. The user says `yes`
    Agentforce create a ticket
5. The user upload a picture
    Agentforce create a comment in the case with the link of the uploaded picture

Please attach the following file 'damage.png' of type image/png and url 'https://storage.crisp.chat/users/upload/session/1df16a4576b99200/damange_19bqefn.png' to case with id 500J60000093uUaIAI"