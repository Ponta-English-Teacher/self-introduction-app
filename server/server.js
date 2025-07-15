require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai'); // Correct import for OpenAI SDK v4

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.json()); // Enable JSON body parsing

// Serve static files from the 'public' directory
app.use(express.static('public')); // This assumes server.js is run from the project root or public is relative

// Initialize OpenAI client with API key from environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- API Endpoints ---

// API endpoint for ChatGPT completions
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // Or any other model you're using
      messages: messages,
    });
    res.json(completion.choices[0].message); // Frontend expects full message object for chat
  } catch (error) {
    console.error('Error communicating with OpenAI API:', error);
    if (error.response) {
      // Log the full response data from OpenAI for debugging
      console.error('OpenAI API Error Response Data:', error.response.data);
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(500).json({ error: 'No response received from OpenAI API.' });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({ error: error.message });
    }
  }
});

// API endpoint for dictionary lookups (English)
app.post('/api/define-en', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for definition.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful dictionary assistant, providing concise definitions for English learners." },
        { role: "user", content: `Define the phrase "${text}" simply for an English learner.` }
      ],
      max_tokens: 150
    });
    res.json(completion.choices[0].message.content); // Frontend expects direct content string for definitions
  } catch (error) {
    console.error('Error defining English text:', error);
    if (error.response) {
      console.error('OpenAI API Error Response Data (EN):', error.response.data);
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// API endpoint for dictionary lookups (Japanese)
app.post('/api/define-jp', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for Japanese definition.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a Japanese academic assistant, providing concise definitions in Japanese for university students." },
        { role: "user", content: `日本語で簡単に「${text}」の意味を一言で説明してください（大学生向け）。` }
      ],
      max_tokens: 150
    });
    res.json(completion.choices[0].message.content); // Frontend expects direct content string for definitions
  } catch (error) {
    console.error('Error defining Japanese text:', error);
    if (error.response) { // This block was added for detailed logging
      console.error('OpenAI API Error Response Data (JP):', error.response.data);
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// API endpoint for Japanese to English translation
app.post('/api/translate-jp', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Japanese text is required for translation.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // You can use "gpt-3.5-turbo" for faster/cheaper if preferred
      messages: [
        { role: "system", content: "You are a helpful English language tutor. Your task is to take Japanese input and provide the most natural and common English translation or expression. If the Japanese phrase has nuances, briefly explain them. Provide only the English translation/expression and explanation, do not chat." },
        { role: "user", content: `Please provide the natural English translation/expression for: ${text}` }
      ],
      max_tokens: 200 // Adjust as needed
    });
    res.json(completion.choices[0].message.content); // Send back only the content string
  } catch (error) {
    console.error('Error translating Japanese text:', error);
    if (error.response) {
      console.error('OpenAI API Error Response Data (Translate JP):', error.response.data);
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// API endpoint for summarizing chat history
app.post('/api/summarize-chat', async (req, res) => {
  const { chatHistory, summaryPurpose } = req.body; // chatHistory is an array of messages, summaryPurpose is a string

  if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0 || !summaryPurpose) {
    return res.status(400).json({ error: 'Chat history array and summary purpose are required for summarization.' });
  }

  try {
    const messagesToSend = [
      { role: "system", content: `You are a helpful assistant. Your task is to concisely summarize the provided conversation history based on the following purpose: ${summaryPurpose}. Focus only on the key facts, decisions, or information relevant to the purpose. Do not chat or add extra commentary.` },
      ...chatHistory, // Append the actual chat history
      { role: "user", content: `Please provide the summary as requested: ${summaryPurpose}.` } // Final instruction for summary
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messagesToSend,
      max_tokens: 300 // Adjust as needed for summary length
    });
    res.json(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error summarizing chat history:', error);
    if (error.response) {
      console.error('OpenAI API Error Response Data (Summarize Chat):', error.response.data);
      res.status(error.response.status).json({ error: error.response.data });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});


// Start the server (This should be the ONLY app.listen call in the entire file)
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Open your application at http://localhost:${port}/index.html`);
});