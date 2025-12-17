import { toast } from "@/components/ui/use-toast";

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const RATE_LIMIT = {
  requestsPerMinute: 12,
  requestQueue: [] as { resolve: Function; reject: Function; fn: Function; retries: number }[],
  inProgress: 0,
  lastRequestTime: 0,
  maxRetries: 3,
  baseRetryDelay: 2000,
  dailyQuota: 1500,
  usageKey: 'gemini_api_usage',
  queueLock: false,
  maxQueueSize: 5,
};

let apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

const initApiKey = () => {
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log("Gemini API key loaded from environment variable");
    return true;
  }
  if (typeof window !== 'undefined') {
    const storedKey = sessionStorage.getItem('gemini_api_key');
    if (storedKey) {
      apiKey = storedKey;
      console.log("Gemini API key loaded from sessionStorage");
      return true;
    }
  }
  console.warn("No Gemini API key found");
  return false;
};

initApiKey();

export const setGeminiApiKey = (key: string) => {
  if (key && key.trim()) {
    apiKey = key.trim();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('gemini_api_key', apiKey);
    }
    console.log("Gemini API key set and stored in session");
    return true;
  }
  return false;
};

export const getGeminiApiKey = () => {
  if (typeof window !== 'undefined') {
    return apiKey || sessionStorage.getItem('gemini_api_key') || '';
  }
  return apiKey || '';
};

export const hasGeminiApiKey = () => {
  return !!getGeminiApiKey();
};

const trackApiUsage = () => {
  if (typeof window === 'undefined') return 0;

  const usage = JSON.parse(localStorage.getItem(RATE_LIMIT.usageKey) || '{}');
  const today = new Date().toISOString().split('T')[0];
  usage[today] = (usage[today] || 0) + 1;
  localStorage.setItem(RATE_LIMIT.usageKey, JSON.stringify(usage));
  if (usage[today] >= RATE_LIMIT.dailyQuota * 0.9) {
    toast({
      title: "API Quota Warning",
      description: "Approaching daily API limit. Please provide a new API key or wait for quota reset.",
      // variant: "warning",
    });
  }
  return usage[today];
};

export const validateApiKey = async (key: string): Promise<boolean> => {
  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Test request to validate API key" }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.log("API key validation response:", response.status, errorData);
      if (response.status === 429) {
        toast({
          title: "API Quota Exhausted",
          description: "The provided Gemini API key has no remaining quota. Please use a new key or enable billing.",
          variant: "destructive",
        });
        return false;
      }
      if (response.status === 401) {
        toast({
          title: "Invalid API Key",
          description: "The provided Gemini API key is invalid. Please check and try again.",
          variant: "destructive",
        });
        return false;
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error("API key validation failed:", error);
    toast({
      title: "Validation Error",
      description: "Failed to validate the API key. Please try again or use a different key.",
      variant: "destructive",
    });
    return false;
  }
};

const processQueue = () => {
  if (RATE_LIMIT.queueLock || RATE_LIMIT.requestQueue.length === 0 || RATE_LIMIT.inProgress >= RATE_LIMIT.requestsPerMinute) {
    return;
  }

  RATE_LIMIT.queueLock = true;

  const now = Date.now();
  const elapsed = now - RATE_LIMIT.lastRequestTime;
  const minInterval = 5000;

  if (elapsed < minInterval && RATE_LIMIT.inProgress > 0) {
    const delay = minInterval - elapsed;
    console.log(`Throttling requests, waiting ${delay}ms before next request. Queue size: ${RATE_LIMIT.requestQueue.length}`);
    setTimeout(() => {
      RATE_LIMIT.queueLock = false;
      processQueue();
    }, delay);
    return;
  }

  const request = RATE_LIMIT.requestQueue.shift();
  if (!request) {
    RATE_LIMIT.queueLock = false;
    return;
  }

  RATE_LIMIT.inProgress++;
  RATE_LIMIT.lastRequestTime = now;

  request
    .fn()
    .then((result: any) => {
      request.resolve(result);
    })
    .catch((error: any) => {
      request.reject(error);
    })
    .finally(() => {
      RATE_LIMIT.inProgress--;
      RATE_LIMIT.queueLock = false;
      setTimeout(processQueue, 1000);
    });
};

const queueRequest = <T>(fn: () => Promise<T>, retries: number = 0): Promise<T> => {
  if (RATE_LIMIT.requestQueue.length >= RATE_LIMIT.maxQueueSize) {
    console.warn("Request queue full, dropping request");
    return Promise.reject(new Error("Request queue overloaded"));
  }
  return new Promise((resolve, reject) => {
    RATE_LIMIT.requestQueue.push({ resolve, reject, fn, retries });
    processQueue();
  });
};

interface GeminiOptions {
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  role?: string;
  skillLevel?: string;
  memory?: string;
  hrTone?: string;
}

export const generateInterviewQuestion = async (
  jobDescription: string,
  previousQuestions: string[] = [],
  previousAnswers: string[] = [],
  options: GeminiOptions = {}
) => {
  if (!apiKey) {
    initApiKey();
  }

  if (!apiKey) {
    toast({
      title: "API Key Missing",
      description: "Please provide a valid Gemini API key for generative responses",
      variant: "destructive",
    });
    throw new Error("Gemini API key not set");
  }

  const defaultOptions = {
    temperature: 0.8,
    maxOutputTokens: 1000,
    topK: 40,
    topP: 0.95,
    role: "General",
    skillLevel: "Intermediate",
    ...options,
  };

  const lastMessage = previousAnswers.length > 0 ? previousAnswers[previousAnswers.length - 1].toLowerCase() : "";
  const isInfoQuestion =
    lastMessage.startsWith("what is") ||
    lastMessage.startsWith("what are") ||
    lastMessage.startsWith("how does") ||
    lastMessage.startsWith("why is") ||
    lastMessage.includes("?");

  // --- CHANGE START ---
  const prompt = `
 You are a highly professional and conversational HR interviewer for the ${defaultOptions.role} role at the ${defaultOptions.skillLevel} level. Your responsibility is to conduct a smooth, natural interview by responding to the candidate’s input and asking relevant, tailored questions based on the job description and conversation history.

Job Description:
${jobDescription || "No specific job description provided. Generate general interview questions for the role."}

Conversation History:
${previousQuestions
      .map((q, i) => `Interviewer: ${q}\nCandidate: ${previousAnswers[i] || "No response"}`)
      .join("\n")}

User’s Latest Input:
${lastMessage || "Starting the interview"}

Candidate Memory (context from previous answers):
${defaultOptions.memory || "No memory collected yet."}

Preferred HR Interview Tone:
${defaultOptions.hrTone || "friendly-conversational"}

---------------------------------------
INSTRUCTIONS (FOLLOW STRICTLY)
---------------------------------------

1. Generate **one single combined response** that feels like a real human interviewer speaking.  
   - Either: answer the user (if they asked info) and then ask a related interview question  
   - Or: acknowledge their previous answer and ask a follow-up  
   - Or: if starting, ask the first interview question  
   - Or: if no response, proceed with a new relevant question

2. When starting the interview:
   Begin directly with a complete interview question like:  
   “To start, could you walk me through your background and how it relates to this role?”  
   Do **not** generate standalone greetings (“Hello”, “Hi”, etc.).

3. If the user's latest input is an informational question (e.g., “What is software?”):
   - Provide a clear, simple explanation  
   - THEN immediately ask a related interview question tied to the ${defaultOptions.role} role

4. If the user answered a previous question:
   - Briefly acknowledge their answer using natural human phrasing:  
     “Thanks for explaining that.”  
     “That’s helpful to know.”  
     “I appreciate the detail.”  
   - Then ask a relevant follow-up question based on their response content

5. If the user hasn’t responded (empty input):
   Ask a new interview question suitable for the ${defaultOptions.role} role and ${defaultOptions.skillLevel} level.

6. Use the job description heavily to keep questions specific, role-aligned, and realistic.

7. Keep your tone:
   - Professional  
   - Friendly  
   - Natural  
   - Interview-like  
   (Avoid robotic tone or generic textbook questions.)

8. **SPOKEN-STYLE LANGUAGE (CRITICAL FOR HUMAN SOUND)**:
   - Use contractions ALWAYS: "I'm", "you're", "don't", "that's", "let's", "we're", "it's"
   - Use casual connectors: "So,", "Well,", "I mean,", "You know,", "Honestly,", "Actually,"
   - Use natural reactions: "that's interesting!", "Right, I see.", "Hmm, okay.", "Got it."
   - Use encouraging phrases: "That's great.", "I love that.", "Makes sense.", "No worries."
   - Avoid formal phrases like: "I appreciate you sharing", "Could you elaborate", "Please describe", "Kindly explain"
   - Instead use: "Tell me more about...", "How'd that go?", "What was that like?", "Walk me through..."
   - Sound like you're having a casual coffee chat, not reading from a script

8. Greeting logic:
   If user says “hi”, “hello”, etc. → reply briefly (“Nice to meet you!”)  
   Then immediately ask the first interview question.  
   No standalone greetings in any other scenario.

9. If the user says “bye”, “goodbye”, or wants to stop:
   Provide a polite wrap-up and suggest ending the interview.

10. Never repeat questions already asked in the conversation history.

11. Ensure questions match the candidate’s declared skill level:
    - Beginner → simpler questions  
    - Intermediate → scenario questions  
    - Advanced → deeper technical or behavioural follow-ups

12. Output Rule:
    - **Only output the final interviewer message**  
    - **No explanations, no system notes, no prefixes**  
    - **One single flowing message ending with a clear question**

---------------------------------------
EXAMPLES
---------------------------------------

User: “What is software?”  
Response:  
“Software refers to the programs and instructions that enable a computer to perform tasks. For this role, could you tell me about a software project you've worked on and what your responsibilities were?”

User: “I worked on a web app using React.”  
Response:  
“Nice — working with React often involves managing component structure and state. Could you walk me through a challenge you faced on that project and how you solved it?”

User: (no input)  
Response:  
“To begin, could you walk me through your background and the experiences that make you a good fit for this role?”

---------------------------------------

Generate ONLY the final interviewer response.
 `;
  // --- CHANGE END ---


  const makeRequest = async (retries: number = 0): Promise<string> => {
    if (trackApiUsage() >= RATE_LIMIT.dailyQuota) {
      toast({
        title: "API Quota Exhausted",
        description: "Daily API limit reached. Please provide a new API key or wait for quota reset.",
        variant: "destructive",
      });
      throw new Error("API quota exhausted");
    }

    try {
      console.log(
        "Calling Gemini API with key:",
        apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4)
      );

      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: defaultOptions.temperature,
            maxOutputTokens: defaultOptions.maxOutputTokens,
            topK: defaultOptions.topK,
            topP: defaultOptions.topP,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", response.status, errorText);

        if (response.status === 429) {
          toast({
            title: "Rate Limit Reached",
            description: `API quota exceeded. Retrying in 33s (attempt ${retries + 1}/${RATE_LIMIT.maxRetries}).`,
            variant: "destructive",
          });
          if (retries < RATE_LIMIT.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 33000));
            return makeRequest(retries + 1);
          }
          throw new Error("Rate limit exceeded after max retries");
        }

        if (retries < RATE_LIMIT.maxRetries) {
          const retryDelay = RATE_LIMIT.baseRetryDelay * Math.pow(2, retries);
          console.log(`Error occurred, retrying in ${retryDelay}ms (attempt ${retries + 1}/${RATE_LIMIT.maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return makeRequest(retries + 1);
        }

        toast({
          title: "Error Generating Response",
          description: "Failed to generate response after retries. Please try again.",
          variant: "destructive",
        });
        throw new Error("Failed to generate response after retries");
      }

      const data = await response.json();
      const responseText = data.candidates[0].content.parts[0].text.trim();
      console.log("Generated question:", responseText);
      if (!responseText || responseText.toLowerCase() === "hello" || responseText.toLowerCase() === "hey there") {
        throw new Error("Invalid partial greeting received from Gemini API");
      }
      return responseText;
    } catch (error) {
      console.error("Error generating response:", error);
      throw error;
    }
  };

  return queueRequest(() => makeRequest());
};