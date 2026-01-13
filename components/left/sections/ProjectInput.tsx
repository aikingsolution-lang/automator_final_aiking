"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { FaTimes } from "react-icons/fa";
import { BiBook } from "react-icons/bi";
import { Pencil, Trash2 } from "lucide-react";
import { useProjectStore } from "@/app/store";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "react-toastify";

/* ================= AI PROMPT ================= */

const buildProjectDescriptionPrompt = (
  title: string,
  description: string
) => `
    You are a senior technical resume writer for software engineers.

    Context (for understanding only, DO NOT mention the project name or title in the output):
      Project Title: "${title}"
      Project Notes: "${description}"

    TASK:
      - Generate EXACTLY 6 different project descriptions
      - EACH description MUST be between 45 and 60 words (strict)
      - DO NOT mention the project name or title
      - Focus heavily on:
        - Tech stack
        - Architecture
        - APIs
        - Performance
        - Security
        - Scalability
      - Use strong action verbs
      - Resume-style, ATS-friendly language
      - Do NOT use phrases like "this project" or "the application"

    RESTRICTIONS:
      - No emojis
      - No bullet points
      - No numbering
      - No headings

    OUTPUT FORMAT:
    Return ONLY a valid JSON array of 6 strings.
`.trim();

/* ================= VALIDATION ================= */

const isValidDescription = (text: string): { valid: boolean; message: string } => {
  const trimmed = text.trim();

  // Check minimum length
  if (trimmed.length < 20) {
    return {
      valid: false,
      message: "Please enter at least 20 characters describing your project."
    };
  }

  // Check for gibberish (mostly random characters, no real words)
  const wordPattern = /\b[a-zA-Z]{3,}\b/g;
  const words = trimmed.match(wordPattern) || [];
  if (words.length < 3) {
    return {
      valid: false,
      message: "Please write a meaningful description with at least 3 real words."
    };
  }

  return { valid: true, message: "" };
};

/* ================= DATE FORMATTER ================= */

const formatDateForDisplay = (dateStr: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

/* ================= COMPONENT ================= */

export default function ProjectInput() {
  const { projects, addProject, updateProject, deleteProject } =
    useProjectStore();

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    website: "",
    description: "",
  });

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
    if (!geminiClient) {
      toast.error("API key not configured. Please add your Gemini API key.");
      return;
    }

    if (!formData.name) {
      toast.error("Please enter a project name first.");
      return;
    }

    const baseDescription =
      formData.description.trim() && roughDescription.trim()
        ? `${formData.description.trim()}\n\n${roughDescription.trim()}`
        : (formData.description.trim() || roughDescription.trim());

    // Validate the description before generating
    const validation = isValidDescription(baseDescription);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    try {
      setAiLoading(true);
      setAiSuggestions([]);

      const model = geminiClient.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });

      const prompt = buildProjectDescriptionPrompt(
        formData.name,
        baseDescription
      );

      const response = await model.generateContent(prompt);
      const text =
        response?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const match = text.match(/\[[\s\S]*\]/);
      if (!match) {
        toast.error("Failed to parse AI response. Please try again.");
        throw new Error("Invalid Gemini response");
      }

      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed) || parsed.length !== 6) {
        toast.error("Unexpected AI response format. Please try again.");
        throw new Error("Invalid suggestion count");
      }

      setAiSuggestions(parsed);
      toast.success("AI suggestions generated successfully!");
    } catch (err) {
      console.error("Gemini error:", err);
      if (!aiSuggestions.length) {
        toast.error("Failed to generate suggestions. Please try again.");
      }
    } finally {
      setAiLoading(false);
    }
  }, [geminiClient, formData.name, formData.description, roughDescription, aiSuggestions.length]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (editId) {
      updateProject(
        editId,
        formData.name,
        formData.description,
        formData.startDate,
        formData.endDate,
        formData.website
      );
      toast.success("Project updated successfully!");
    } else {
      addProject(
        formData.name,
        formData.description,
        formData.startDate,
        formData.endDate,
        formData.website
      );
      toast.success("Project added successfully!");
    }

    setFormData({ name: "", startDate: "", endDate: "", website: "", description: "" });
    setEditId(null);
    resetAIState();
    setIsOpen(false);
  };

  const handleEdit = (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;

    resetAIState();

    setFormData({
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      website: project.website,
      description: project.description,
    });

    setEditId(id);
    setIsOpen(true);
  };

  /* ================= UI ================= */

  return (
    <section className="p-6 border-b border-[rgba(255,255,255,0.05)] bg-gradient-to-b from-main-bg via-[rgba(17,1,30,0.95)] to-main-bg text-text-subtitle shadow-2xl rounded-xl">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BiBook className="text-2xl text-white drop-shadow-glow" />
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Projects
          </h2>
        </div>
      </div>

      {/* Display Projects List */}
      {projects.length > 0 && (
        <div className="mb-6 space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-4 bg-gray-800/50 backdrop-blur-md rounded-xl flex justify-between items-center transition-all duration-300 hover:shadow-glow hover:scale-[1.02]"
            >
              <div>
                <strong className="text-lg font-semibold text-white drop-shadow-md">
                  {project.name}
                </strong>
                <p className="text-sm text-gray-300">
                  {formatDateForDisplay(project.startDate)}
                  {project.startDate && " - "}
                  {project.endDate ? formatDateForDisplay(project.endDate) : (project.startDate ? "Present" : "")}
                </p>
                {project.website && (
                  <a
                    href={project.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs underline hover:text-blue-300"
                  >
                    View Project
                  </a>
                )}
                <p className="text-xs text-gray-500">{project.description}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(project.id)}
                  className="p-2 rounded-full bg-blue-600/20 hover:bg-blue-600/40 transition-all duration-300"
                >
                  <Pencil className="w-5 h-5 text-blue-400" />
                </button>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="p-2 rounded-full bg-red-600/20 hover:bg-red-600/40 transition-all duration-300"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Project Button */}
      <button
        onClick={() => {
          resetAIState();
          setFormData({ name: "", startDate: "", endDate: "", website: "", description: "" });
          setEditId(null);
          setIsOpen(true);
        }}
        className="w-full p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 bg-[rgba(255,255,255,0.05)] backdrop-blur-md hover:border-gray-500 hover:text-white transition-all duration-300 shadow-inner hover:shadow-glow"
      >
        + Add a new project
      </button>

      {/* Project Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50">
          <div className="bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] text-white p-8 rounded-2xl w-full max-w-[650px] shadow-2xl backdrop-blur-md border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {editId ? "Edit Project" : "Add Project"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/70 transition-all duration-300"
              >
                <FaTimes size={20} className="text-gray-300" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-5 mb-6">

                <input
                  type="text"
                  name="name"
                  placeholder="Project Name"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

                <input
                  type="url"
                  name="website"
                  placeholder="Project Website (Optional)"
                  className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  value={formData.website}
                  onChange={handleChange}
                />

                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                    value={formData.startDate}
                    onChange={handleChange}
                    onFocus={(e) => e.target.showPicker()}
                    required
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-gray-400 mb-1">End Date (leave empty for ongoing)</label>
                  <input
                    type="date"
                    name="endDate"
                    className="w-full p-3 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                    value={formData.endDate}
                    onChange={handleChange}
                    onFocus={(e) => e.target.showPicker()}
                  />
                </div>
              </div>

              {/* Description Textarea + AI Button */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">
                    Project Description *
                  </span>
                  <button
                    type="button"
                    disabled={!formData.name}
                    onClick={() => {
                      // Validate before opening AI modal
                      const currentDesc = formData.description.trim();
                      if (!currentDesc) {
                        toast.warning("Please write a description first. AI will enhance your input, not generate from scratch.");
                        return;
                      }
                      const validation = isValidDescription(currentDesc);
                      if (!validation.valid) {
                        toast.warning(validation.message + " AI needs meaningful input to enhance.");
                        return;
                      }
                      resetAIState();
                      setRoughDescription(formData.description);
                      setAiOpen(true);
                    }}
                    className="text-xs px-3 py-1 rounded-full bg-purple-600/20 text-purple-300 hover:bg-purple-600/40 disabled:opacity-40 transition-all duration-300"
                  >
                    ✨ AI Enhance
                  </button>
                </div>

                <textarea
                  name="description"
                  className="w-full p-4 bg-gradient-to-b from-[#0F011E] via-[rgba(17,1,30,0.95)] to-[#0F011E] border border-gray-700 rounded-lg min-h-[160px] text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all duration-300 shadow-inner hover:shadow-glow"
                  placeholder="Describe your project... (AI will enhance this, so write at least 20 characters)"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Write a brief description first, then use AI Enhance to make it professional.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0eae95] text-white rounded-lg shadow-md hover:shadow-glow transition-all duration-300"
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
                AI Project Description Enhancement
              </h3>
              <button onClick={() => setAiOpen(false)}>
                <FaTimes />
              </button>
            </div>

            {!aiSuggestions.length ? (
              <>
                <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-700/50">
                  <p className="text-sm text-purple-200">
                    💡 AI will enhance your description to be more professional and ATS-friendly.
                    You can add more details below or click Generate to enhance your current input.
                  </p>
                </div>
                <textarea
                  className="w-full p-3 rounded-lg bg-black/40 border border-gray-700 min-h-[120px]"
                  placeholder="Add more details about your project (optional)..."
                  value={roughDescription}
                  onChange={(e) => setRoughDescription(e.target.value)}
                />
                <button
                  onClick={generateAISuggestions}
                  disabled={aiLoading}
                  className="mt-4 px-5 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-all duration-300 disabled:opacity-50"
                >
                  {aiLoading ? "Generating..." : "✨ Generate AI Enhanced Descriptions"}
                </button>
              </>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                <p className="text-sm text-gray-400 mb-2">
                  Click on any suggestion to use it:
                </p>
                {aiSuggestions.map((desc, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setFormData({ ...formData, description: desc });
                      setAiOpen(false);
                      toast.success("Description applied!");
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
