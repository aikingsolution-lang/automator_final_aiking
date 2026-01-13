
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

// Helper function to format project dates
const formatProjectDate = (startDate: string, endDate: string): string => {
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const start = formatDate(startDate);
  const end = endDate ? formatDate(endDate) : "Present";

  if (!start) return end;
  return `${start} - ${end}`;
};

export default function Modern() {
  const { personalData } = usePersonalDataStore();
  const { certificates } = useCertificateStore();
  const { achievements } = useAchievementStore();
  const { experiences } = useExperienceStore();
  const { educations } = useEducationStore();
  const { projects } = useProjectStore();
  const { languages } = useLanguageStore();
  const { skills } = useSkillStore();

  // ------------------------------
  // TEMPLATE-1 BULLET SPLIT LOGIC
  // ------------------------------
  const splitDescriptionIntoSentences = (text?: string) => {
    if (!text || text.trim().length === 0) return [];

    // Protect .js framework names
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
    <div className="bg-white text-gray-900 p-4 font-sans">

      {/* HEADER */}
      <header className="text-left w-full">
        <h1 className="text-2xl font-bold tracking-wide">
          {personalData.name || "Your Name"}
        </h1>
        <h2 className="text-sm text-gray-500 mt-1">
          {personalData.headline || "Your Professional Headline"}
        </h2>
      </header>

      {/* CONTACT */}
      {(personalData.address ||
        personalData.phone ||
        personalData.github ||
        personalData.email ||
        personalData.twitter ||
        personalData.linkedin) && (
          <section className="mt-2 text-sm text-gray-700 flex flex-wrap justify-start gap-3">

            {personalData.address && (
              <span>{personalData.address}</span>
            )}

            {personalData.phone && (
              <span>{personalData.phone}</span>
            )}

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
          </section>
        )}

      {/* MAIN */}
      <main className="mt-6 space-y-6">

        {/* EDUCATION */}
        {!!educations.length && (
          <section>
            <h3 className="border-t border-b pt-1 pb-1 bg-gray-100 border-gray-700 text-sm font-semibold tracking-wide mb-2">
              EDUCATION
            </h3>

            <div className="space-y-3 text-sm">
              {educations.map((edu, index) => (
                <div key={index}>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{edu.institute}</div>
                      <p>
                        {edu.typeofstudy} in {edu.areaofstudy}
                      </p>
                    </div>

                    <div className="text-right text-gray-500">
                      <span className="block">{edu.dateRange}</span>
                      {edu.score && (
                        <span className="block text-gray-700">
                          {edu.score}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WORK EXPERIENCE — FIRST LIKE TEMPLATE 1 */}
        {!!experiences.length && (
          <section>
            <h3 className="border-t border-b pt-1 pb-1 bg-gray-100 border-gray-700 text-sm font-semibold tracking-wide mb-2">
              WORK EXPERIENCE
            </h3>

            <div className="space-y-4 text-sm">
              {experiences.map((exp, index) => {
                const bullets = splitDescriptionIntoSentences(exp.description);

                return (
                  <div key={index}>
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {exp.company}, {exp.location}
                      </span>
                      <span className="text-gray-500">{exp.dateRange}</span>
                    </div>

                    <p className="italic text-gray-800 mb-2">
                      {exp.position}
                    </p>

                    {!!bullets.length && (
                      <ul className="list-disc list-inside space-y-1">
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

        {/* PROJECTS */}
        {!!projects.length && (
          <section>
            <h3 className="border-t border-b pt-1 pb-1 bg-gray-100 border-gray-700 text-sm font-semibold tracking-wide mb-2">
              PROJECTS
            </h3>

            <div className="space-y-4 text-sm">
              {projects.map((proj, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">
                      {proj.website ? (
                        <a
                          href={proj.website}
                          target="_blank"
                          className="underline"
                        >
                          {proj.name}
                        </a>
                      ) : (
                        proj.name
                      )}
                    </span>
                    <span className="text-gray-500">{formatProjectDate(proj.startDate, proj.endDate)}</span>
                  </div>

                  {proj.description && (
                    <p>{proj.description}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SKILLS */}
        {!!skills.length && (
          <section>
            <h3 className="border-t border-b pt-1 pb-1 bg-gray-100 border-gray-700 text-sm font-semibold tracking-wide mb-2">
              SKILLS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {skills.map((skill, index) => (
                <div key={index}>
                  <div className="font-medium mb-1">{skill.heading}</div>
                  <p>{skill.items}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CERTIFICATIONS */}
        {!!certificates.length && (
          <section>
            <h3 className="border-t border-b pt-1 pb-1 bg-gray-100 border-gray-700 text-sm font-semibold tracking-wide mb-2">
              CERTIFICATIONS
            </h3>

            <div className="space-y-2 text-sm">
              {certificates.map((cert, index) => (
                <div key={index}>
                  <div className="flex justify-between">
                    <span className="font-medium">{cert.title}</span>
                    <span className="text-gray-500">{cert.date}</span>
                  </div>
                  <p>{cert.awarder}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AWARDS */}
        {!!achievements.length && (
          <section>
            <h3 className="border-t border-b pt-1 pb-1 bg-gray-100 border-gray-700 text-sm font-semibold tracking-wide mb-2">
              AWARDS
            </h3>

            <div className="space-y-2 text-sm">
              {achievements.map((achievement, index) => (
                <div key={index}>
                  <div className="font-medium">{achievement.name}</div>
                  <p className="text-gray-700">{achievement.details}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LANGUAGES */}
        {!!languages.length && (
          <section>
            <h3 className="border-t border-b pt-1 pb-1 bg-gray-100 border-gray-700 text-sm font-semibold tracking-wide mb-2">
              LANGUAGES
            </h3>

            <div className="space-y-2 text-sm">
              {languages.map((lang, index) => (
                <div key={index}>
                  <div className="font-medium">{lang.heading}</div>
                  <p>{lang.option}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
