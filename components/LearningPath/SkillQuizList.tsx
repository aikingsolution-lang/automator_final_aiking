"use client";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SkillQuizList() {
    const { state } = useAppContext();
    const { missingSkills } = state;

    if (!missingSkills?.length) return null;

    return (
        <Card className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-5">
            <CardHeader>
                <CardTitle className="text-[#ECF1F0] font-raleway">
                    Skill-wise Quiz
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
                {missingSkills.map(skill => (
                    <div
                        key={skill}
                        className="flex items-center justify-between border border-[rgba(255,255,255,0.05)] rounded-md p-3"
                    >
                        <span className="text-[#B6B6B6] font-inter">{skill}</span>
                        <a
                            href={`/quiz/${encodeURIComponent(skill)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                className="bg-[#0FAE96] rounded-md p-2 scale-95 hover:scale-105 transition-all duration-300"
                            >
                                Take Quiz
                            </Button>
                        </a>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
