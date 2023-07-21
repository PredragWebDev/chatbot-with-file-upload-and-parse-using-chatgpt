let serverUrl;
let selectedNamespace;
let openAIapiKey;
let pineconeApiKey;
let pineconeIndexName;
let pineconeEnvironment;

const messages = [];
let isLoading = false;
let visibleChatbot = false;

const initStyle = () => {
  const style = document.createElement('style');
  style.innerHTML = `
    #chatbot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
    }

    #chat-btn {
      width: 60px;
      height: 60px;
      align-items: center;
      border: 1px solid black;
      border-radius: 30px;
      background-color: #0000ff;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
      color: white;
      cursor: pointer;
      display: flex;
      font-weight: bold;
      font-size: 25px;
      justify-content: center;
      margin-top: 20px;
      margin-left: auto;
    }

    #chat-container {
      width: 400px;
      background-color: #f5f5f5;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
      display: none;
    }

    #chat-container.visible {
      display: block;
    }

    .chat-header {
      width: 100%;
      height: 40px;
      line-height: 40px;
      align-items: center;
      background-color: #3f51b5;
      border-top-right-radius: 5px;
      border-top-left-radius: 5px;
      color: white;
      font-size: 16px;
      text-align: center;
    }

    .chat-body {
      padding: 20px;
    }

    #messages-container {
      height: 400px;
      overflow-y: scroll;
    }

    .message-container {
      display: flex;
      flex-direction: row;
      margin-bottom: 10px;
    }

    .user-message {
      justify-content: flex-end;
    }

    .bot-message {
      justify-content: flex-start;
    }

    .message {
      background-color: #fff;
      border-radius: 5px;
      padding: 10px;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
      max-width: 80%;
      word-wrap: break-word;
    }

    #input-container {
      display: flex;
      flex-direction: row;
      margin-top: 10px;
    }

    #user-input {
      flex-grow: 1;
      border-radius: 5px;
      padding: 10px;
      border: none;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
      margin-right: 10px;
    }

    #send-btn {
      border: none;
      border-radius: 5px;
      background-color: #3f51b5;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
      color: #fff;
      display: flex;
      cursor: pointer;
    }

    #new-btn {
      border: none;
      border-radius: 5px;
      background-color: white;
      box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
      color: black;
      display: flex;
      margin-left: 10px;
      padding: 10px 18px;
      cursor: pointer;
    }

    #send-btn span {
      padding: 10px;
    }

    #loader {
      display: none;
      color: #ffffff;
      font-size: 10px;
      text-indent: -9999em;
      overflow: hidden;
      width: 1em;
      height: 1em;
      border-radius: 50%;
      margin: auto;
      margin-right: 10px;
      position: relative;
      -webkit-transform: translateZ(0);
      -ms-transform: translateZ(0);
      transform: translateZ(0);
      -webkit-animation: load6 1.7s infinite ease, round 1.7s infinite ease;
      animation: load6 1.7s infinite ease, round 1.7s infinite ease;
    }

    #loader.loading {
      display: block;
    }

    @-webkit-keyframes load6 {
      0% {
        box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em,
          0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
      }
      5%,
      95% {
        box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em,
          0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
      }
      10%,
      59% {
        box-shadow: 0 -0.83em 0 -0.4em, -0.087em -0.825em 0 -0.42em,
          -0.173em -0.812em 0 -0.44em, -0.256em -0.789em 0 -0.46em,
          -0.297em -0.775em 0 -0.477em;
      }
      20% {
        box-shadow: 0 -0.83em 0 -0.4em, -0.338em -0.758em 0 -0.42em,
          -0.555em -0.617em 0 -0.44em, -0.671em -0.488em 0 -0.46em,
          -0.749em -0.34em 0 -0.477em;
      }
      38% {
        box-shadow: 0 -0.83em 0 -0.4em, -0.377em -0.74em 0 -0.42em,
          -0.645em -0.522em 0 -0.44em, -0.775em -0.297em 0 -0.46em,
          -0.82em -0.09em 0 -0.477em;
      }
      100% {
        box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em,
          0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
      }
    }
    @keyframes load6 {
      0% {
        box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em,
          0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
      }
      5%,
      95% {
        box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em,
          0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
      }
      10%,
      59% {
        box-shadow: 0 -0.83em 0 -0.4em, -0.087em -0.825em 0 -0.42em,
          -0.173em -0.812em 0 -0.44em, -0.256em -0.789em 0 -0.46em,
          -0.297em -0.775em 0 -0.477em;
      }
      20% {
        box-shadow: 0 -0.83em 0 -0.4em, -0.338em -0.758em 0 -0.42em,
          -0.555em -0.617em 0 -0.44em, -0.671em -0.488em 0 -0.46em,
          -0.749em -0.34em 0 -0.477em;
      }
      38% {
        box-shadow: 0 -0.83em 0 -0.4em, -0.377em -0.74em 0 -0.42em,
          -0.645em -0.522em 0 -0.44em, -0.775em -0.297em 0 -0.46em,
          -0.82em -0.09em 0 -0.477em;
      }
      100% {
        box-shadow: 0 -0.83em 0 -0.4em, 0 -0.83em 0 -0.42em,
          0 -0.83em 0 -0.44em, 0 -0.83em 0 -0.46em, 0 -0.83em 0 -0.477em;
      }
    }
    @-webkit-keyframes round {
      0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
      }
      100% {
        -webkit-transform: rotate(360deg);
        transform: rotate(360deg);
      }
    }
    @keyframes round {
      0% {
        -webkit-transform: rotate(0deg);
        transform: rotate(0deg);
      }
      100% {
        -webkit-transform: rotate(360deg);
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(style);
}

const createChatContainer = () => {
  const chatContainer = document.getElementById('chatbot-container');

  const chatHeader = document.createElement('div');
  chatHeader.classList.add('chat-header');
  chatHeader.textContent = 'Chat';
  chatContainer.innerHTML = `
    <div id="chat-container">
      <div class="chat-header">Chat</div>

      <div class="chat-body">
        <div id="messages-container"></div>
        <div id="input-container">
          <input
            type="text"
            id="user-input"
            placeholder="Type your message here..."
            required
          />
          <button id="send-btn">
            <span>Send</span>
            <div id="loader">Loading...</div>
          </button>

          <button id="new-btn">
            <span>New</span>
          </button>
        </div>
      </div>
    </div>

    <button type="button" id="chat-btn">M</button>
  `;
}

const showChatbot = () => {
  const chatbotContainer = document.getElementById("chat-container");
  visibleChatbot = !visibleChatbot;
  if (visibleChatbot) {
    chatbotContainer.classList.add('visible');
  } else {
    chatbotContainer.classList.remove('visible');
  }
}

const startNewChat = () => {
  if (isLoading) return;

  const messagesContainer = document.getElementById("messages-container");

  while (messages.length > 1) {
    messages.pop();
  }

  const initialMessage = "Hi, what would you like to know about these documents?";
  messages.push({
    message: initialMessage,
    type: "apiMessage",
  });

  messagesContainer.innerHTML = '';

  // Add the bot's message to the chat interface
  const botMessageContainer = document.createElement("div");
  botMessageContainer.classList.add("message-container", "bot-message");
  const botMessageElement = document.createElement("div");
  botMessageElement.classList.add("message");
  botMessageElement.innerText = initialMessage;
  botMessageContainer.appendChild(botMessageElement);
  messagesContainer.appendChild(botMessageContainer);
};

const sendMessage = async () => {
  const userInput = document.getElementById("user-input");
  const messagesContainer = document.getElementById("messages-container");

  // Get the user's input
  const message = userInput.value;
  console.log(messages);

  if (message === "" || isLoading) {
    return;
  }

  // Add the user's message to the chat interface
  const messageContainer = document.createElement("div");
  messageContainer.classList.add("message-container", "user-message");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");
  messageElement.innerText = message;
  messageContainer.appendChild(messageElement);
  messagesContainer.appendChild(messageContainer);

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Clear the input field
  userInput.value = "";

  // Make history
  var history = [];
  var historyItem = [];
  messages.forEach((item) => {
    if (item.type == "apiMessage") {
      historyItem = [];
      historyItem.push(item.message);
    } else {
      historyItem.push(item.message);
      history.push(historyItem);
    }
  });
  if (historyItem.length < 2) {
    historyItem.push('');
    history.push(historyItem);
  }
  console.log(history);

  messages.push({ type: "userMessage", message: message });

  setLoading(true);

  try {
    // Send the user's message to the OpenAI API
    const response = await fetch(serverUrl + '/api/chat', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-OpenAI-Key': openAIapiKey,
        'X-Pinecone-Key': pineconeApiKey,
        'X-Pinecone-Environment': pineconeEnvironment,
        'X-Pinecone-Index-Name': pineconeIndexName,
      },
      body: JSON.stringify({
        question: message,
        history: history,
        selectedNamespace: selectedNamespace,
        returnSourceDocuments: false,
        modelTemperature: 0.5
      }),
    }); 
  
    setLoading(false);

    const data = await response.json();

    if (data.error) {
      alert("The chatbot doesn't exist.");
      return;
    }
    
    const botMessage = data.text;
    messages.push({ role: "apiMessage", content: botMessage });
   
    // Add the bot's message to the chat interface
    const botMessageContainer = document.createElement("div");
    botMessageContainer.classList.add("message-container", "bot-message");
    const botMessageElement = document.createElement("div");
    botMessageElement.classList.add("message");
    botMessageElement.innerText = botMessage;
    botMessageContainer.appendChild(botMessageElement);
    messagesContainer.appendChild(botMessageContainer);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  } catch (e) {
    console.log(e);
    setLoading(false);
    alert("The chatbot doesn't exist.");
    return; 
  }
};

const setLoading = (loading) => {
  const loader = document.getElementById("loader");

  isLoading = loading;

  if (isLoading) loader.classList.add("loading");
  else loader.classList.remove("loading");
};

const initHandler = () => {
  document
    .getElementById("send-btn")
    .addEventListener("click", sendMessage);
  
  document
    .getElementById("chat-btn")
    .addEventListener("click", showChatbot);
  
  document
    .getElementById("new-btn")
    .addEventListener("click", startNewChat);
  
  document.addEventListener("keydown", function (event) {
    if (event.code === "Enter") {
      sendMessage();
    }
  });
}

const initChatbot = () => {
  const chatbotContainer = document.getElementById('chatbot-container');
  serverUrl = chatbotContainer.getAttribute("serverUrl");
  selectedNamespace = chatbotContainer.getAttribute("selectedNamespace");
  openAIapiKey = chatbotContainer.getAttribute("openAIapiKey");
  pineconeApiKey = chatbotContainer.getAttribute("pineconeApiKey");
  pineconeIndexName = chatbotContainer.getAttribute("pineconeIndexName");
  pineconeEnvironment = chatbotContainer.getAttribute("pineconeEnvironment");
  
  initStyle()
  createChatContainer();
  initHandler();

  startNewChat();
}

initChatbot();
