"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ListChecks, Loader2 } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";
import app from "@/firebase/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "react-toastify";

type TrackerItem = {
    title: string;
    done: boolean;
};

type TrackerData = Record<string, TrackerItem[]>; // skillName -> items[]

const LearningTracker: React.FC = () => {
    const { state } = useAppContext();
    const { missingSkills } = state;

    const auth = getAuth();
    const db = getDatabase(app);

    const [apiKey, setApiKey] = useState<string | null>(null);
    const [tracker, setTracker] = useState<TrackerData>({});
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);

    // ==== Load Gemini API key (following your other pages convention) ====
    useEffect(() => {
        // For this project we use 'api_key' in localStorage (your analysisService)
        const keyFromLocal = localStorage.getItem("api_key");
        if (!keyFromLocal) {
            console.warn("No Gemini API key found in localStorage (api_key).");
        }
        setApiKey(keyFromLocal);
    }, []);

    // ==== Gemini client (same style as CreateResume) ====
    const geminiClient = useMemo(() => {
        if (!apiKey) return null;
        try {
            return new GoogleGenerativeAI(apiKey);
        } catch (e) {
            console.error("Error creating Gemini client:", e);
            return null;
        }
    }, [apiKey]);

    // ==== Helper: fetch existing tracker data from Firebase ====
    const loadTrackerFromFirebase = useCallback(
        async (uid: string): Promise<TrackerData> => {
            try {
                const trackerRef = ref(db, `user/${uid}/learningTracker`);
                const snap = await get(trackerRef);
                if (snap.exists()) {
                    return snap.val() as TrackerData;
                }
            } catch (e) {
                console.error("Error loading tracker from Firebase:", e);
            }
            return {};
        },
        [db]
    );

    // ==== Helper: save tracker data to Firebase ====
    const saveTrackerToFirebase = useCallback(
        async (uid: string, data: TrackerData) => {
            try {
                const trackerRef = ref(db, `user/${uid}/learningTracker`);
                await set(trackerRef, data);
            } catch (e) {
                console.error("Error saving tracker to Firebase:", e);
            }
        },
        [db]
    );

    // ==== Gemini: generate breakdown (sub-skills) for a skill ====
    const generateBreakdownForAllSkills = useCallback(
        async (skills: string[]): Promise<TrackerData> => {
            if (!geminiClient || skills.length === 0) return {};

            try {
                const prompt = `
You are helping a student prepare for job interviews.

For EACH skill below, generate 6–7 important sub-skills.

Rules:
- ONLY sub-skills
- Short topic names
- NO explanations
- Return ONLY valid JSON

Skills:
${skills.map((s) => `- ${s}`).join("\n")}

Return format:
{
  "Skill Name": ["Subskill 1", "Subskill 2", ...]
}
      `.trim();

                const model = geminiClient.getGenerativeModel({
                    model: "gemini-2.5-flash-lite",
                });

                const response = await model.generateContent(prompt);
                const text =
                    response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

                const jsonMatch = text.match(/{[\s\S]*}/);
                if (!jsonMatch) throw new Error("Invalid Gemini response");

                const parsed = JSON.parse(jsonMatch[0]);

                const result: TrackerData = {};
                Object.keys(parsed).forEach((skill) => {
                    result[skill] = parsed[skill].map((t: string) => ({
                        title: t,
                        done: false,
                    }));
                });

                return result;
            } catch (err) {
                console.error("Gemini error:", err);

                // fallback (quota-safe)
                const fallback: TrackerData = {};
                skills.forEach((s) => {
                    fallback[s] = [
                        { title: `Core concepts of ${s}`, done: false },
                        { title: `Important topics in ${s}`, done: false },
                    ];
                });
                return fallback;
            }
        },
        [geminiClient]
    );

    // ==== Main effect: load tracker (and call Gemini if needed) ====
    useEffect(() => {
        const bootstrap = async () => {
            const uid = auth.currentUser?.uid;
            if (!uid) {
                console.warn("No authenticated user found for LearningTracker");
                setIsLoading(false);
                return;
            }

            if (!missingSkills || missingSkills.length === 0) {
                setTracker({});
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // 1. Load existing tracker from Firebase
                let trackerData: TrackerData = await loadTrackerFromFirebase(uid);

                // 2. Ensure each missingSkill has breakdown entries
                let updated = false;
                const skillsToGenerate = missingSkills.filter(
                    (skill) => !trackerData[skill] || !Array.isArray(trackerData[skill])
                );

                if (skillsToGenerate.length > 0) {
                    const generated = await generateBreakdownForAllSkills(skillsToGenerate);
                    trackerData = { ...trackerData, ...generated };

                    await saveTrackerToFirebase(uid, trackerData);
                }

                // 3. Optionally remove skills that are no longer missing
                const trackerSkills = Object.keys(trackerData);
                let removed = false;
                for (const skillName of trackerSkills) {
                    if (!missingSkills.includes(skillName)) {
                        delete trackerData[skillName];
                        removed = true;
                    }
                }

                if (updated || removed) {
                    await saveTrackerToFirebase(uid, trackerData);
                }

                setTracker(trackerData);
            } catch (e) {
                console.error("Error initializing LearningTracker:", e);
                toast.error("Failed to load learning tracker.");
            } finally {
                setIsLoading(false);
            }
        };

        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.currentUser, missingSkills, loadTrackerFromFirebase, saveTrackerToFirebase, generateBreakdownForAllSkills]);

    // ==== Toggle a checklist item ====
    const handleToggleItem = async (skillName: string, index: number) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        setTracker((prev) => {
            const copy: TrackerData = structuredClone
                ? structuredClone(prev)
                : JSON.parse(JSON.stringify(prev));

            const items = copy[skillName];
            if (!items || !items[index]) return prev;

            items[index].done = !items[index].done;
            return copy;
        });

        try {
            setIsSyncing(true);
            await saveTrackerToFirebase(uid, {
                ...tracker,
                [skillName]: tracker[skillName]?.map((item, i) =>
                    i === index ? { ...item, done: !item.done } : item
                ),
            });
        } catch (e) {
            console.error("Error updating tracker item:", e);
            toast.error("Failed to update tracker. Please try again.");
        } finally {
            setIsSyncing(false);
        }
    };

    // ==== UI ====
    if (isLoading) {
        return (
            <div className="flex flex-col bg-[#11011E]">
                <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                    <CardContent className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-[#0FAE96]" />
                        <span className="ml-2 text-sm text-[#B6B6B6] font-inter">
                            Building your learning tracker...
                        </span>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Maintain original missingSkills order
    const skillNames = missingSkills.filter((skill) => tracker[skill]);

    if (skillNames.length === 0) {
        return (
            <div className="flex flex-col bg-[#11011E]">
                <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                    <CardHeader>
                        <CardTitle className="text-xl font-raleway font-bold text-[#ECF1F0] flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-[#0FAE96]" />
                            Learning Tracker
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-[#B6B6B6] font-inter">
                            Please wait...
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-[#11011E]">
            <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl font-raleway font-bold text-[#ECF1F0] flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-[#0FAE96]" />
                        Learning Tracker
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {skillNames.map((skillName) => {
                        const items = tracker[skillName] || [];
                        const completedCount = items.filter((i) => i.done).length;

                        return (
                            <div
                                key={skillName}
                                className="border border-[rgba(255,255,255,0.05)] rounded-md p-4"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[#ECF1F0] font-raleway font-semibold text-base">
                                        {skillName}
                                    </h3>
                                    <span className="text-xs text-[#B6B6B6] font-inter">
                                        {completedCount}/{items.length} steps done
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {items.map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex items-start gap-2 text-sm text-[#B6B6B6] font-inter"
                                        >
                                            <Checkbox
                                                checked={item.done}
                                                onCheckedChange={() =>
                                                    handleToggleItem(skillName, index)
                                                }
                                                className="mt-0.5"
                                            />
                                            <span
                                                className={
                                                    item.done
                                                        ? "line-through text-[#0FAE96]"
                                                        : "text-[#B6B6B6]"
                                                }
                                            >
                                                {item.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {isSyncing && (
                        <div className="text-xs text-[#B6B6B6] font-inter mt-2">
                            Syncing your progress...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LearningTracker;
