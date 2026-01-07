
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Mic, Send, Play, CheckCircle, Clock, AlertTriangle, Terminal, Code2, MessageSquare, BookOpen, User, Bot, Volume2, Moon, Sun, Sparkles } from 'lucide-react';
import { generateQuestion, analyzeCode, getChatResponse, executeCode, gradeCode } from '../services/groqService';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getAuthToken, fetchWithToken } from '../utils/handleToken';
const base_url = import.meta.env.VITE_API_URL;

const DEFAULT_QUESTIONS = {
    "genai": {
        id: "default-genai",
        question: "Design and implement a basic prompt template system. Your function should take a template string like 'Hello {name}, welcome to {place}' and a dictionary (object) of values, and return the formatted string. Handle cases where keys are missing or extra values are provided.",
        starting_code: "def format_prompt(template, values):\n    # Your code here\n    pass"
    },
    "backend": {
        id: "default-backend",
        question: "Implement a simple LRU (Least Recently Used) cache with 'get' and 'put' operations. The cache should have a fixed capacity and maintain the order of recently accessed items.",
        starting_code: "class LRUCache:\n    def __init__(self, capacity):\n        self.capacity = capacity\n        self.cache = {}\n\n    def get(self, key):\n        pass\n\n    def put(self, key, value):\n        pass"
    },
    "frontend": {
        id: "default-frontend",
        question: "Write a function that flattens a deeply nested object into a single-level object with dot-notation keys. For example: {a: {b: 1, c: {d: 2}}} becomes {'a.b': 1, 'a.c.d': 2}.",
        starting_code: "function flattenObject(obj) {\n    // Your code here\n}"
    },
    "generic": {
        id: "default-generic",
        question: "Write a function to find the longest palindromic substring in a given string. Discuss the time and space complexity of your solution.",
        starting_code: "def longest_palindrome(s):\n    # Your code here\n    pass"
    }
};

const CodingRound = () => {
    const navigate = useNavigate();

    // Core State
    const [problem, setProblem] = useState(null);
    const [code, setCode] = useState("// Loading environment...");
    const [language, setLanguage] = useState("python");
    const [output, setOutput] = useState("");

    // Chat & AI State
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [assistanceCount, setAssistanceCount] = useState(0);
    const [codingInteractions, setCodingInteractions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    // Utilities State
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
    const [activeTab, setActiveTab] = useState("problem");
    const [isDark, setIsDark] = useState(false);
    const [isStarted, setIsStarted] = useState(false); // New state for Welcome Screen

    // Refs
    const recognitionRef = useRef(null);
    const chatEndRef = useRef(null);
    const observerIntervalRef = useRef(null);

    const { sessionId } = useParams();

    // Initial Load
    useEffect(() => {
        const initSession = async () => {
            if (!sessionId) {
                console.error("No Session ID found in URL.");
                // Load generic default if session ID is missing to avoid white screen
                const fallback = DEFAULT_QUESTIONS.generic;
                setCodingInteractions([{ question: fallback, assistance_count: 0, messages: [] }]);
                setProblem(fallback);
                setCode(fallback.starting_code);
                return;
            }

            console.time("CodingRound_InitSession");
            const token = getAuthToken();
            try {
                const response = await fetchWithToken(
                    `${base_url}/interview/get-coding-questions/${sessionId}/`,
                    token,
                    navigate
                );
                console.timeEnd("CodingRound_InitSession");

                const data = response?.interactions || [];
                const postTitle = (response?.post_title || "").toLowerCase();

                if (data && data.length > 0) {
                    setCodingInteractions(data);
                    const interaction = data[0];
                    setCurrentQuestionIndex(0);
                    setProblem(interaction.question);
                    setAssistanceCount(interaction.assistance_count);
                    setCode(interaction.code || interaction.question.starting_code || "# Write your solution here");
                    setMessages(interaction.messages || [{
                        id: 1,
                        sender: 'ai',
                        text: `Welcome to the Live Coding Round! I'm your interviewer today. We'll be working on ${data.length} problems. Let's start with: "${interaction.question.question.substring(0, 50)}...". Feel free to ask clarifying questions.`
                    }]);
                } else {
                    // IMPLEMENT DEFAULTS
                    console.warn("No coding questions found for this interview. Loading defaults...");
                    let fallback;
                    if (postTitle.includes("genai") || postTitle.includes("ai")) fallback = DEFAULT_QUESTIONS.genai;
                    else if (postTitle.includes("backend")) fallback = DEFAULT_QUESTIONS.backend;
                    else if (postTitle.includes("frontend")) fallback = DEFAULT_QUESTIONS.frontend;
                    else fallback = DEFAULT_QUESTIONS.generic;

                    const defaultInteraction = {
                        question: fallback,
                        assistance_count: 0,
                        code: fallback.starting_code,
                        messages: []
                    };

                    setCodingInteractions([defaultInteraction]);
                    setProblem(fallback);
                    setCode(fallback.starting_code);
                    setMessages([{
                        id: 1,
                        sender: 'ai',
                        text: `Welcome! I've prepared a ${postTitle || 'technical'} challenge for you. Let's look at: "${fallback.question.substring(0, 50)}...".`
                    }]);
                }
            } catch (err) {
                console.timeEnd("CodingRound_InitSession");
                console.error("Error fetching coding questions:", err);
                const fallback = DEFAULT_QUESTIONS.generic;
                setProblem(fallback);
                setCode(fallback.starting_code);
            }
        };
        initSession();

        // Silent Observer Interval (3 mins)
        observerIntervalRef.current = setInterval(() => {
            runObserver();
        }, 3 * 60 * 1000);

        return () => clearInterval(observerIntervalRef.current);
    }, [sessionId]);

    // Timer - only run if started
    useEffect(() => {
        if (!isStarted) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isStarted]);

    // Screenshot capture (assuming processScreenshot and log are defined elsewhere or imported)
    useEffect(() => {
        // Start async process - delay by 5 seconds to avoid freezing the initial load
        console.log('Scheduling async screenshot process in 5 seconds...');
        const timer = setTimeout(() => {
            // processScreenshot(); // Uncomment and define/import processScreenshot if needed
        }, 5000);

        return () => {
            clearTimeout(timer);
            console.log('Component unmounting - screenshot timer cleared');
        };
    }, [isStarted]); // This effect runs when isStarted changes

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Speech Recognition Setup
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputText(prev => prev + " " + transcript);
                setIsListening(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech error", event);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleMic = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const handleStart = () => {
        setIsStarted(true);
        speakText(messages[0]?.text || "Welcome to the coding round.");
    };

    // --- Logic Functions ---

    const runObserver = async () => {
        console.log("Silent Observer Triggered...");
        const analysis = await analyzeCode(code, language);
        if (analysis?.hasSyntaxError || analysis?.logicFlaws?.length > 0) {
            // If critical issues found, implicit update to AI context (handled in getChatResponse)
            // For UI, we might show a subtle indicator or just rely on the user asking for help.
            // But per requirements: "Trigger: User sends a message OR the 'Observer' flags a critical error."
            // If critical, the AI interviewer *could* interject.
            if (analysis.hasSyntaxError) {
                // Optional: proactively offering help
                // const aiMsg = await getChatResponse(messages, analysis, code);
                // setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: aiMsg }]);
            }
        }
        return analysis; // Return for use in other functions
    };

    const handleRunCode = async () => {
        if (!code.trim()) return;

        setOutput("Running code...\n(Sent to execution engine)\n");
        const execOutput = await executeCode(code, language);

        setOutput((prev) => `> Executing ${language} script...\n\n${execOutput}\n\nExecution finished.`);

        // Also trigger observer on run
        await runObserver();
    };

    // Helper function to continue to next round - can be used by other components too
    const continueToNextRound = async (sessionId, roundType) => {
        const token = getAuthToken();
        try {
            console.log(`[CONTINUE] Continuing to ${roundType} round for session ${sessionId}`);

            const response = await fetchWithToken(
                `${base_url}/interview/continue-session/${sessionId}/`,
                token,
                navigate,
                "POST",
                {
                    round_type: roundType
                }
            );

            console.log(`[CONTINUE] ${roundType} round initialized:`, response);
            return response;
        } catch (error) {
            console.error(`[CONTINUE] Error initializing ${roundType} round:`, error);
            throw error;
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() || isThinking) return;

        const userMsg = { id: Date.now(), sender: 'user', text: inputText };
        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setIsThinking(true);

        try {
            // Check assistance limit
            if (assistanceCount >= 3) {
                const limitMessage = { id: Date.now() + 1, sender: 'ai', text: "I'm sorry, I cannot provide any more assistance as you have reached the maximum limit of 3 helps for this question." };
                setMessages(prev => [...prev, limitMessage]);
                setIsThinking(false);
                return;
            }

            const currentInteraction = codingInteractions[currentQuestionIndex];

            // Call backend to record assistance ONLY if we have a real interaction
            if (currentInteraction && !String(currentInteraction.question?.id || "").startsWith("default-")) {
                const token = getAuthToken();
                const assistanceData = await fetchWithToken(
                    `${base_url}/interview/coding-assistance/${sessionId}/${currentInteraction.question.id}/`,
                    token,
                    navigate,
                    "POST"
                );

                if (assistanceData) {
                    setAssistanceCount(assistanceData.assistance_count);
                }
            } else {
                // If default, just increment local count
                setAssistanceCount(prev => prev + 1);
            }

            // Get AI Response
            const observerCtx = await analyzeCode(code, language);
            const responseText = await getChatResponse(messages, observerCtx, code);

            const aiMessage = { id: Date.now() + 1, sender: 'ai', text: responseText };
            setMessages(prev => [...prev, aiMessage]);

            // Speak the response
            speakText(responseText);
        } catch (error) {
            console.error("Chat Error:", error);
            const errorMessage = { id: Date.now() + 1, sender: 'ai', text: "I'm having trouble connecting to my brain. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    const speakText = (text) => {
        if (!window.speechSynthesis) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Try to select a "natural" or "Google" voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Microsoft Zira") || v.name.includes("Natural"));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    };

    const { interviewId } = useParams();

    const handleQuestionSelect = async (index) => {
        if (index === currentQuestionIndex) return;

        // Save current code progress before switching
        try {
            const token = getAuthToken();
            const currentInteraction = codingInteractions[currentQuestionIndex];
            await fetchWithToken(
                `${base_url}/interview/add-coding-scores/${sessionId}/${currentInteraction.question.id}/`,
                token,
                navigate,
                "POST",
                { code: code, score: null }
            );
        } catch (err) {
            console.error("Error saving progress during switch:", err);
        }

        const nextInteraction = codingInteractions[index];
        setCurrentQuestionIndex(index);
        setProblem(nextInteraction.question);
        setAssistanceCount(nextInteraction.assistance_count);
        setCode(nextInteraction.code || nextInteraction.question.starting_code || "# Write your solution here");
        setMessages(prev => [...prev, {
            id: Date.now(),
            sender: 'ai',
            text: `Switched to Question ${index + 1}: ${nextInteraction.question.question.substring(0, 50)}...`
        }]);
    };

    const handleSubmit = async () => {
        console.log(">>>>>>>>> NEW handleSubmit in CodingRound.jsx IS BEING CALLED <<<<<<<<<");
        if (!sessionId) {
            console.error("No session ID found");
            navigate("/");
            return;
        }

        try {
            const token = getAuthToken();
            const currentInteraction = codingInteractions[currentQuestionIndex];

            console.log(`[SUBMIT] Starting submission process for session ${sessionId}`);

            // Step 1: Save the current code progress
            if (currentInteraction && !String(currentInteraction.question?.id || "").startsWith("default-")) {
                console.log(`[SUBMIT] Grading code for question ${currentInteraction.question.id}`);

                try {
                    // Grade the code using AI
                    const grading = await gradeCode(
                        code,
                        language,
                        currentInteraction.question.question
                    );

                    console.log("[SUBMIT] AI Grading Result:", grading);

                    // Save the graded code
                    await fetchWithToken(
                        `${base_url}/interview/add-coding-scores/${sessionId}/${currentInteraction.question.id}/`,
                        token,
                        navigate,
                        "POST",
                        {
                            code: code,
                            score: grading.score,
                            feedback: grading.feedback
                        }
                    );

                    console.log("[SUBMIT] Code saved successfully");
                } catch (gradeError) {
                    console.error("[SUBMIT] Error grading/saving code:", gradeError);
                    // Continue even if grading fails
                }
            } else {
                console.log("[SUBMIT] Skipping grading for default question");
            }

            // Step 2: Mark coding round as completed
            console.log("[SUBMIT] Updating coding round status to completed");
            try {
                await fetchWithToken(
                    `${base_url}/interview/update-session-status/${sessionId}/`,
                    token,
                    navigate,
                    "PATCH",
                    {
                        status: 'completed',
                        round_type: 'coding'
                    }
                );
                console.log("[SUBMIT] Coding round marked as completed");
            } catch (statusError) {
                console.error("[SUBMIT] Error updating status:", statusError);
                // Continue anyway
            }

            // Step 3: Initialize the next round (interview/resume round)
            console.log("[SUBMIT] Initializing interview round");
            try {
                const continueResponse = await fetchWithToken(
                    `${base_url}/interview/continue-session/${sessionId}/`,
                    token,
                    navigate,
                    "POST",
                    {
                        round_type: 'interview'
                    }
                );

                console.log("[SUBMIT] Interview round initialized:", continueResponse);
            } catch (initError) {
                console.error("[SUBMIT] Error initializing interview round:", initError);
                // Show error but allow user to proceed
                const shouldContinue = window.confirm(
                    "There was an error initializing the next round. Do you want to continue anyway? (You may need to refresh the next page)"
                );

                if (!shouldContinue) {
                    return;
                }
            }

            // Step 4: Navigate to the next round
            alert("Coding Round Complete! Moving to Interview Round...");
            console.log(`[SUBMIT] Navigating to /resume-platform/${sessionId}`);
            navigate(`/resume-platform/${sessionId}`);

        } catch (err) {
            console.error("[SUBMIT] Critical error during submission:", err);

            // Show detailed error to user
            const errorMessage = err.response?.data?.error || err.message || "Unknown error occurred";
            const shouldContinue = window.confirm(
                `Error during submission: ${errorMessage}\n\nDo you want to continue to the next round anyway?`
            );

            if (shouldContinue) {
                // Try to at least initialize the next round
                try {
                    const token = getAuthToken();
                    await fetchWithToken(
                        `${base_url}/interview/continue-session/${sessionId}/`,
                        token,
                        navigate,
                        "POST",
                        { round_type: 'interview' }
                    );
                } catch (fallbackError) {
                    console.error("[SUBMIT] Fallback initialization failed:", fallbackError);
                }

                navigate(`/resume-platform/${sessionId}`);
            }
        }
    };

    // Finish Test: ensure all coding interactions are saved and then proceed to next round
    const handleFinish = async () => {
        console.log('>>> Finish Test invoked');
        if (!sessionId) {
            console.error('No session ID found');
            navigate('/');
            return;
        }
        const token = getAuthToken();
        // Iterate over all interactions and save code + optional grading
        for (let idx = 0; idx < codingInteractions.length; idx++) {
            const interaction = codingInteractions[idx];
            const qId = interaction.question?.id;
            if (!qId || String(qId).startsWith('default-')) {
                // Skip default placeholder questions
                continue;
            }
            try {
                // Grade code if possible
                let grading = {};
                try {
                    grading = await gradeCode(code, language, interaction.question.question);
                } catch (e) {
                    console.warn('Grading failed for question', qId, e);
                }
                await fetchWithToken(
                    `${base_url}/interview/add-coding-scores/${sessionId}/${qId}/`,
                    token,
                    navigate,
                    "POST",
                    {
                        code: code,
                        score: grading.score || null,
                        feedback: grading.feedback || null,
                    }
                );
                console.log(`[FINISH] Saved interaction ${qId}`);
            } catch (err) {
                console.error('Error saving interaction during finish', err);
            }
        }
        // Mark coding round completed
        try {
            await fetchWithToken(
                `${base_url}/interview/update-session-status/${sessionId}/`,
                token,
                navigate,
                "PATCH",
                { status: 'completed', round_type: 'coding' }
            );
        } catch (e) {
            console.error('Error marking coding round completed', e);
        }
        // Proceed to interview (resume) round
        try {
            const continueResponse = await fetchWithToken(
                `${base_url}/interview/continue-session/${sessionId}/`,
                token,
                navigate,
                "POST",
                { round_type: 'interview' }
            );
            console.log('Interview round initialized after finish:', continueResponse);
        } catch (e) {
            console.error('Error initializing interview round after finish', e);
        }
        alert('All answers saved. Moving to Interview Round...');
        navigate(`/resume-platform/${sessionId}`);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // --- Render ---

    if (!isStarted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-lavender-50 flex items-center justify-center p-4">
                <div className="bg-white/70 backdrop-blur-xl p-12 rounded-3xl border border-purple-200/50 shadow-2xl max-w-lg w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-purple-200 to-transparent rounded-full -translate-x-16 -translate-y-16"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-lavender-200 to-transparent rounded-full translate-x-12 translate-y-12"></div>

                    <div className="relative z-10">
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-8 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-8 shadow-lg">
                            <Code2 size={48} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent mb-6">
                            Live Coding Interview
                        </h1>
                        <p className="text-purple-700 mb-8 text-lg leading-relaxed">
                            Welcome to the Technical Assessment. You'll be solving a coding problem with the assistance of our AI Interviewer. The session is proctored.
                        </p>
                        <div className="flex items-center justify-center space-x-6 mb-8 text-sm text-purple-600">
                            <div className="flex items-center space-x-2">
                                <Volume2 className="w-5 h-5" />
                                <span>Voice Enabled</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Clock className="w-5 h-5" />
                                <span>30 Minutes</span>
                            </div>
                        </div>
                        <button
                            onClick={handleStart}
                            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-10 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:from-purple-700 hover:to-purple-800"
                        >
                            Start Assessment
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen flex flex-col ${isDark ? 'bg-gray-900 text-white' : 'bg-[#F9FAFB] text-gray-800'} transition-colors duration-300`}>
            {/* Header */}
            <header className={`h-16 px-6 flex items-center justify-between border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm z-10`}>
                <div className="flex items-center space-x-4">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                        <Code2 className="text-emerald-600 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Live Coding Interview</h1>
                        <span className="text-xs text-gray-500 font-medium">Coding Round Assessment</span>
                    </div>
                </div>

                {/* Question Navigator */}
                <div className="flex items-center space-x-2">
                    {codingInteractions.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleQuestionSelect(idx)}
                            className={`w-10 h-10 rounded-xl font-bold transition-all ${currentQuestionIndex === idx
                                ? 'bg-emerald-600 text-white shadow-lg scale-110'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            Q{idx + 1}
                        </button>
                    ))}
                </div>

                <div className="flex items-center space-x-6">
                    <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-md hover:bg-gray-100 transition">
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 text-gray-600" />}
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <main className="flex-1 flex overflow-hidden">

                {/* Left: Editor Area (65%) */}
                <div className="w-[65%] flex flex-col border-r border-gray-200 relative">
                    {/* Toolbar */}
                    <div className={`h-14 flex items-center justify-between px-4 space-x-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400 font-mono hidden sm:inline">Editor</span>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Timer */}
                            <div className={`flex items-center space-x-2 px-3 py-1 rounded-md bg-gray-50 border border-gray-200`}>
                                <Clock className={`w-3.5 h-3.5 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
                                <span className={`font-mono font-bold text-sm ${timeLeft < 300 ? 'text-red-500' : 'text-gray-700'}`}>{formatTime(timeLeft)}</span>
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-md font-medium text-xs transition shadow-sm flex items-center space-x-1"
                            >
                                <span>Submit</span>
                                <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                            {/* Finish Test button */}
                            <button
                                onClick={handleFinish}
                                className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md font-medium text-xs transition shadow-sm flex items-center space-x-1"
                            >
                                <span>Finish Test</span>
                            </button>

                            <div className="h-4 w-px bg-gray-300 mx-2"></div>

                            {/* Language Selector */}
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} hidden sm:inline`}>Language:</span>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className={`text-sm border rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
                                >
                                    <option value="python">Python</option>
                                    <option value="javascript">JavaScript</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                </select>
                            </div>

                            {/* Run Button */}
                            <button
                                onClick={handleRunCode}
                                className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-2 transition border border-emerald-200"
                            >
                                <Play className="w-4 h-4" />
                                <span>Run</span>
                            </button>
                        </div>
                    </div>

                    {/* Monaco Editor */}
                    <div className="flex-1 relative">
                        {/* Editor Overlay for Loading */}
                        {!problem && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                            </div>
                        )}
                        <Editor
                            height="100%"
                            language={language}
                            theme={isDark ? "vs-dark" : "light"}
                            value={code}
                            onChange={(value) => setCode(value)}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                wordWrap: 'on',
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                padding: { top: 16 },
                                // DISABLE PASTE
                                dragAndDrop: false,
                                contextmenu: false,
                            }}
                            onMount={(editor) => {
                                // Enforcing no paste
                                editor.onKeyDown((e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        alert("Paste is disabled for this round!");
                                    }
                                });
                            }}
                        />
                    </div>

                    {/* Terminal / Output */}
                    <div className={`h-48 border-t ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'} flex flex-col`}>
                        <div className="px-4 py-2 border-b border-gray-200 flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <Terminal className="w-3 h-3" />
                            <span>Console Output</span>
                        </div>
                        <pre className="flex-1 p-4 font-mono text-sm overflow-auto text-gray-600 whitespace-pre-wrap">
                            {output || "Output will appear here..."}
                        </pre>
                    </div>
                </div>

                {/* Right: Interaction Panel (35%) */}
                <div className={`w-[35%] flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab("problem")}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 border-b-2 transition ${activeTab === 'problem' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Problem</span>
                        </button>
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center space-x-2 border-b-2 transition ${activeTab === 'chat' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span>Interviewer</span>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-auto bg-gray-50/50">
                        {activeTab === 'problem' ? (
                            <div className="p-6 space-y-6">
                                {problem ? (
                                    <>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 mb-2">Coding Problem</h2>
                                            <div className="flex items-center space-x-2 mb-4">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">Technical</span>
                                            </div>
                                            <div className="prose prose-sm prose-gray max-w-none text-gray-700">
                                                <p className="whitespace-pre-wrap">{problem.question}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Example Test Cases</h3>
                                            <div className="space-y-3">
                                                {problem.test_cases?.map((tc, idx) => (
                                                    <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-100 text-xs font-mono">
                                                        <div className="text-gray-500">Input: <span className="text-gray-800">{tc.input}</span></div>
                                                        <div className="text-gray-500">Output: <span className="text-gray-800">{tc.output}</span></div>
                                                    </div>
                                                ))}
                                                {(!problem.test_cases || problem.test_cases.length === 0) && (
                                                    <p className="text-xs text-gray-400 italic">No public test cases provided.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 space-y-3">
                                        <div className="animate-pulse bg-gray-200 w-3/4 h-6 rounded"></div>
                                        <div className="animate-pulse bg-gray-200 w-full h-32 rounded"></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <div className="flex-1 p-4 space-y-4 overflow-auto">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 flex items-start space-x-2">
                                        <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <p>I am your AI Interviewer. I'm here to evaluate your problem-solving skills, not just the final solution. Talk me through your thought process!</p>
                                    </div>

                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${msg.sender === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isThinking && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef}></div>
                                </div>

                                {/* Chat Input */}
                                <div className="p-4 bg-white border-t border-gray-200">
                                    <div className="relative flex items-center">
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => {
                                                setInputText(e.target.value);
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                    // Reset height
                                                    e.target.style.height = 'auto';
                                                }
                                            }}
                                            placeholder="Type a message or press mic..."
                                            rows={1}
                                            style={{ minHeight: '44px', maxHeight: '120px' }}
                                            className="w-full bg-gray-100 border-none rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none overflow-y-auto"
                                        />
                                        <div className="absolute right-2 flex items-center space-x-1">
                                            <button
                                                onClick={toggleMic}
                                                className={`p-2 rounded-full transition ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-gray-200 text-gray-500'}`}
                                            >
                                                <Mic className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleSendMessage}
                                                className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-center mt-2">
                                        <p className="text-[10px] text-gray-400">AI can make mistakes. Review generated code.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CodingRound;
