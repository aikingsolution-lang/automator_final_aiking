"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MdWork } from "react-icons/md";
import { FaTimes } from "react-icons/fa";
import { Pencil, Trash2 } from "lucide-react";
import { useExperienceStore } from "@/app/store";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ================= AI PROMPT ================= */

const buildExperiencePrompt = (
  company: string,
  position: string,
  description: string
) => `
    You are a senior technical resume writer for software engineers.

    Context (for understanding only, DO NOT mention company name or job title):
      Company: "${company}"
      Role: "${position}"
      Notes: "${description}"

    TASK:
      - Generate EXACTLY 6 experience descriptions
      - EACH description MUST have EXACTLY 3 sentences (exactly e full stops)
      - EACH sentence MUST contain between 30 and 45 words (important)
      - Use ONLY full stops to end sentences
      - Must be very tech-heavy (stack, architecture, APIs, performance, security, scalability)

    STRICT RULES:
      - Do NOT mention company name
      - Do NOT mention job title
      - No emojis, bullets, numbering, or headings
      - ATS-friendly resume language

    OUTPUT FORMAT:
      Return ONLY a valid JSON array of 6 strings.
`.trim();

export default function ExperienceInput() {
  const { experiences, addExperience, updateExperience, deleteExperience } =
    useExperienceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    company: "",
    position: "",
    dateRange: "",
    location: "",
    description: "",
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  /* ================= AI STATE ================= */

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [roughDescription, setRoughDescription] = useState("");

  /* ================= GEMINI SETUP ================= */

  useEffect(() => {
    const keyFromLocal = localStorage.getItem("api_key");
    if (!keyFromLocal) {
      console.warn("No Gemini API key found in localStorage (api_key).");
    }
    setApiKey(keyFromLocal);
  }, []);

  const geminiClient = useMemo(() => {
    if (!apiKey) return null;
    try {
      return new GoogleGenerativeAI(apiKey);
    } catch {
      return null;
    }
  }, [apiKey]);

  /* ================= AI GENERATION ================= */

  const generateAISuggestions = useCallback(async () => {
    if (!geminiClient || !formData.company || !formData.position) return;

    const baseDescription =
      formData.description.trim() && roughDescription.trim()
        ? `${formData.description.trim()}\n\n${roughDescription.trim()}`
        : (formData.description.trim() || roughDescription.trim());

    if (!baseDescription) {
      alert("Please enter a rough description...");
      return;
    }

    try {
      setAiLoading(true);
      setAiSuggestions([]);

      const model = geminiClient.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });

      const prompt = buildExperiencePrompt(
        formData.company,
        formData.position,
        baseDescription
      );

      const response = await model.generateContent(prompt);
      const text =
        response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Invalid Gemini response");

      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed) || parsed.length !== 6)
        throw new Error("Invalid suggestion count");

      setAiSuggestions(parsed);
    } catch (err) {
      console.error("Gemini error:", err);
    } finally {
      setAiLoading(false);
    }
  }, [geminiClient, formData.company, formData.position, formData.description, roughDescription]);

  /* ================= HANDLERS ================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetAIState = () => {
    setAiOpen(false);
    setAiSuggestions([]);
    setRoughDescription("");
    setAiLoading(false);
  };

  const formatMonthYear = (date: string) => {
    if (!date) return "";
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${month}/${year}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.position || !formData.description) return;

    const formattedDateRange = startDate
      ? `${formatMonthYear(startDate)} - ${endDate ? formatMonthYear(endDate) : "Present"
      }`
      : "";

    if (editId !== null) {
      updateExperience(
        editId,
        formData.company,
        formData.position,
        formattedDateRange,
        formData.location,
        formData.description
      );
    } else {
      addExperience(
        formData.company,
        formData.position,
        formattedDateRange,
        formData.location,
        formData.description
      );
    }

    setFormData({
      company: "",
      position: "",
      dateRange: "",
      location: "",
      description: "",
    });
    setStartDate("");
    setEndDate("");

    setIsOpen(false);
    resetAIState();
    setEditId(null);
  };

  const handleEdit = (id: string) => {
    const experience = experiences.find((exp) => exp.id === id);
    if (!experience) return;

    resetAIState();

    if (experience.dateRange) {
      const [start, end] = experience.dateRange.split(" - ");

      if (start) {
        const [m, y] = start.split("/");
        setStartDate(`${y}-${m}-01`);
      }

      if (end && end !== "Present") {
        const [m, y] = end.split("/");
        setEndDate(`${y}-${m}-01`);
      } else {
        setEndDate("");
      }
    }

    setFormData({
      company: experience.company,
      position: experience.position,
      dateRange: experience.dateRange,
      location: experience.location,
      description: experience.description
    });

    setIsOpen(true);
    setEditId(id);
  };

  const handleDelete = (id: string) => {
    deleteExperience(id);
  };

  /* ================= UI ================= */

  return (
    <section className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-b from-main-bg via-[rgba(17,1,30,0.95)] to-main-bg text-text-subtitle shadow-2xl rounded-xl">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MdWork className="text-2xl text-white drop-shadow-glow" />
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Experience
          </h2>
        </div>
      </div>

      {/* Display Experience List */}
      {experiences.length > 0 && (
        <div className="mb-6 space-y-4">
          {experiences.map((experience) => (
            <div
              key={experience.id}
              className="p-4 bg-gray-800/50 backdrop-blur-md rounded-xl flex justify-between items-center transition-all duration-300 hover:shadow-glow hover:scale-[1.02]"
            >
              <div>
                <strong className="text-lg font-semibold text-white drop-shadow-md">
                  {experience.company}
                </strong>
                <p className="text-sm text-gray-300">{experience.position}</p>
                <p className="text-sm text-gray-400">{experience.dateRange}</p>
                {experience.location && (
                  <p className="text-xs text-gray-500">
                    Location: {experience.location}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {experience.description}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(experience.id)}
                  className="p-2 rounded-full bg-blue-600/20 hover:bg-blue-600/40 transition-all duration-300"
                >
                  <Pencil className="w-5 h-5 text-blue-400" />
                </button>
                <button
                  onClick={() => handleDelete(experience.id)}
                  className="p-2 rounded-full bg-red-600/20 hover:bg-red-600/40 transition-all duration-300"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Experience Button */}
      <button
        onClick={() => {
          resetAIState();
          setFormData({ company: "", position: "", dateRange: "", location: "", description: "" });
          setIsOpen(true);
          setEditId(null);
          setStartDate("");
          setEndDate("");
        }}
        className="w-full p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 bg-[rgba(255,255,255,0.05)] backdrop-blur-md hover:border-gray-500 hover:text-white transition-all duration-300 shadow-inner hover:shadow-glow"
      >
        + Add a new item
      </button>

      {/* Experience Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50">
          <div className="bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] text-white p-8 rounded-2xl w-full max-w-[650px] shadow-2xl backdrop-blur-md border border-gray-700">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {editId ? "Edit Experience" : "Add Experience"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 transition-all duration-300"
              >
                <FaTimes size={20} className="text-gray-300" />
              </button>
            </div>

            {/* Experience Form */}
            <form onSubmit={handleSubmit} className="bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E]">
              <div className="grid grid-cols-2 gap-5 mb-6">

                <input
                  type="text"
                  name="company"
                  placeholder="Company"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.company}
                  onChange={handleChange}
                  required
                />

                <input
                  type="text"
                  name="position"
                  placeholder="Position"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.position}
                  onChange={handleChange}
                  required
                />

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                    onFocus={(e) => e.target.showPicker()}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                    onFocus={(e) => e.target.showPicker()}
                  />
                </div>

                <input
                  type="text"
                  name="location"
                  placeholder="Location"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              {/* Description Textarea */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">
                    Description
                  </span>
                  <button
                    type="button"
                    disabled={!formData.company || !formData.position}
                    onClick={() => {
                      resetAIState();
                      setRoughDescription(formData.description);
                      setAiOpen(true);
                    }}
                    className="text-xs px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 disabled:opacity-40 transition-all duration-300"
                  >
                    ✨ AI Suggestions
                  </button>
                </div>

                <textarea
                  name="description"
                  className="w-full p-4 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg min-h-[160px] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  placeholder="Write your professional experience..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0eae95] text-white rounded-lg shadow-md hover:from-green-600 hover:to-green-800 hover:shadow-glow transition-all duration-300"
                >
                  {editId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Suggestions Modal */}
      {aiOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-[60]">
          <div className="bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] text-white p-6 rounded-2xl w-full max-w-3xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                AI Job Description Suggestions
              </h3>
              <button onClick={() => setAiOpen(false)}>
                <FaTimes />
              </button>
            </div>

            {!aiSuggestions.length ? (
              <>
                <textarea
                  className="w-full p-3 rounded-lg bg-black/40 border border-gray-700 min-h-[120px]"
                  placeholder="Enter rough job description..."
                  value={roughDescription}
                  onChange={(e) => setRoughDescription(e.target.value)}
                />
                <button
                  onClick={generateAISuggestions}
                  disabled={aiLoading}
                  className="mt-4 px-5 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all duration-300"
                >
                  {aiLoading ? "Generating..." : "Generate AI Suggestions"}
                </button>
              </>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                {aiSuggestions.map((desc, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setFormData({ ...formData, description: desc });
                      setAiOpen(false);
                    }}
                    className="p-4 border border-gray-700 rounded-lg hover:bg-purple-600/10 cursor-pointer transition-all duration-300"
                  >
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
