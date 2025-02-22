### **Intro**

#### Use Case

This project seamlessly integrates AI-powered case management with picture upload, real-time document visualization, and chunk highlighting for cited knowledge in Agentforce responses. It leverages Salesforce Knowledge Base (KB), Heroku Events, and WebSockets to enhance chatbot interactivity and automate case resolution.

#### Customer Pain Points Addressed

⚠️ Problem 1: Users don’t trust AI-generated answers

🔻 Users need to **verify the source of AI responses** before making business decisions.  
✅ **Solution:** The web app **renders KB documents dynamically, highlighting the exact passage** used by the AI.

⚠️ Problem 2: Case creation is slow and manual

🔻 Users **must manually submit cases via email or phone**, which delays resolution.  
✅ **Solution:** Agentforce **automatically creates the Case and requests additional details** dynamically.

⚠️ Problem 3: Users must manually attach files to cases

🔻 Support teams often require **images/videos to verify product issues**, but **uploading and linking files is a manual process**.  
✅ **Solution:** The chatbot **guides the user to upload an image**, which is **automatically attached to the Case** in Salesforce.

---

### **User Flow Demonstration**

You can interact with the solution directly on the deployed web app:

🔗 **Live Demo:**  
 👉 [Agentforce Custom UI](https://agentforce-custom-ui-363fe3bba8ab.herokuapp.com/)

The expected user journey is as follows:

1️⃣ **User Inquiry on Turbine Setup**

* The user asks: *"What are the final checks of a turbine setup?"*  
* **Agentforce** responds with an AI-generated answer.  
* The app dynamically highlights the relevant chunk inside the rendered KB document in real time.

2️⃣ **User Reports a Broken Turbine**

* The user states: *"My wind turbine is broken."*  
* **Agentforce** asks the user for their email.

3️⃣ **User Provides Email**

* The user enters: `bbrown@example.com`  
* **Agentforce** confirms and asks whether the user wants to create a support case.

4️⃣ **User Confirms Case Creation**

* The user responds: *"Yes."*  
* **Agentforce** creates a **Salesforce Case** and notifies the user.

5️⃣ **User Uploads a Picture for Inspection**

* The user uploads a picture via the chat interface.  
* **Agentforce** automatically **attaches** **the** **image** for reference to the Case.

---

### **Run the Solution Locally**

To test and modify the solution in a local development environment:

#### **1\. Clone the Repository**

```
git clone https://github.com/r4m/agentforce-custom-ui.git
cd agentforce-custom-ui
```

#### **2\. Install Dependencies**

```
npm install
```

#### **3\. Configure Environment Variables**

Create a `.env` file in the root directory with the following contents:

```
NEXT_PUBLIC_DOMAIN_PRODUCTION=https://agentforce-custom-ui-363fe3bba8ab.herokuapp.com
NEXT_PUBLIC_DOMAIN_LOCAL=http://localhost:3000

NEXT_PUBLIC_SF_ORG_ID=00DJ6000000J7qV
NEXT_PUBLIC_SF_DEV_NAME=ESA_Web_Deployment
NEXT_PUBLIC_SF_URL=https://storm-2a99158ebc0be3.my.salesforce-scrt.com

NEXT_PUBLIC_CRISP_WEBSITE_ID=095c3ea3-a473-44d1-9485-5aff3c1477c2
```

#### **4\. Start the Development Server**

```
npm run dev
```

This will launch the application locally at [**http://localhost:3000**](http://localhost:3000/).
