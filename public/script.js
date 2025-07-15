const taskPrompts = {
  1: `You are a friendly assistant helping a student build a self-introduction presentation. Ask one question at a time to gather personal profile information such as name, birthday, hometown, school, hobbies, and favorite things. React warmly after each answer. If the English has small mistakes or sounds unnatural, gently suggest a clearer or more natural version, like 'You could also say: ...'. Avoid giving multiple questions at once. After gathering 7–9 items, say: 'Great job! You’ve finished Task 1. Let’s move on when you’re ready.'`,
  2: `You are continuing to help the student. This time, guide them to reflect on their personality using simple yes/no questions, one at a time, like in an MTGI test. Be supportive and help them express themselves in basic English. After each answer, react naturally and suggest clearer phrasing when necessary. Do not list all questions at once. After 8–10 questions, summarize their personality using 3–5 traits (e.g., calm, curious, detail-oriented). Make it clear when the task is complete. The result will be used later to create Slide 3: My Personality Analysis.`,
  3: `You are helping the student discover their core message and presentation theme. Begin by asking them to talk about their interests or what they like to do. Ask one open-ended question at a time, using simple language and giving relatable examples (e.g., drawing, helping others, cooking, etc.). React supportively and ask follow-up questions as needed. Suggest a few possible themes based on what they share, such as 'Creative spirit with quiet confidence' or 'Sports lover with leadership dreams'. Be sure to keep the tone encouraging and conversational.`,
  4: `Help the student turn their answers into a self-introduction presentation. Based on what they shared in Tasks 1 to 3, **create a complete slide outline with 5-7 distinct slides in a single, comprehensive response. Provide the entire outline at once.** Each slide should have a clear title and slide content only (no narration). Slide 1 should be a table with fields like: Name, Birthday, Hometown, Others (left column) and their answers (right column). Slide 2 should be keywords only (e.g., Calm / Curious / Independent). Do not include narration here — narration will be created in Task 5. Do not ask for additional information unless absolutely necessary to complete the core outline. At the end of the complete outline, confirm: 'Would you like to move on to the narration practice next?'`,
  5: `You are a helpful presentation coach. Based on the *entire* context of the student's self-introduction (summaries from Tasks 1-3, and the generated slide outline from Task 4), **generate the complete narration for all 5-7 slides at once in a single, comprehensive response.** Ensure the narration flows naturally from one slide to the next, enhancing the content of each slide without just repeating it. Write in a clear, engaging tone consistent with the student's personality. Do not ask follow-up questions or offer iterative help; provide the full draft narration immediately. At the end, confirm: 'That’s a great draft! Would you like to practice reading it out loud or revise anything?'`
};

const starterUserMessages = {
  1: "Let's begin Task 1. Please start asking questions to gather profile information.",
  2: "Let’s begin Task 2. Please start with personality-related questions.",
  3: "Let’s begin Task 3. Please ask what has influenced the student.",
  4: "Let’s begin Task 4. Help the student build their slides.",
  5: "Let’s begin Task 5. Help the student refine their final script."
};

let chatHistories = {}; // Stores chat history for each task

function createTask(taskNum, title, description) {
  const container = document.getElementById("taskContainer");
  const section = document.createElement("div");
  section.className = "section";
  section.innerHTML = `
    <h2>Task ${taskNum}: ${title}</h2>
    <p>${description}</p>
    <button onclick="startTask(${taskNum})">Start Task ${taskNum}</button>
    <button onclick="resetTask(${taskNum})" style="background-color: #e74c3c;">🗑 Reset</button>
    <div id="chat${taskNum}" class="chat-box" style="display:none;"></div>
    <textarea id="input${taskNum}" placeholder="Type here..." style="display:none;"></textarea><br>
    <button id="send${taskNum}" style="display:none;" onclick="sendToGPT(${taskNum})">Send</button>
    <button onclick="lookupSelectedText()" style="margin-top:10px; background-color: #f39c12;">📖 What does it mean?</button>
  `;
  container.appendChild(section);
}

// Initialize tasks when the script loads
createTask(1, "Basic Profile", "Start the conversation to collect your personal profile.");
createTask(2, "Personality Reflection", "Reflect on your personality traits through questions.");
createTask(3, "Discover Your Theme", "Explore what shaped you and your message.");
createTask(4, "Slide Planning", "Organize your content into presentation slides.");
createTask(5, "Narration Practice", "Finalize your speech and improve it together.");

async function resetTask(taskNum) {
  document.getElementById(`chat${taskNum}`).innerText = "";
  document.getElementById(`input${taskNum}`).value = "";
  document.getElementById(`chat${taskNum}`).style.display = "none";
  document.getElementById(`input${taskNum}`).style.display = "none";
  document.getElementById(`send${taskNum}`).style.display = "none";
  // Clear chat history for the specific task
  delete chatHistories[taskNum];
}

async function startTask(taskNum) {
    const chatBox = document.getElementById(`chat${taskNum}`);
    const inputBox = document.getElementById(`input${taskNum}`);
    const sendBtn = document.getElementById(`send${taskNum}`);
    chatBox.style.display = inputBox.style.display = sendBtn.style.display = "block";
    inputBox.disabled = true; // Disable input while loading
    sendBtn.disabled = true; // Disable send button while loading

    let initialMessages = [];

    if (taskNum === 4 || taskNum === 5) { // MODIFIED HERE: Add taskNum === 5
        chatBox.innerText = "⏳ Gathering information from previous tasks...\n\n";
        try {
            // Get summaries from previous tasks
            // Ensure chatHistories[1], [2], [3] exist and are not empty before attempting to summarize
            const summary1 = chatHistories[1] ? await summarizeChat(chatHistories[1], "key personal profile details (name, birthday, hometown, school, hobbies, favorite things)") : null;
            const summary2 = chatHistories[2] ? await summarizeChat(chatHistories[2], "3-5 personality traits identified and discussed") : null;
            const summary3 = chatHistories[3] ? await summarizeChat(chatHistories[3], "main interests and potential presentation themes identified") : null;

            // For Task 5, also summarize Task 4's output (the slide outline)
            const summary4 = (taskNum === 5 && chatHistories[4]) ? await summarizeChat(chatHistories[4], "the complete slide outline with titles and content generated for the presentation") : null;

            // Construct a richer initial message for Task 4 or Task 5
            let enrichedStarterMessage = starterUserMessages[taskNum];
            if (summary1 || summary2 || summary3 || summary4) { // Only add if at least one summary is available
                enrichedStarterMessage += "\n\nHere is a summary of the information gathered in previous tasks:";
                if (summary1 && summary1 !== null) enrichedStarterMessage += `\n- Task 1 Profile: ${summary1}`;
                if (summary2 && summary2 !== null) enrichedStarterMessage += `\n- Task 2 Personality: ${summary2}`;
                if (summary3 && summary3 !== null) enrichedStarterMessage += `\n- Task 3 Theme: ${summary3}`;
                if (summary4 && summary4 !== null) enrichedStarterMessage += `\n- Task 4 Slide Outline: ${summary4}`; // Add Task 4 summary for Task 5
            }

            initialMessages = [
                { role: "system", content: taskPrompts[taskNum] },
                { role: "user", content: enrichedStarterMessage }
            ];

        } catch (err) {
            console.error("Error gathering summaries for Task 4/5:", err); // Error message update
            chatBox.innerText = "❌ Failed to gather previous task information. Starting task without full context."; // Error message update
            initialMessages = [ // Fallback to original if summary fails
                { role: "system", content: taskPrompts[taskNum] },
                { role: "user", content: starterUserMessages[taskNum] }
            ];
        }
    } else {
        // For other tasks, use the standard initial messages
        initialMessages = [
            { role: "system", content: taskPrompts[taskNum] },
            { role: "user", content: starterUserMessages[taskNum] }
        ];
    }

    // Initialize chat history for this task with the determined initial messages
    chatHistories[taskNum] = initialMessages;
    chatBox.innerText = "⏳ Loading initial ChatGPT response..."; // Update loading message

    try {
        // Use fetch to your backend /api/chat endpoint
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistories[taskNum] }),
        });

        // IMPORTANT FIX: Ensure this line correctly handles the response if it was changed
        // from 'res.json()' to 'response.json()' in your local code for some reason.
        // It should generally be 'res.json()' here.
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`Server error (${res.status}): ${errorData.error || res.statusText}`);
        }

        const message = await res.json(); // Backend now sends the full message object
        if (message) {
            chatHistories[taskNum].push(message);
            chatBox.innerText = `ChatGPT: ${message.content}`;
        } else {
            chatBox.innerText = "(No message returned)";
        }
    } catch (err) {
        console.error('Error in startTask:', err);
        chatBox.innerText = `❌ Failed to load ChatGPT response: ${err.message}`;
    } finally {
        inputBox.disabled = false; // Re-enable input
        sendBtn.disabled = false; // Re-enable send button
    }
}
// Utility function to summarize a chat history via the server
async function summarizeChat(chatHistory, purpose) {
  if (!chatHistory || chatHistory.length === 0) {
    console.warn(`Attempted to summarize empty or null chat history for purpose: ${purpose}`);
    return null; // Return null if there's no history to summarize
  }
  try {
    const response = await fetch('/api/summarize-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatHistory: chatHistory, summaryPurpose: purpose }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Server error (${response.status}): ${errorData.error || response.statusText}`);
    }

    const summary = await response.json();
    return summary;
  } catch (error) {
    console.error(`Error fetching summary for purpose "${purpose}":`, error);
    return `[Error summarizing ${purpose}]`; // Return an error message to display
  }
}
async function sendToGPT(taskNum) {
  const inputBox = document.getElementById(`input${taskNum}`);
  const chatBox = document.getElementById(`chat${taskNum}`);
  const userMessage = inputBox.value.trim();
  if (!userMessage) return;

  chatBox.innerText += `\n\nYou: ${userMessage}`;
  inputBox.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  chatHistories[taskNum].push({ role: "user", content: userMessage });

  chatBox.innerText += `\n\nChatGPT: ⏳ Thinking...`;
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: chatHistories[taskNum] })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorData.error.message}`);
    }

    const data = await res.json();
    // Corrected line: server.js now sends the message object directly
    const message = data; // Changed from data.choices?.[0]?.message;

    const lastChatContent = chatBox.innerText;
    chatBox.innerText = lastChatContent.replace(/\n\nChatGPT: ⏳ Thinking...$/, '');

    if (message) {
      chatHistories[taskNum].push(message);
      chatBox.innerText += `\n\nChatGPT: ${message.content}`;
    } else {
      chatBox.innerText += `\n\nChatGPT: (No message returned)`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    const lastChatContent = chatBox.innerText;
    chatBox.innerText = lastChatContent.replace(/\n\nChatGPT: ⏳ Thinking...$/, '');
    chatBox.innerText += `\n\n❌ Failed to get response: ${err.message}`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Dictionary and Glossary functions
let currentLookupWord = '';

async function lookupSelectedText() {
  const text = window.getSelection().toString().trim();
  if (!text) {
    alert("Please highlight a word or phrase first.");
    return;
  }

  currentLookupWord = text;

  const popup = document.getElementById('dictionaryPopup');
  const dictWord = document.getElementById('dictWord');
  const dictDefinition = document.getElementById('dictDefinition');
  const playAudioBtn = document.getElementById('playAudioBtn');

  dictWord.innerText = text;
  dictDefinition.innerText = '⏳ Loading...';
  playAudioBtn.style.display = 'none';
  popup.style.display = 'block';

  try {
    // Fetch English definition
    const resEn = await fetch("/api/define-en", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });

    if (!resEn.ok) {
      const errorData = await resEn.json();
      throw new Error(`API error (EN): ${resEn.status} ${resEn.statusText} - ${errorData.error.message}`);
    }
    const dataEn = await resEn.json();
    // Corrected line: server.js for /api/define-en sends the content string directly
    const definition = dataEn; // Changed from dataEn.choices?.[0]?.message?.content || 'No English definition found.';

    // Fetch Japanese meaning
    const resJp = await fetch("/api/define-jp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });

    if (!resJp.ok) {
      const errorData = await resJp.json();
      throw new Error(`API error (JP): ${resJp.status} ${resJp.statusText} - ${errorData.error.message}`);
    }
    const jpData = await resJp.json();
    // Corrected line: server.js for /api/define-jp sends the content string directly
    const jpMeaning = jpData; // Changed from jpData.choices?.[0]?.message?.content || '（日本語の意味は見つかりませんでした）';

    dictDefinition.innerHTML = `${definition}<br><br><em>（日本語の意味）</em> ${jpMeaning}`;
    playAudioBtn.style.display = 'inline-block';

  } catch (err) {
    dictDefinition.innerText = `Error: ${err.message}`;
    playAudioBtn.style.display = 'none';
  }
}

function closePopup() {
  document.getElementById('dictionaryPopup').style.display = 'none';
  currentLookupWord = '';
}

function confirmAddToGlossary() {
  const word = document.getElementById('dictWord').innerText;
  const def = document.getElementById('dictDefinition').innerHTML;
  const glossaryTableBody = document.querySelector('#glossary-table tbody');

  const existingRows = glossaryTableBody.querySelectorAll('tr');
  for (let i = 0; i < existingRows.length; i++) {
    if (existingRows[i].cells[0].innerText === word) {
      alert(`"${word}" is already in your glossary.`);
      closePopup();
      return;
    }
  }

  const row = document.createElement('tr');
  row.innerHTML = `<td>${word}</td><td>${def}</td>`;
  glossaryTableBody.appendChild(row);
  closePopup();
}

// Text-to-Speech function
document.getElementById('playAudioBtn').addEventListener('click', async () => {
  const textToSpeak = document.getElementById('dictWord').innerText;
  if (!textToSpeak) return;

  try {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';

    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google') || voice.lang === 'en-US');

    if (englishVoice) {
      utterance.voice = englishVoice;
    } else {
      console.warn("No suitable English-US voice found. Using default.");
    }

    window.speechSynthesis.speak(utterance);

  } catch (error) {
    console.error("Error playing audio:", error);
    alert("Sorry, text-to-speech failed. Your browser might not support it or there was an error.");
  }
});

// --- Japanese to English Translator Feature ---

// Get references to the new HTML elements
const jpInput = document.getElementById('jpInput');
const translateJpBtn = document.getElementById('translateJpBtn');
const enOutput = document.getElementById('enOutput');

// Add event listener to the new button
translateJpBtn.addEventListener('click', async () => {
    const japaneseText = jpInput.value.trim();
    if (!japaneseText) {
        enOutput.innerHTML = '<p style="color:red;">Please enter some Japanese text to translate.</p>';
        return;
    }

    enOutput.innerHTML = '<p>⏳ Translating...</p>'; // Loading indicator

    try {
        const res = await fetch("/api/translate-jp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: japaneseText })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`API error: ${res.status} ${res.statusText} - ${errorData.error || 'Unknown error'}`);
        }

        const englishTranslation = await res.json(); // Server sends back just the content string

        enOutput.innerHTML = `<p>${englishTranslation}</p>`; // Display the translation
    } catch (error) {
        console.error("Error with Japanese to English translation:", error);
        enOutput.innerHTML = `<p style="color:red;">❌ Translation failed: ${error.message}.</p>`;
    }
});You're right, the errors indicate that it has not improved yet. We need to address two primary issues based on the console errors you're seeing:

1.  **`ReferenceError: summarizeChat is not defined`**: This error, visible in `image_be1fe1.png`, indicates that the browser is running an older cached version of your `script.js` file. Even though the `script.js` you provided contains the `summarizeChat` function, the one your browser is loading doesn't recognize it.
2.  **`Failed to load ChatGPT response: Unexpected token 'T', "The page c"... is not valid JSON`**: This error appears in `image_263d57.jpg` and `image_25d131.jpg`. This means your frontend is making a request to your backend (`/api/chat`), but the backend isn't sending back valid JSON data. Instead, it's likely sending an HTML error page (like a 404 or 500 page). This suggests an issue with your Node.js server itself.

Additionally, the `script.js` file you've provided still appears to be an older version, missing some crucial updates we discussed previously regarding the prompts for Task 4 and Task 5, and the logic in `startTask` for handling Task 5's context.

**To resolve these problems, you must ensure two things:**

1.  **Your local `public/script.js` file is completely up-to-date.**
2.  **Your Node.js server is running the correct `server.js` and serving the API routes properly.**

---

**Here's the plan to fix this:**

**Step 1: Update Your `public/script.js` File (Crucial!)**

Please replace the entire content of your `public/script.js` file with the following code. This version includes all the necessary updates for `taskPrompts`, `startTask` to handle summaries for both Task 4 and Task 5, and the `summarizeChat` function.

```javascript
const taskPrompts = {
  1: `You are a friendly assistant helping a student build a self-introduction presentation. Ask one question at a time to gather personal profile information such as name, birthday, hometown, school, hobbies, and favorite things. React warmly after each answer. If the English has small mistakes or sounds unnatural, gently suggest a clearer or more natural version, like 'You could also say: ...'. Avoid giving multiple questions at once. After gathering 7–9 items, say: 'Great job! You’ve finished Task 1. Let’s move on when you’re ready.'`,
  2: `You are continuing to help the student. This time, guide them to reflect on their personality using simple yes/no questions, one at a time, like in an MTGI test. Be supportive and help them express themselves in basic English. After each answer, react naturally and suggest clearer phrasing when necessary. Do not list all questions at once. After 8–10 questions, summarize their personality using 3–5 traits (e.g., calm, curious, detail-oriented). Make it clear when the task is complete. The result will be used later to create Slide 3: My Personality Analysis.`,
  3: `You are helping the student discover their core message and presentation theme. Begin by asking them to talk about their interests or what they like to do. Ask one open-ended question at a time, using simple language and giving relatable examples (e.g., drawing, helping others, cooking, etc.). React supportively and ask follow-up questions as needed. Suggest a few possible themes based on what they share, such as 'Creative spirit with quiet confidence' or 'Sports lover with leadership dreams'. Be sure to keep the tone encouraging and conversational.`,
  4: `Help the student turn their answers into a self-introduction presentation. Based on what they shared in Tasks 1 to 3, **create a complete slide outline with 5-7 distinct slides in a single, comprehensive response. Provide the entire outline at once.** Each slide should have a clear title and slide content only (no narration). Slide 1 should be a table with fields like: Name, Birthday, Hometown, Others (left column) and their answers (right column). Slide 2 should be keywords only (e.g., Calm / Curious / Independent). Do not include narration here — narration will be created in Task 5. Do not ask for additional information unless absolutely necessary to complete the core outline. At the end of the complete outline, confirm: 'Would you like to move on to the narration practice next?'`,
  5: `You are a helpful presentation coach. Based on the *entire* context of the student's self-introduction (summaries from Tasks 1-3, and the generated slide outline from Task 4), **generate the complete narration for all 5-7 slides at once in a single, comprehensive response.** Ensure the narration flows naturally from one slide to the next, enhancing the content of each slide without just repeating it. Write in a clear, engaging tone consistent with the student's personality. Do not ask follow-up questions or offer iterative help; provide the full draft narration immediately. At the end, confirm: 'That’s a great draft! Would you like to practice reading it out loud or revise anything?'`
};

const starterUserMessages = {
  1: "Let's begin Task 1. Please start asking questions to gather profile information.",
  2: "Let’s begin Task 2. Please start with personality-related questions.",
  3: "Let’s begin Task 3. Please ask what has influenced the student.",
  4: "Let’s begin Task 4. Help the student build their slides.",
  5: "Let’s begin Task 5. Help the student refine their final script."
};

let chatHistories = {}; // Stores chat history for each task

function createTask(taskNum, title, description) {
  const container = document.getElementById("taskContainer");
  const section = document.createElement("div");
  section.className = "section";
  section.innerHTML = `
    <h2>Task ${taskNum}: ${title}</h2>
    <p>${description}</p>
    <button onclick="startTask(${taskNum})">Start Task ${taskNum}</button>
    <button onclick="resetTask(${taskNum})" style="background-color: #e74c3c;">🗑 Reset</button>
    <div id="chat${taskNum}" class="chat-box" style="display:none;"></div>
    <textarea id="input${taskNum}" placeholder="Type here..." style="display:none;"></textarea><br>
    <button id="send${taskNum}" style="display:none;" onclick="sendToGPT(${taskNum})">Send</button>
    <button onclick="lookupSelectedText()" style="margin-top:10px; background-color: #f39c12;">📖 What does it mean?</button>
  `;
  container.appendChild(section);
}

// Initialize tasks when the script loads
createTask(1, "Basic Profile", "Start the conversation to collect your personal profile.");
createTask(2, "Personality Reflection", "Reflect on your personality traits through questions.");
createTask(3, "Discover Your Theme", "Explore what shaped you and your message.");
createTask(4, "Slide Planning", "Organize your content into presentation slides.");
createTask(5, "Narration Practice", "Finalize your speech and improve it together.");

async function resetTask(taskNum) {
  document.getElementById(`chat${taskNum}`).innerText = "";
  document.getElementById(`input${taskNum}`).value = "";
  document.getElementById(`chat${taskNum}`).style.display = "none";
  document.getElementById(`input${taskNum}`).style.display = "none";
  document.getElementById(`send${taskNum}`).style.display = "none";
  // Clear chat history for the specific task
  delete chatHistories[taskNum];
}

async function startTask(taskNum) {
    const chatBox = document.getElementById(`chat${taskNum}`);
    const inputBox = document.getElementById(`input${taskNum}`);
    const sendBtn = document.getElementById(`send${taskNum}`);
    chatBox.style.display = inputBox.style.display = sendBtn.style.display = "block";
    inputBox.disabled = true; // Disable input while loading
    sendBtn.disabled = true; // Disable send button while loading

    let initialMessages = [];

    if (taskNum === 4 || taskNum === 5) { // MODIFIED HERE: Add taskNum === 5
        chatBox.innerText = "⏳ Gathering information from previous tasks...\n\n";
        try {
            // Get summaries from previous tasks
            // Ensure chatHistories[1], [2], [3] exist and are not empty before attempting to summarize
            const summary1 = chatHistories[1] ? await summarizeChat(chatHistories[1], "key personal profile details (name, birthday, hometown, school, hobbies, favorite things)") : null;
            const summary2 = chatHistories[2] ? await summarizeChat(chatHistories[2], "3-5 personality traits identified and discussed") : null;
            const summary3 = chatHistories[3] ? await summarizeChat(chatHistories[3], "main interests and potential presentation themes identified") : null;

            // For Task 5, also summarize Task 4's output (the slide outline)
            const summary4 = (taskNum === 5 && chatHistories[4]) ? await summarizeChat(chatHistories[4], "the complete slide outline with titles and content generated for the presentation") : null;

            // Construct a richer initial message for Task 4 or Task 5
            let enrichedStarterMessage = starterUserMessages[taskNum];
            if (summary1 || summary2 || summary3 || summary4) { // Only add if at least one summary is available
                enrichedStarterMessage += "\n\nHere is a summary of the information gathered in previous tasks:";
                if (summary1 && summary1 !== null) enrichedStarterMessage += `\n- Task 1 Profile: ${summary1}`;
                if (summary2 && summary2 !== null) enrichedStarterMessage += `\n- Task 2 Personality: ${summary2}`;
                if (summary3 && summary3 !== null) enrichedStarterMessage += `\n- Task 3 Theme: ${summary3}`;
                if (summary4 && summary4 !== null) enrichedStarterMessage += `\n- Task 4 Slide Outline: ${summary4}`; // Add Task 4 summary for Task 5
            }

            initialMessages = [
                { role: "system", content: taskPrompts[taskNum] },
                { role: "user", content: enrichedStarterMessage }
            ];

        } catch (err) {
            console.error("Error gathering summaries for Task 4/5:", err); // Error message update
            chatBox.innerText = "❌ Failed to gather previous task information. Starting task without full context."; // Error message update
            initialMessages = [ // Fallback to original if summary fails
                { role: "system", content: taskPrompts[taskNum] },
                { role: "user", content: starterUserMessages[taskNum] }
            ];
        }
    } else {
        // For other tasks, use the standard initial messages
        initialMessages = [
            { role: "system", content: taskPrompts[taskNum] },
            { role: "user", content: starterUserMessages[taskNum] }
        ];
    }

    // Initialize chat history for this task with the determined initial messages
    chatHistories[taskNum] = initialMessages;
    chatBox.innerText = "⏳ Loading initial ChatGPT response..."; // Update loading message

    try {
        // Use fetch to your backend /api/chat endpoint
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistories[taskNum] }),
        });

        // IMPORTANT FIX: Ensure this line correctly handles the response if it was changed
        // from 'res.json()' to 'response.json()' in your local code for some reason.
        // It should generally be 'res.json()' here.
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`Server error (${res.status}): ${errorData.error || res.statusText}`);
        }

        const message = await res.json(); // Backend now sends the full message object
        if (message) {
            chatHistories[taskNum].push(message);
            chatBox.innerText = `ChatGPT: ${message.content}`;
        } else {
            chatBox.innerText = "(No message returned)";
        }
    } catch (err) {
        console.error('Error in startTask:', err);
        chatBox.innerText = `❌ Failed to load ChatGPT response: ${err.message}`;
    } finally {
        inputBox.disabled = false; // Re-enable input
        sendBtn.disabled = false; // Re-enable send button
    }
}
// Utility function to summarize a chat history via the server
async function summarizeChat(chatHistory, purpose) {
  if (!chatHistory || chatHistory.length === 0) {
    console.warn(`Attempted to summarize empty or null chat history for purpose: ${purpose}`);
    return null; // Return null if there's no history to summarize
  }
  try {
    const response = await fetch('/api/summarize-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatHistory: chatHistory, summaryPurpose: purpose }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Server error (${response.status}): ${errorData.error || response.statusText}`);
    }

    const summary = await response.json();
    return summary;
  } catch (error) {
    console.error(`Error fetching summary for purpose "${purpose}":`, error);
    return `[Error summarizing ${purpose}]`; // Return an error message to display
  }
}
async function sendToGPT(taskNum) {
  const inputBox = document.getElementById(`input${taskNum}`);
  const chatBox = document.getElementById(`chat${taskNum}`);
  const userMessage = inputBox.value.trim();
  if (!userMessage) return;

  chatBox.innerText += `\n\nYou: ${userMessage}`;
  inputBox.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  chatHistories[taskNum].push({ role: "user", content: userMessage });

  chatBox.innerText += `\n\nChatGPT: ⏳ Thinking...`;
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ messages: chatHistories[taskNum] })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`API error: ${res.status} ${res.statusText} - ${errorData.error.message}`);
    }

    const data = await res.json();
    // Corrected line: server.js now sends the message object directly
    const message = data; // Changed from data.choices?.[0]?.message;

    const lastChatContent = chatBox.innerText;
    chatBox.innerText = lastChatContent.replace(/\n\nChatGPT: ⏳ Thinking...$/, '');

    if (message) {
      chatHistories[taskNum].push(message);
      chatBox.innerText += `\n\nChatGPT: ${message.content}`;
    } else {
      chatBox.innerText += `\n\nChatGPT: (No message returned)`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    const lastChatContent = chatBox.innerText;
    chatBox.innerText = lastChatContent.replace(/\n\nChatGPT: ⏳ Thinking...$/, '');
    chatBox.innerText += `\n\n❌ Failed to get response: ${err.message}`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// Dictionary and Glossary functions
let currentLookupWord = '';

async function lookupSelectedText() {
  const text = window.getSelection().toString().trim();
  if (!text) {
    alert("Please highlight a word or phrase first.");
    return;
  }

  currentLookupWord = text;

  const popup = document.getElementById('dictionaryPopup');
  const dictWord = document.getElementById('dictWord');
  const dictDefinition = document.getElementById('dictDefinition');
  const playAudioBtn = document.getElementById('playAudioBtn');

  dictWord.innerText = text;
  dictDefinition.innerText = '⏳ Loading...';
  playAudioBtn.style.display = 'none';
  popup.style.display = 'block';

  try {
    // Fetch English definition
    const resEn = await fetch("/api/define-en", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });

    if (!resEn.ok) {
      const errorData = await resEn.json();
      throw new Error(`API error (EN): ${resEn.status} ${resEn.statusText} - ${errorData.error.message}`);
    }
    const dataEn = await resEn.json();
    // Corrected line: server.js for /api/define-en sends the content string directly
    const definition = dataEn; // Changed from dataEn.choices?.[0]?.message?.content || 'No English definition found.';

    // Fetch Japanese meaning
    const resJp = await fetch("/api/define-jp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text })
    });

    if (!resJp.ok) {
      const errorData = await resJp.json();
      throw new Error(`API error (JP): ${resJp.status} ${resJp.statusText} - ${errorData.error.message}`);
    }
    const jpData = await resJp.json();
    // Corrected line: server.js for /api/define-jp sends the content string directly
    const jpMeaning = jpData; // Changed from jpData.choices?.[0]?.message?.content || '（日本語の意味は見つかりませんでした）';

    dictDefinition.innerHTML = `${definition}<br><br><em>（日本語の意味）</em> ${jpMeaning}`;
    playAudioBtn.style.display = 'inline-block';

  } catch (err) {
    dictDefinition.innerText = `Error: ${err.message}`;
    playAudioBtn.style.display = 'none';
  }
}

function closePopup() {
  document.getElementById('dictionaryPopup').style.display = 'none';
  currentLookupWord = '';
}

function confirmAddToGlossary() {
  const word = document.getElementById('dictWord').innerText;
  const def = document.getElementById('dictDefinition').innerHTML;
  const glossaryTableBody = document.querySelector('#glossary-table tbody');

  const existingRows = glossaryTableBody.querySelectorAll('tr');
  for (let i = 0; i < existingRows.length; i++) {
    if (existingRows[i].cells[0].innerText === word) {
      alert(`"${word}" is already in your glossary.`);
      closePopup();
      return;
    }
  }

  const row = document.createElement('tr');
  row.innerHTML = `<td>${word}</td><td>${def}</td>`;
  glossaryTableBody.appendChild(row);
  closePopup();
}

// Text-to-Speech function
document.getElementById('playAudioBtn').addEventListener('click', async () => {
  const textToSpeak = document.getElementById('dictWord').innerText;
  if (!textToSpeak) return;

  try {
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'en-US';

    const voices = speechSynthesis.getVoices();
    const englishVoice = voices.find(voice => voice.lang === 'en-US' && voice.name.includes('Google') || voice.lang === 'en-US');

    if (englishVoice) {
      utterance.voice = englishVoice;
    } else {
      console.warn("No suitable English-US voice found. Using default.");
    }

    window.speechSynthesis.speak(utterance);

  } catch (error) {
    console.error("Error playing audio:", error);
    alert("Sorry, text-to-speech failed. Your browser might not support it or there was an error.");
  }
});

// --- Japanese to English Translator Feature ---

// Get references to the new HTML elements
const jpInput = document.getElementById('jpInput');
const translateJpBtn = document.getElementById('translateJpBtn');
const enOutput = document.getElementById('enOutput');

// Add event listener to the new button
translateJpBtn.addEventListener('click', async () => {
    const japaneseText = jpInput.value.trim();
    if (!japaneseText) {
        enOutput.innerHTML = '<p style="color:red;">Please enter some Japanese text to translate.</p>';
        return;
    }

    enOutput.innerHTML = '<p>⏳ Translating...</p>'; // Loading indicator

    try {
        const res = await fetch("/api/translate-jp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: japaneseText })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`API error: ${res.status} ${res.statusText} - ${errorData.error || 'Unknown error'}`);
        }

        const englishTranslation = await res.json(); // Server sends back just the content string

        enOutput.innerHTML = `<p>${englishTranslation}</p>`; // Display the translation
    } catch (error) {
        console.error("Error with Japanese to English translation:", error);
        enOutput.innerHTML = `<p style="color:red;">❌ Translation failed: ${error.message}.</p>`;
    }
});