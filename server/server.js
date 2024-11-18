require("dotenv").config();

const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT;

// Enable CORS for all routes
app.use(cors());

// SSE Endpoint
app.get("/recipeStream", (req, res) => {
  const ingredients = req.query.ingredients;
  const mealType = req.query.mealType;
  const cuisine = req.query.cuisine;
  const cookingTime = req.query.cookingTime;
  const complexity = req.query.complexity;

  console.log(req.query)

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Function to send messages
  const sendEvent = (chunk) => {
    let chunkResponse;
    if (chunk.choices[0].finish_reason === "stop") {
      res.write(`data: ${JSON.stringify({ action: "close" })}\n\n`);
    } else {
      if (
        chunk.choices[0].delta.role &&
        chunk.choices[0].delta.role === "assistant"
      ) {
        chunkResponse = {
          action: "start",
        };
      } else {
        chunkResponse = {
          action: "chunk",
          chunk: chunk.choices[0].delta.content,
        };
      }
      res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
    }
  };

  const prompt = [];
    prompt.push("Generate a recipe that incorporates the following details:");
    prompt.push(`[Ingredients: ${ingredients}]`);
    prompt.push(`[Meal Type: ${mealType}]`);
    prompt.push(`[Cuisine Preference: ${cuisine}]`);
    prompt.push(`[Cooking Time: ${cookingTime}]`);
    prompt.push(`[Complexity: ${complexity}]`);
    prompt.push("Please provide a detailed recipe, including the following sections:");

    prompt.push("- A recipe name in the local language based on the cuisine preference.");
    prompt.push("- A list of ingredients with their exact measurements.");
    prompt.push("- A detailed set of instructions broken into numbered steps. Each step should be clear, concise, and logically ordered.");
    prompt.push("- Optional: If the recipe has a suggested garnish, side dish, or variation, please include it at the end.");
    prompt.push("Please format the instructions in a way that makes it easy for a user to follow. Separate each instruction step with a blank line to improve readability.");
    prompt.push("Ensure that the recipe highlights the fresh and vibrant flavors of the ingredients.");
    prompt.push("Only use the ingredients provided in the list, and be sure to stay within the specified cooking time and complexity.");


  const messages = [
    {
      role: "system",
      content: prompt.join(" "),
    },
  ];
  fetchOpenAICompletionsStream(messages, sendEvent);

  // Clear interval and close connection on client disconnect
  req.on("close", () => {
    res.end();
  });
});

async function fetchOpenAICompletionsStream(messages, callback) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


  const aiModel = "gpt-4-1106-preview";
  try {
    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: messages,
      temperature: 1,
      stream: true,
    });

    for await (const chunk of completion) {
      callback(chunk);
    }
  } catch (error) {
    console.error("Error fetching data from OpenAI API:", error);
    throw new Error("Error fetching data from OpenAI API.");
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});