# End-to-End Architecture: Real-Time Document Highlighting Using Heroku Events and Next.js

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
