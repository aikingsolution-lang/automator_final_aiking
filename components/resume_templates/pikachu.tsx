"use client";
import React from "react";
import {
  usePersonalDataStore,
  useCertificateStore,
  useAchievementStore,
  useExperienceStore,
  useEducationStore,
  useProjectStore,
  useLanguageStore,
  useSkillStore,
} from "@/app/store";

export default function Pikachu() {
  const { personalData } = usePersonalDataStore();
  const { certificates } = useCertificateStore();
  const { achievements } = useAchievementStore();
  const { experiences } = useExperienceStore();
  const { educations } = useEducationStore();
  const { projects } = useProjectStore();
  const { languages } = useLanguageStore();
  const { skills } = useSkillStore();

  // -----------------------------------
  // TEMPLATE-1 SENTENCE SPLIT LOGIC
  // -----------------------------------
  const splitDescriptionIntoSentences = (text?: string) => {
    if (!text || text.trim().length === 0) return [];

    const protectedText = text.replace(
      /(\b(?:Express|React|Node)\.js\b)/g,
      m => m.replace(".", "[DOT]")
    );

    const raw = protectedText
      .split(/\.\s+(?=[A-Z])/)
      .map(s => s.replace(/\[DOT\]/g, ".").trim())
      .filter(Boolean);

    return raw.map(s => (s.endsWith(".") ? s : s + "."));
  };

  return (
    <div className="bg-white text-gray-800 p-4 font-serif">

      {/* HEADER */}
      <header className="text-center mb-8 space-y-1">
        <h1 className="text-4xl font-bold text-gray-900">
          {personalData.name || "Your Name"}
        </h1>

        <h2 className="text-sm text-gray-600">
          {personalData.headline || "Your Professional Headline"}
        </h2>

        {(personalData.address ||
          personalData.phone ||
          personalData.github ||
          personalData.email ||
          personalData.twitter ||
          personalData.linkedin) && (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm mt-3">

              {personalData.address && <p>{personalData.address}</p>}

              {personalData.phone && <p>{personalData.phone}</p>}

              {personalData.email && (
                <a href={`mailto:${personalData.email}`} className="underline">
                  {personalData.email}
                </a>
              )}

              {personalData.github && (
                <a href={personalData.github} target="_blank" className="underline">
                  {personalData.github}
                </a>
              )}

              {personalData.twitter && (
                <a href={personalData.twitter} target="_blank" className="underline">
                  {personalData.twitter}
                </a>
              )}

              {personalData.linkedin && (
                <a href={personalData.linkedin} target="_blank" className="underline">
                  {personalData.linkedin}
                </a>
              )}
            </div>
          )}
      </header>

      {/* MAIN CONTENT */}
      <main className="space-y-10 text-sm">

        {/* 1️⃣ WORK EXPERIENCE (top priority like Template-1) */}
        {!!experiences.length && (
          <section>
            <h3 className="text-xs text-gray-700 font-bold uppercase border-b border-indigo-100 tracking-widest pb-1 mb-4">
              Work Experience
            </h3>

            <div className="space-y-6">
              {experiences.map((exp, index) => {
                const bullets = splitDescriptionIntoSentences(exp.description);

                return (
                  <div key={index}>
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {exp.company}, {exp.location}
                      </span>
                      <span className="text-gray-500">{exp.dateRange}</span>
                    </div>

                    <p className="italic text-gray-700 mb-2">{exp.position}</p>

                    {!!bullets.length && (
                      <ul className="list-disc list-inside text-gray-700 space-y-1 pl-4">
                        {bullets.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* EDUCATION */}
        {!!educations.length && (
          <section>
            <h3 className="text-xs text-gray-700 font-bold uppercase border-b border-indigo-100 tracking-widest pb-1 mb-4">
              Education
            </h3>

            <div className="space-y-4">
              {educations.map((edu, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <div>
                      <div className="font-semibold">{edu.institute}</div>
                      <div>{edu.typeofstudy} in {edu.areaofstudy}</div>
                    </div>

                    <div className="text-gray-500 text-right">
                      <span className="block">{edu.dateRange}</span>
                      {edu.score && <span className="block">{edu.score}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PROJECTS */}
        {!!projects.length && (
          <section>
            <h3 className="text-xs text-gray-700 font-bold uppercase border-b border-indigo-100 tracking-widest pb-1 mb-4">
              Projects
            </h3>

            <div className="space-y-4">
              {projects.map((proj, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold">
                      {proj.website ? (
                        <a
                          href={proj.website}
                          target="_blank"
                          className="underline text-gray-800 hover:text-gray-600"
                        >
                          {proj.name}
                        </a>
                      ) : (
                        proj.name
                      )}
                    </span>

                    <span className="text-gray-500">{proj.date}</span>
                  </div>

                  <p className="text-gray-700">{proj.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SKILLS */}
        {!!skills.length && (
          <section>
            <h3 className="text-xs text-gray-700 font-bold uppercase border-b border-indigo-100 tracking-widest pb-1 mb-4">
              Skills
            </h3>

            {/* Keep 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {skills.map((skill, index) => (
                <div key={index}>
                  {/* Heading stays on its own line */}
                  <div className="font-semibold mb-1">{skill.heading}</div>

                  {/* Sub-skills horizontal */}
                  {skill.items && (
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-gray-700">
                      {skill.items.split(",").map((item, i) => (
                        <span key={i} className="whitespace-nowrap">
                          {item.trim()}
                          {i < skill.items.split(",").length - 1 && <span> • </span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5️⃣ CERTIFICATIONS */}
        {!!certificates.length && (
          <section>
            <h3 className="text-xs text-gray-700 font-bold uppercase border-b border-indigo-100 tracking-widest pb-1 mb-4">
              Certifications
            </h3>

            <div className="space-y-2">
              {certificates.map((cert, index) => (
                <div key={index}>
                  <div className="flex justify-between">
                    <span className="font-semibold">{cert.title}</span>
                    <span className="text-gray-500">{cert.date}</span>
                  </div>
                  <p className="text-gray-700">{cert.awarder}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6️⃣ AWARDS */}
        {!!achievements.length && (
          <section>
            <h3 className="text-xs text-gray-700 font-bold uppercase border-b border-indigo-100 tracking-widest pb-1 mb-4">
              Awards
            </h3>

            <div className="space-y-2">
              {achievements.map((ach, index) => (
                <div key={index}>
                  <div className="font-semibold">{ach.name}</div>
                  <p className="text-gray-700">{ach.details}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7️⃣ LANGUAGES */}
        {!!languages.length && (
          <section>
            <h3 className="text-xs text-gray-700 font-bold uppercase border-b border-indigo-100 tracking-widest pb-1 mb-4">
              Languages
            </h3>

            <div className="space-y-2">
              {languages.map((lang, index) => (
                <div key={index}>
                  <div className="font-semibold">{lang.heading}</div>
                  <p className="text-gray-700">{lang.option}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}