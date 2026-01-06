"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { toPng } from "html-to-image";
import Certificate from "@/components/Certificate";
import { usePersonalDataStore } from "@/app/store";
import fillResumeData from "@/components/oneclick/page";

/* ================= TYPES ================= */

type Question = {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
};

type PageState = "instructions" | "quiz" | "result";

/* ================= CONSTANTS ================= */

const TOTAL_QUESTIONS = 30;
const TOTAL_TIME_SECONDS = 30 * 60; // 30 minutes
const PASS_MARKS = 0;

function normalizeCorrectAnswer(
    correctAnswer: string,
    options: string[]
): string | null {
    if (!correctAnswer || !Array.isArray(options) || options.length !== 4) {
        return null;
    }

    const trimmed = correctAnswer.trim();

    // Case 1: already exact option text
    if (options.includes(trimmed)) {
        return trimmed;
    }

    // Case 2: A / B / C / D
    const letterMap: Record<string, number> = {
        A: 0,
        B: 1,
        C: 2,
        D: 3,
    };

    const upper = trimmed.toUpperCase();
    if (letterMap[upper] !== undefined) {
        return options[letterMap[upper]];
    }

    // Case 3: "Option B", "Answer: C"
    const match = upper.match(/\b[A-D]\b/);
    if (match && letterMap[match[0]] !== undefined) {
        return options[letterMap[match[0]]];
    }

    return null;
}

function validateAndFixQuestions(rawQuestions: any[]): Question[] {
    return rawQuestions
        .map((q: any, index: number) => {
            if (
                typeof q?.question !== "string" ||
                !Array.isArray(q?.options) ||
                q.options.length !== 4
            ) {
                console.warn("Invalid question structure:", q);
                return null;
            }

            const fixedCorrectAnswer = normalizeCorrectAnswer(
                q.correctAnswer,
                q.options
            );

            if (!fixedCorrectAnswer) {
                console.warn("Invalid correctAnswer:", q);
                return null;
            }

            return {
                id: index + 1,
                question: q.question,
                options: q.options,
                correctAnswer: fixedCorrectAnswer, // ✅ ALWAYS option text
            };
        })
        .filter(Boolean) as Question[];
}

/* ================= PAGE ================= */

export default function SkillQuizPage() {
    const params = useParams();
    const skill = decodeURIComponent(params.skill as string);
    const { personalData } = usePersonalDataStore();

    /* ---------- STATE ---------- */

    const [pageState, setPageState] = useState<PageState>("instructions");
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [score, setScore] = useState(0);
    const [username, setUsername] = useState("");

    const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);
    const [timeTaken, setTimeTaken] = useState(0);

    const [isLoading, setIsLoading] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const certRef = useRef<HTMLDivElement>(null);

    /* ---------- GEMINI ---------- */

    const apiKey =
        typeof window !== "undefined" ? localStorage.getItem("api_key") : null;

    const geminiClient = useMemo(() => {
        if (!apiKey) return null;
        try {
            return new GoogleGenerativeAI(apiKey);
        } catch {
            return null;
        }
    }, [apiKey]);

    const prettify = (str?: string) => {
        if (!str) return "";
        return str
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    useEffect(() => {
        const storedResume = localStorage.getItem("resumeData");

        if (storedResume) {
            try {
                const parsedResume = JSON.parse(storedResume);
                fillResumeData(parsedResume);
                return; // stop here if resume exists
            } catch (err) {
                console.error("Invalid resumeData in localStorage", err);
            }
        }

        const email = localStorage.getItem("email");
        const nameFromEmail = email?.split("@")[0]?.trim();

        const name =
            localStorage.getItem("UserName") ||
            localStorage.getItem("name") ||
            nameFromEmail ||
            "Unknown User";

        setUsername(prettify(name));

    }, []);

    /* ================= TIMER ================= */

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    handleSubmit(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    /* ================= QUIZ GENERATION ================= */

    const startQuiz = async () => {
        if (!geminiClient) {
            toast.error("Gemini API key missing");
            return;
        }

        setIsLoading(true);
        setAnswers({});
        setQuestions([]);
        setTimeLeft(TOTAL_TIME_SECONDS);
        setScore(0);

        try {
            const prompt = `
                Generate EXACTLY 30 multiple-choice questions for "${skill}".

                Rules:
                - Medium to hard difficulty
                - 4 options
                - One correct answer
                - No explanation
                - Return ONLY valid JSON

                {
                    "questions": [
                        {
                            "id": 1,
                            "question": "string",
                            "options": ["A", "B", "C", "D"],
                            "correctAnswer": "A"
                        }
                    ]
                }
            `.trim();

            const model = geminiClient.getGenerativeModel({
                model: "gemini-2.5-flash-lite",
            });

            const res = await model.generateContent(prompt);

            const parts =
                res?.response?.candidates?.[0]?.content?.parts || [];

            const text = parts
                .map((p: any) => p.text || "")
                .join("")
                .trim();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found in Gemini response");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            if (!Array.isArray(parsed.questions)) {
                throw new Error("Questions array missing");
            }

            const fixedQuestions = validateAndFixQuestions(parsed.questions || []);

            if (fixedQuestions.length < TOTAL_QUESTIONS) {
                throw new Error(
                    `Only ${fixedQuestions.length} valid questions generated`
                );
            }

            setQuestions(fixedQuestions.slice(0, TOTAL_QUESTIONS));
            setPageState("quiz");
            startTimer();

        } catch (e) {
            console.error("QUIZ GENERATION ERROR:", e);
            toast.error("Failed to generate quiz");
        } finally {
            setIsLoading(false);
        }
    };

    /* ================= SUBMIT ================= */

    const handleSubmit = (auto = false) => {
        stopTimer();

        let s = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) s++;
        });

        setScore(s);
        setTimeTaken(TOTAL_TIME_SECONDS - timeLeft);
        setPageState("result");

        if (auto) toast.info("Time up! Quiz auto-submitted.");
    };

    /* ================= RETAKE ================= */

    const retakeQuiz = () => {
        stopTimer();
        setPageState("instructions");
    };

    /* ================= HELPERS ================= */

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const downloadCertificate = async () => {
        if (!certRef.current) return;

        try {
            const dataUrl = await toPng(certRef.current, {
                cacheBust: true,
                pixelRatio: 2,
            });

            const link = document.createElement("a");
            link.download = `Certificate-${skill}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate certificate");
        }
    };

    /* ================= UI ================= */

    return (
        <div className="min-h-[80vh] bg-[#11011E] p-6 flex items-center justify-center">
            {isLoading && (
                <Card
                    className="relative w-full max-w-md mx-auto p-5 sm:p-6 lg:p-7 bg-[rgba(255,255,255,0.02)] rounded-2xl border border-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(15,174,150,0.08)] overflow-hidden"
                >
                    {/* subtle glow */}
                    <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#0FAE96]/10 rounded-full blur-3xl pointer-events-none" />

                    <CardContent
                        className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left"
                    >
                        <Loader2
                            className="animate-spin text-[#0FAE96] w-6 h-6 lg:w-7 lg:h-7"
                        />

                        <span
                            className="text-[#B6B6B6] font-medium tracking-wide"
                        >
                            Generating quiz…
                        </span>
                    </CardContent>
                </Card>

            )}

            {/* ================= INSTRUCTIONS ================= */}
            {pageState === "instructions" && !isLoading && (
                <Card
                    className="relative w-full max-w-xl bg-[rgba(255,255,255,0.02)] rounded-2xl p-5 sm:p-6 lg:p-7 border border-white/10 backdrop-blur-xl shadow-[0_0_45px_rgba(15,174,150,0.08)] overflow-hidden"
                >
                    {/* glow */}
                    <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#0FAE96]/10 rounded-full blur-3xl pointer-events-none" />

                    {/* HEADER */}
                    <CardHeader className="pb-4 lg:pb-5 border-b border-white/10 relative z-10">
                        <CardTitle
                            className="text-[#ECF1F0] font-semibold tracking-wide text-lg sm:text-xl lg:text-2xl"
                        >
                            {skill} Assessment Test
                        </CardTitle>

                        <p className="mt-2 text-[#B6B6B6]">
                            Evaluate your knowledge and unlock certification eligibility
                        </p>
                    </CardHeader>

                    {/* CONTENT */}
                    <CardContent className="mt-5 lg:mt-6 space-y-6 text-[#B6B6B6] relative z-10">
                        {/* LIST */}
                        <div className="space-y-3">
                            {[
                                { label: "Total Questions", value: "30" },
                                { label: "Total Time", value: "30 Minutes" },
                                { label: "Total Marks", value: "30" },
                                { label: "Passing Marks", value: "21" },
                                { label: "Submission", value: "Auto-submit on time up" },
                            ].map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 transition-all duration-300 hover:bg-white/[0.06] hover:border-[#0FAE96]/40"
                                >
                                    <span>
                                        {item.label}
                                    </span>

                                    <span className="font-medium text-[#ECF1F0] ">
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <Button
                            onClick={startQuiz}
                            className="w-full bg-[#0FAE96] text-black rounded-xl py-3 sm:py-3.5 font-semibold tracking-wide shadow-[0_12px_35px_rgba(15,174,150,0.35)] transition-all duration-300 hover:shadow-[0_18px_45px_rgba(15,174,150,0.55)] hover:scale-[1.03] active:scale-[0.97]"
                        >
                            Start Quiz
                        </Button>

                        <p className="text-center text-sm lg:text-base text-[#B6B6B6]/80">
                            Once started, the test cannot be paused
                        </p>
                    </CardContent>
                </Card>

            )}

            {/* ================= QUIZ ================= */}
            {pageState === "quiz" && (
                <div className="w-full max-w-3xl mx-auto space-y-6 lg:space-y-8">
                    {/* HEADER / TIMER */}
                    <div
                        className="sticky top-16 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(15,174,150,0.08)]"
                    >
                        <span className="text-[#ECF1F0] font-semibold">
                            ⏱ Time Left: {formatTime(timeLeft)}
                        </span>

                        <Button
                            onClick={() => handleSubmit(false)}
                            className="bg-[#0FAE96] px-5 py-2.5 rounded-lg font-medium shadow-[0_10px_30px_rgba(15,174,150,0.35)] transition-all duration-300 hover:shadow-[0_15px_40px_rgba(15,174,150,0.55)] hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Submit Quiz
                        </Button>
                    </div>

                    {/* QUESTIONS */}
                    {questions.map(q => (
                        <Card
                            key={q.id}
                            className="bg-[rgba(255,255,255,0.02)] border border-white/10 rounded-2xl shadow-[0_0_25px_rgba(15,174,150,0.05)]"
                        >
                            <CardContent className="p-5 sm:p-6 space-y-4">
                                {/* QUESTION */}
                                <p className="text-[#ECF1F0] font-semibold leading-relaxed">
                                    {q.id}. {q.question}
                                </p>

                                {/* OPTIONS */}
                                <div className="space-y-3">
                                    {q.options.map((opt, idx) => (
                                        <label
                                            key={`${q.id}-${idx}`}
                                            className="flex items-start gap-3 p-3 sm:p-4 rounded-xl cursor-pointer bg-white/[0.02] border border-white/10 transition-all duration-300 hover:bg-white/[0.05] hover:border-[#0FAE96]/40"
                                        >
                                            <input
                                                type="radio"
                                                name={`q-${q.id}`}
                                                className="mt-1 accent-[#0FAE96] w-4 h-4"
                                                onChange={() =>
                                                    setAnswers(prev => ({ ...prev, [q.id]: opt }))
                                                }
                                            />

                                            <span className="text-[#B6B6B6] leading-relaxed">
                                                {opt}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ================= RESULT ================= */}
            {pageState === "result" && (
                <div className="w-full max-w-3xl mx-auto space-y-6 lg:space-y-8">
                    {/* ===== SUMMARY CARD ===== */}
                    <Card
                        className="bg-[rgba(255,255,255,0.02)] border border-white/10 rounded-2xl shadow-[0_0_35px_rgba(15,174,150,0.08)]"
                    >
                        <CardContent className="p-5 sm:p-6 lg:p-7 space-y-4 text-[#ECF1F0]">
                            {/* SCORE */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <p className="font-bold text-lg lg:text-2xl">
                                    Score: {score} / 30
                                </p>

                                <p className="text-[#B6B6B6]">
                                    ⏱ Time Taken: {formatTime(timeTaken)}
                                </p>
                            </div>

                            {/* STATUS */}
                            {score < PASS_MARKS ? (
                                <div className="p-4 rounded-xl bg-red-400/10 border border-red-400/30">
                                    <p className="text-red-400 font-medium">
                                        Your score is less than 21. Certificate cannot be generated.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-green-400/10 border border-green-400/30">
                                    <p className="text-green-400 font-medium">
                                        You are eligible for certificate generation.
                                    </p>
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                                <Button
                                    onClick={retakeQuiz}
                                    className="w-full sm:w-auto bg-[#0FAE96] px-5 py-2.5 rounded-lg"
                                >
                                    Retake Quiz
                                </Button>

                                {score >= PASS_MARKS && (
                                    <>
                                        <Button
                                            onClick={downloadCertificate}
                                            className="bg-amber-500 w-full sm:w-auto px-5 py-2.5 rounded-lg"
                                        >
                                            Download Certificate
                                        </Button>

                                        {/* Hidden Certificate */}
                                        <div
                                            style={{
                                                position: "fixed",
                                                left: "-2000px",
                                                top: "0",
                                                visibility: "visible",
                                            }}
                                        >
                                            <Certificate
                                                ref={certRef}
                                                userName={personalData.name || username}
                                                skill={skill}
                                                date={new Date().toLocaleDateString("en-IN", {
                                                    day: "2-digit",
                                                    month: "long",
                                                    year: "numeric",
                                                })}
                                            />
                                        </div>

                                    </>
                                )}

                            </div>
                        </CardContent>
                    </Card>

                    {/* ===== ANSWER REVIEW ===== */}
                    {questions.map(q => {
                        const userAnswer = answers[q.id];

                        return (
                            <Card
                                key={q.id}
                                className="bg-[rgba(255,255,255,0.02)] border border-white/10 rounded-2xl"
                            >
                                <CardContent className="p-5 sm:p-6 space-y-4">
                                    {/* QUESTION */}
                                    <p className="text-[#ECF1F0] font-semibold leading-relaxed">
                                        {q.id}. {q.question}
                                    </p>

                                    {/* OPTIONS */}
                                    <div className="space-y-2">
                                        {q.options.map((opt, idx) => {
                                            const isCorrect = opt === q.correctAnswer;
                                            const isWrong = opt === userAnswer && opt !== q.correctAnswer;

                                            return (
                                                <div
                                                    key={`${q.id}-review-${idx}`}
                                                    className={`flex items-start justify-between gap-3 p-3 sm:p-4 rounded-xl border 
                                                        ${isCorrect ? "border-green-400/40 bg-green-400/10"
                                                            : isWrong ? "border-red-400/40 bg-red-400/10" : "border-white/10 bg-white/[0.02]"
                                                        }`}
                                                >
                                                    <p
                                                        className={`                                                            ${isCorrect
                                                            ? "text-green-400"
                                                            : isWrong ? "text-red-400" : "text-[#B6B6B6]"
                                                            }`}
                                                    >
                                                        {opt}
                                                    </p>

                                                    {isCorrect && <span className="text-green-400">✔</span>}
                                                    {isWrong && <span className="text-red-400">✖</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

            )}
        </div>
    );
}
