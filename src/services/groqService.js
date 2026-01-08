
import { getAuthToken } from '../utils/handleToken';
const API_URL = import.meta.env.VITE_API_URL;

// Helper to call Backend Proxy
const callGroqProxy = async (messages, model = "llama-3.3-70b-versatile", temperature = 0.7, response_format = null) => {
  const token = getAuthToken();
  try {
    const response = await fetch(`${API_URL}/interview/groq-proxy/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({
        messages,
        model,
        temperature,
        response_format
      })
    });

    if (!response.ok) {
      throw new Error(`Groq Proxy Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Groq Service Error:", error);
    return null;
  }
};

// System prompts
const OBSERVER_SYSTEM_PROMPT = `You are a "Silent Observer" in a coding interview. 
Your goal is to analyze the candidate's code for syntax errors, logic flaws, and time complexity.
Output a concise JSON summary of the user's status. 
Do NOT generate a chat response for the user. Just update the internal context.
JSON Schema:
{
  "hasSyntaxError": boolean,
  "syntaxErrorDetails": string | null,
  "logicFlaws": string[],
  "timeComplexity": string,
  "completionStatus": "not_started" | "in_progress" | "completed",
  "briefSummary": string
}`;

const INTERVIEWER_SYSTEM_PROMPT = `You are a helpful, encouraging, but rigorous technical interviewer.
Your goal is to guide the candidate without giving the answer.
Use a professional but friendly tone.
You have access to a "Silent Observer" analysis, BUT YOU MUST NEVER MENTION IT EXPLICITLY.
Do not say "The Silent Observer says..." or "My analysis shows...". 
Instead, integrate the feedback naturally.
For example, if the observer notes a syntax error, simply say "I noticed a small syntax issue on line X, could you check that?"
Do not write code for them.
Keep your responses concise and conversational.
CRITICAL: Stay focused on the current coding problem. Do NOT ask to "start fresh" or "switch topics". Dig deeper into their current thought process.`;

export const generateQuestion = async (role = 'Frontend Developer', difficulty = 'Medium') => {
  try {
    const completion = await callGroqProxy(
      [
        {
          role: "system",
          content: `Generate a unique coding problem for a ${role} at ${difficulty} level.
          Output strictly in JSON format with the following structure:
          {
            "title": "Problem Title",
            "description": "Problem Description (markdown supported)",
            "starting_code": "Language specific starter code",
            "test_cases": [
              { "input": "...", "output": "..." }
            ]
          }
          Do not include markdown code block syntax (backticks) in the output, just raw JSON.`
        },
        {
          role: "user",
          content: "Generate one problem."
        }
      ],
      "llama-3.3-70b-versatile",
      0.7,
      { type: "json_object" }
    );

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error("Error generating question:", error);
    // Fallback question if API fails
    return {
      title: "Reverse a Linked List",
      description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
      starting_code: "def reverseList(head):\n    # Your code here\n    pass",
      test_cases: []
    };
  }
};

export const analyzeCode = async (code, language) => {
  try {
    const completion = await callGroqProxy(
      [
        {
          role: "system",
          content: OBSERVER_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Language: ${language}\nCode:\n${code}`
        }
      ],
      "llama-3.1-8b-instant",
      0.1,
      { type: "json_object" }
    );

    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error("Error analyzing code:", error);
    return null;
  }
};

export const getChatResponse = async (history, latestAnalysis, currentCode) => {
  try {
    // Construct context-aware messages
    const messages = [
      { role: "system", content: INTERVIEWER_SYSTEM_PROMPT },
    ];

    if (latestAnalysis) {
      messages.push({
        role: "system",
        content: `Silent Observer Analysis: ${JSON.stringify(latestAnalysis)}\nCurrent Code:\n${currentCode}`
      });
    }

    // Append chat history (limit to last 10 messages for context window efficiency)
    const formattedHistory = history.slice(-10).map(msg => ({
      role: msg.sender === 'ai' ? 'assistant' : 'user',
      content: msg.text
    }));
    messages.push(...formattedHistory);

    const completion = await callGroqProxy(
      messages,
      "llama-3.3-70b-versatile",
      0.7
    );

    return completion.choices[0]?.message?.content || "I'm having trouble connecting. Could you repeat that?";
  } catch (error) {
    console.error("Error getting chat response:", error);
    return "I seem to be having connection issues. Please check your internet connection.";
  }
};

export const executeCode = async (code, language) => {
  try {
    const completion = await callGroqProxy(
      [
        {
          role: "system",
          content: `You are a code execution engine. 
          Your ONLY goal is to simulate the output of the provided code.
          - If the code has syntax errors, output the error message.
          - If the code runs successfully, output the console output.
          - Do NOT explain the code.
          - Do NOT provide suggestions.
          - Output ONLY the raw execution result.`
        },
        {
          role: "user",
          content: `Language: ${language}\nCode:\n${code}`
        }
      ],
      "llama-3.3-70b-versatile",
      0.1
    );

    return completion.choices[0]?.message?.content || "No output";
  } catch (error) {
    console.error("Error executing code:", error);
    return "Execution failed.";
  }
};

export const gradeCode = async (code, language, questionText) => {
  try {
    // Parse questionText if it's JSON
    let parsedQuestion = questionText;
    try {
      const parsed = JSON.parse(questionText);
      if (parsed.title && parsed.description) {
        parsedQuestion = `Title: ${parsed.title}\nDescription: ${parsed.description}`;
        if (parsed.examples) {
          parsedQuestion += `\nExamples: ${JSON.stringify(parsed.examples)}`;
        }
        if (parsed.constraints) {
          parsedQuestion += `\nConstraints: ${parsed.constraints}`;
        }
      }
    } catch {
      // Not JSON, use as-is
    }

    console.log("[GRADING] Question being evaluated:", parsedQuestion?.substring(0, 200) + "...");
    console.log("[GRADING] Code being evaluated:", code?.substring(0, 200) + "...");

    const completion = await callGroqProxy(
      [
        {
          role: "system",
          content: `You are a strict but fair technical interviewer grading a candidate's code.

Evaluate the code based on these criteria:
1. **Correctness (0-4 points)**: Does the code correctly solve the problem? Test mentally against edge cases.
2. **Code Quality (0-3 points)**: Is the code clean, well-structured, with good naming conventions?
3. **Efficiency (0-3 points)**: What is the time and space complexity? Is it optimal?

IMPORTANT GRADING GUIDELINES:
- Score 0-3: Code doesn't work or has major issues
- Score 4-5: Code has some issues or is incomplete
- Score 6-7: Code works but could be improved
- Score 8-9: Good, working solution with minor improvements possible
- Score 10: Perfect, optimal solution

Be strict! Don't give 8 by default. Actually evaluate the code against the problem.

Output strictly in JSON format:
{
  "score": number (0-10),
  "feedback": "Detailed assessment mentioning specific strengths and weaknesses, referencing actual code"
}`
        },
        {
          role: "user",
          content: `PROBLEM:\n${parsedQuestion}\n\nLANGUAGE: ${language}\n\nCANDIDATE'S CODE:\n\`\`\`${language}\n${code}\n\`\`\`\n\nEvaluate this code strictly. Does it actually solve the problem correctly?`
        }
      ],
      "llama-3.3-70b-versatile",
      0.2,  // Slightly higher temperature for more varied responses
      { type: "json_object" }
    );

    const result = JSON.parse(completion.choices[0]?.message?.content || '{"score": 0, "feedback": "Evaluation failed"}');
    console.log("[GRADING] Result:", result);
    return result;
  } catch (error) {
    console.error("Error grading code:", error);
    return { score: 0, feedback: "Evaluation failed - unable to grade code" };
  }
};
