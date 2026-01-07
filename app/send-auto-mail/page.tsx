"use client";
import { useState, useEffect, useRef } from "react";
import { FaBriefcase } from "react-icons/fa";
import CompanyCard from "@/components/companies/CompanyCard";
import { toast } from "react-toastify";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import app, { auth } from "@/firebase/config";
import { getDatabase, ref, set, get, push } from "firebase/database";
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Toggle this to enable/disable mock data test button (for testing the custom email functionality)
const ENABLE_MOCK_DATA = false;

const Page = () => {
  const [isSending, setIsSending] = useState(true);
  const [isSent, setIsSent] = useState(false);
  const [emailArray, setEmailArray] = useState<string[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [uid, setUid] = useState("");
  const [urd, setUrd] = useState("");
  const [jsonData, setJsonData] = useState<any[]>([]);
  const [jobTitle, setJobTitle] = useState<string[]>([]);
  const [exp, setExp] = useState<number>(0);
  const [location, setLocation] = useState<string[]>([]);
  const [gemini_key, setGeminiKey] = useState("");
  const [emailLimitReached, setEmailLimitReached] = useState(false);
  const [resume, setResume] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState(""); // Default empty
  const [body, setBody] = useState(""); // Default empty
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview' | 'resume'>('editor'); // Mobile tab state

  // New states for duplicate detection and resume preview
  const [sentEmails, setSentEmails] = useState<Map<string, { companyName: string; sentAt: number }>>(new Map());
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateCompanies, setDuplicateCompanies] = useState<any[]>([]);
  const [showResumePreview, setShowResumePreview] = useState(false);

  // AI Email Generation states
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiMode, setAiMode] = useState<'generate' | 'enhance' | null>(null);

  const resumeFetched = useRef(false);
  const hasRun = useRef(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  const db = getDatabase(app);

  // Available placeholders for email customization
  const availablePlaceholders = [
    { key: "{company_name}", label: "Company Name", description: "Replaced with company name" },
    { key: "{job_title}", label: "Job Title", description: "Replaced with job position" },
    { key: "{location}", label: "Location", description: "Replaced with job location" },
    { key: "{your_name}", label: "Your Name", description: "Replaced with your name" },
  ];

  // Function to replace placeholders with actual company data
  const replacePlaceholders = (text: string, company: any) => {
    return text
      .replace(/{company_name}/gi, company?.company || '')
      .replace(/{job_title}/gi, company?.title || '')
      .replace(/{location}/gi, company?.location || '')
      .replace(/{your_name}/gi, userName || '');
  };

  // Function to insert placeholder at cursor position in body textarea
  const insertPlaceholder = (placeholder: string, target: 'subject' | 'body') => {
    if (target === 'body' && bodyTextareaRef.current) {
      const textarea = bodyTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = body.substring(0, start) + placeholder + body.substring(end);
      setBody(newBody);
      // Set cursor position after inserted placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else if (target === 'subject' && subjectInputRef.current) {
      const input = subjectInputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newSubject = subject.substring(0, start) + placeholder + subject.substring(end);
      setSubject(newSubject);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  // Fallback email template when AI fails
  const getFallbackEmail = () => {
    const fallbackSubject = "Application for {job_title} Position at {company_name}";
    const fallbackBody = `Dear Hiring Manager,

I am writing to express my strong interest in the {job_title} position at {company_name}. With my background and skills, I am confident I would be a valuable addition to your team.

I have attached my resume for your review. I would welcome the opportunity to discuss how my qualifications align with your team's needs.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
{your_name}`;

    return { subject: fallbackSubject, body: fallbackBody };
  };

  // AI Email Generation function
  const generateEmailWithAI = async (mode: 'generate' | 'enhance') => {
    setIsGeneratingAI(true);
    setAiMode(mode);

    try {
      // Check if API key exists
      if (!gemini_key) {
        toast.warning("⚠️ No Gemini API key found. Using template email instead.", { autoClose: 4000 });
        const fallback = getFallbackEmail();
        setSubject(fallback.subject);
        setBody(fallback.body);
        return;
      }

      // Get first company for context
      const sampleCompany = companies[0] || { company: "the company", title: "the position", location: "the location" };

      // Build prompt based on mode
      let prompt = "";
      if (mode === 'generate') {
        prompt = `You are a professional email writer. Write a compelling, personalized cold email for a job application.

Context:
- Applicant Name: ${userName || "Job Applicant"}
- Target Company: ${sampleCompany.company || "Company"}
- Job Position: ${sampleCompany.title || "Position"}
- Location: ${sampleCompany.location || "Location"}
- Resume/Background: The applicant has relevant experience and skills for this role.

Requirements:
1. Write a professional, engaging subject line
2. Write a concise body (3-4 paragraphs max)
3. Use placeholders: {company_name}, {job_title}, {location}, {your_name} so the email can be personalized for multiple companies
4. Make it sound human, not robotic
5. Keep it under 200 words

Format your response EXACTLY like this:
SUBJECT: [your subject line here]
BODY:
[your email body here]`;
      } else {
        // Enhance mode
        if (!subject.trim() && !body.trim()) {
          toast.error("Please write something first before enhancing.", { autoClose: 3000 });
          return;
        }

        prompt = `You are a professional email editor. Improve the following job application email while keeping the same intent and message.

Current Email:
Subject: ${subject || "(no subject)"}
Body: ${body || "(no body)"}

Context:
- Applicant Name: ${userName || "Job Applicant"}
- Target Company: ${sampleCompany.company || "Company"}  
- Job Position: ${sampleCompany.title || "Position"}

Requirements:
1. Improve clarity, professionalism, and engagement
2. Fix any grammar or spelling issues
3. Keep placeholders if present: {company_name}, {job_title}, {location}, {your_name}
4. Keep similar length (don't make it much longer)
5. Make it more compelling

Format your response EXACTLY like this:
SUBJECT: [improved subject line]
BODY:
[improved email body]`;
      }

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(gemini_key);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Generate content with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      const generatePromise = model.generateContent(prompt);
      const result = await Promise.race([generatePromise, timeoutPromise]) as any;

      const responseText = result.response.text();

      // Parse response
      const subjectMatch = responseText.match(/SUBJECT:\s*(.+?)(?:\n|BODY:)/i);
      const bodyMatch = responseText.match(/BODY:\s*([\s\S]+)$/i);

      if (subjectMatch && bodyMatch) {
        setSubject(subjectMatch[1].trim());
        setBody(bodyMatch[1].trim());
        toast.success(`✨ Email ${mode === 'generate' ? 'generated' : 'enhanced'} with AI!`, { autoClose: 3000 });
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error: any) {
      console.error('AI Generation Error:', error);

      // Detect rate limit or quota errors
      const errorMessage = error?.message?.toLowerCase() || '';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('quota') || errorMessage.includes('429');
      const isNetworkError = errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout');

      if (isRateLimit) {
        toast.warning("⏱️ AI rate limit reached. Using template email instead.", { autoClose: 5000 });
      } else if (isNetworkError) {
        toast.warning("🌐 Network error. Using template email instead.", { autoClose: 5000 });
      } else {
        toast.warning("⚠️ AI unavailable. Using template email instead.", { autoClose: 5000 });
      }

      // Use fallback
      const fallback = getFallbackEmail();
      setSubject(fallback.subject);
      setBody(fallback.body);

    } finally {
      setIsGeneratingAI(false);
      setAiMode(null);
    }
  };

  // Helper function to extract filename from resume URL
  const getResumeFilename = (url: string) => {
    if (!url) return 'Resume';
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'Resume';
      return decodeURIComponent(filename);
    } catch {
      return 'Resume';
    }
  };

  // Function to check for duplicate companies (already emailed)
  const checkForDuplicates = (companyList: any[]) => {
    const duplicates = companyList.filter(company =>
      sentEmails.has(company.email?.toLowerCase())
    );
    return duplicates;
  };

  // Fetch previously sent emails
  useEffect(() => {
    if (!uid) return;

    const fetchSentEmails = async () => {
      try {
        const sentEmailsRef = ref(db, `user/${uid}/sent_emails`);
        const snapshot = await get(sentEmailsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          const emailMap = new Map<string, { companyName: string; sentAt: number }>();
          Object.values(data).forEach((entry: any) => {
            if (entry.email) {
              emailMap.set(entry.email.toLowerCase(), {
                companyName: entry.companyName || 'Unknown',
                sentAt: entry.sentAt || 0
              });
            }
          });
          setSentEmails(emailMap);
          console.log('Fetched sent emails:', emailMap.size);
        }
      } catch (err) {
        console.error('Error fetching sent emails:', err);
      }
    };

    fetchSentEmails();
  }, [uid]);

  // Step 1: Fetch user data and resume
  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "";
    const name = localStorage.getItem("userName") || "";
    const verified = localStorage.getItem("emailVerified");
    const gemini_key = localStorage.getItem("api_key") || "";
    setGeminiKey(gemini_key);
    if (verified !== "true") {
      window.location.href = "/email_auth";
      return;
    }
    setUserEmail(email);
    setUserName(name);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        const DB_email = email.replace(/\./g, ",");
        const userRef = ref(db, `users/${DB_email}`);
        get(userRef)
          .then((snapshot) => {
            if (!snapshot.exists()) {
              toast.info("Please verify your email to continue.");
              localStorage.setItem("emailPermissionGranted", "false");
              setTimeout(() => {
                window.location.href = `/auth/google?email=${encodeURIComponent(email)}`;
              }, 2000);
            }
          })
          .catch((err) => {
            console.error("Database Error:", err.message);
            toast.error("Error verifying authentication. Please try again.");
          });

        const getUserData = async () => {
          if (emailLimitReached) return;
          try {
            let URD = localStorage.getItem("URD");
            const resumeRef = ref(db, `user/${user.uid}/forms/keyvalues/RD`);
            const resumeSnapshot = await get(resumeRef);
            if (resumeSnapshot.exists()) {
              setResume(resumeSnapshot.val());
              resumeFetched.current = true;
            } else {
              toast.error("No resume data found in database.");
              setTimeout(() => {
                window.location.href = "/resume2";
              }, 2000);
            }
            if (URD) {
              setUrd(URD);
            } else {
              const userRef = ref(db, `user/${user.uid}/forms/keyvalues/URD`);
              const snapshot = await get(userRef);
              if (snapshot.exists()) {
                setUrd(snapshot.val());
                localStorage.setItem("URD", snapshot.val());
              } else {
                toast.error("No URD data found.");
                setTimeout(() => {
                  window.location.href = "/resume2";
                }, 2000);
              }
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("Error fetching user data:", message);
            toast.error("Error fetching user data.");
          }
        };

        getUserData();
      } else {
        toast.error("No user logged-in!");
        window.location.href = "/sign-in";
      }
    });

    return () => unsubscribe();
  }, []);

  // Step 2: Check authentication status
  useEffect(() => {
    if (!userEmail || emailLimitReached || !resumeFetched.current) return;

    const checkAuthStatus = async () => {
      try {
        const response = await fetch(
          `https://send-auto-email-user-render.onrender.com/check-auth?email=${encodeURIComponent(userEmail)}`
        );
        const data = await response.json();
        if (!response.ok || !data.authenticated) {
          toast.info("For security reasons, please verify your email again.");
          localStorage.setItem("emailPermissionGranted", "false");
          setTimeout(() => {
            window.location.href = data.reauthUrl || "/email_auth";
          }, 3000);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error checking auth status:", message);
        toast.error("Failed to verify authentication. Please try again.");
      }
    };

    checkAuthStatus();
  }, [userEmail, resume]);

  // Step 3: Check email count limit
  useEffect(() => {
    if (!uid || emailLimitReached) return;

    const getEmailCount = async () => {
      try {
        const emailCountRef = ref(db, `user/${uid}/Payment/email_count`);
        const snapshot = await get(emailCountRef);
        const email_count = snapshot.val() || 0;

        if (email_count >= 10000) {
          setEmailLimitReached(true);
          toast.warning(
            <div className="p-4 bg-gradient-to-r from-purple-800 via-pink-600 to-red-500 rounded-xl shadow-lg text-white">
              <h2 className="text-lg font-bold">💼 Email Limit Reached</h2>
              <p className="text-sm mt-1">
                You've hit the <span className="font-semibold">10000 email</span> limit on your free plan.
              </p>
              <p className="text-sm">
                Upgrade to <span className="underline font-semibold">Premium</span> to continue sending job applications automatically.
              </p>
            </div>,
            { autoClose: 8000 }
          );
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error fetching email count:", message);
      }
    };

    getEmailCount();
  }, [uid]);

  // Step 4: Reusable email sending function with validation
  const sendEmail = async (companyEmail: string, subjectParam?: string, bodyParam?: string) => {
    if (!userEmail) {
      toast.error("Sender email is missing.");
      return false;
    }
    if (!companyEmail) {
      toast.error("Company email is missing.");
      return false;
    }
    if (!resume) {
      toast.error("Resume link is missing.");
      return false;
    }
    if (!userName) {
      toast.error("Sender name is missing.");
      return false;
    }

    const finalSubject = subjectParam || ""; // Custom subject or empty
    const finalBody = bodyParam || ""; // Custom body or empty (no default "hello")

    // Debug log to check what's being sent
    console.log('Sending email to:', companyEmail);
    console.log('Subject:', finalSubject);
    console.log('Body:', finalBody);
    console.log('Full payload:', {
      sender_email: userEmail,
      company_email: companyEmail,
      resume_link: resume,
      sender_name: userName,
      subject: finalSubject,
      text: finalBody,
    });

    try {
      const response = await fetch("https://send-auto-email-user-render.onrender.com/send-job-application", {
        method: "POST",
        body: JSON.stringify({
          sender_email: userEmail,
          company_email: companyEmail,
          resume_link: resume,
          sender_name: userName,
          subject: finalSubject,
          text: finalBody,
          body: finalBody
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log(`Email sent successfully to ${companyEmail}`);
        return true;
      } else {
        const data = await response.json();
        console.error("Error from server:", data.error);
        if (response.status === 401 && data.reauthUrl) {
          toast.info("For security reasons, please verify your email again.");
          localStorage.setItem("emailPermissionGranted", "false");
          setTimeout(() => {
            window.location.href = data.reauthUrl || "/email_auth";
          }, 2000);
        } else {
          toast.error(`Error sending email to ${companyEmail}: ${data.error}`);
        }
        return false;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Error sending email:", message);
      toast.error(`Failed to send email to ${companyEmail}.`);
      return false;
    }
  };

  // Batch email sending function
  const sendBatchEmails = async (sub: string, bod: string) => {
    try {
      let sentEmailCount = 0;
      const emailCountRef = ref(db, `user/${uid}/Payment/email_count`);
      const snapshot = await get(emailCountRef);
      let existingCount = snapshot.exists() ? snapshot.val() : 0;
      console.log("Existing email count:", existingCount);

      for (const email of emailArray) {
        if (existingCount + sentEmailCount >= 10000) {
          setEmailLimitReached(true);
          toast.warning(
            <div className="p-4 bg-gradient-to-r from-purple-800 via-pink-600 to-red-500 rounded-xl shadow-lg text-white">
              <h2 className="text-lg font-bold">💼 Email Limit Reached</h2>
              <p className="text-sm mt-1">
                You've hit the <span className="font-semibold">10000 email</span> limit on your free plan.
              </p>
              <p className="text-sm">
                Upgrade to <span className="underline font-semibold">Premium</span> to continue sending job applications automatically.
              </p>
            </div>,
            { autoClose: 8000 }
          );
          break;
        }

        // Find company data for this email
        const company = companies.find((c) => c.email === email);

        // Replace placeholders with actual company data
        const personalizedSubject = replacePlaceholders(sub, company);
        const personalizedBody = replacePlaceholders(bod, company);

        console.log(`Sending personalized email to ${company?.company || email}:`);
        console.log('Subject:', personalizedSubject);
        console.log('Body preview:', personalizedBody.substring(0, 100) + '...');

        const success = await sendEmail(email, personalizedSubject, personalizedBody);
        if (success) {
          sentEmailCount += 1;
          await set(emailCountRef, existingCount + sentEmailCount);
          console.log(`Updated email count to ${existingCount + sentEmailCount}`);

          // Save to sent_emails for duplicate tracking
          if (company) {
            const sentEmailRef = ref(db, `user/${uid}/sent_emails`);
            const newSentEmailRef = push(sentEmailRef);
            await set(newSentEmailRef, {
              email: company.email?.toLowerCase(),
              companyName: company.company,
              jobTitle: company.title,
              sentAt: Date.now()
            });

            // Update local state
            setSentEmails(prev => {
              const newMap = new Map(prev);
              newMap.set(company.email?.toLowerCase(), {
                companyName: company.company,
                sentAt: Date.now()
              });
              return newMap;
            });

            // Save to hr_marketing_data
            const marketingRef = ref(db, "hr_marketing_data");
            const newCompanyRef = push(marketingRef);
            await set(newCompanyRef, {
              companyName: company.company,
              email: company.email,
              isDownloaded: false,
            });
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      // Only clear localStorage after all emails are sent and UI is updated
      if (sentEmailCount > 0) {
        localStorage.removeItem("companies");
        console.log("Cleared companies from localStorage");
      }
      setIsSending(false);
      setIsSent(true);
      toast.success(`Successfully sent ${sentEmailCount} emails!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Error sending emails:", message);
      toast.error("Failed to send emails.");
      setIsSending(false);
      setIsSent(true);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error("Please fill in both subject and body.");
      return;
    }

    // Check for duplicate companies
    const duplicates = checkForDuplicates(companies);
    if (duplicates.length > 0 && !showDuplicateWarning) {
      setDuplicateCompanies(duplicates);
      setShowDuplicateWarning(true);
      return; // Wait for user confirmation
    }

    console.log('Modal submit - Subject:', subject, 'Body:', body);
    setShowModal(false);
    setShowDuplicateWarning(false);
    setDuplicateCompanies([]);
    setIsSending(true);
    await sendBatchEmails(subject, body);
    setSubject("");
    setBody("");
  };

  // Handle confirming to send despite duplicates
  const handleConfirmDuplicates = async () => {
    setShowDuplicateWarning(false);
    setShowModal(false);
    setIsSending(true);
    await sendBatchEmails(subject, body);
    setSubject("");
    setBody("");
    setDuplicateCompanies([]);
  };

  // Handle skipping duplicate companies
  const handleSkipDuplicates = () => {
    // Remove duplicate companies from the list
    const duplicateEmails = new Set(duplicateCompanies.map(c => c.email?.toLowerCase()));
    const filteredCompanies = companies.filter(c => !duplicateEmails.has(c.email?.toLowerCase()));
    const filteredEmails = filteredCompanies.map(c => c.email).filter(e => e !== "Not found");

    if (filteredCompanies.length === 0) {
      toast.info("All companies have already been emailed. No new emails to send.");
      setShowDuplicateWarning(false);
      setShowModal(false);
      return;
    }

    setCompanies(filteredCompanies);
    setEmailArray(filteredEmails);
    setShowDuplicateWarning(false);
    toast.success(`Removed ${duplicateCompanies.length} duplicate(s). ${filteredCompanies.length} companies remaining.`);
  };

  const handleCancel = () => {
    setShowModal(false);
    // Optionally clear companies if cancel, or keep for retry
    setSubject("");
    setBody("");
  };

  // Step 5: Authentication email sending (uses default, no subject/body needed for test)
  // useEffect(() => {
  //   if (!userEmail || !userName || !resumeFetched.current || emailLimitReached) return;

  //   const checkVerifyEmail = async () => {
  //     const success = await sendEmail("suman85bera@gmail.com", "", ""); // Empty for test
  //     if (!success) {
  //       console.error("Authentication email failed.");
  //     } else {
  //       console.log("Authentication email sent successfully (test).");
  //     }
  //   };

  //   checkVerifyEmail();
  // }, [userEmail, userName, resume]);

  // Step 6: Fetch Gemini response
  useEffect(() => {
    if (!urd || emailLimitReached) return;

    const fetchGeminiResponse = async () => {
      try {
        const exampleOutput = `[
          {"jobTitle": "Python Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "Backend Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "Full Stack Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "MERN Stack Developer", "location": "remote", "experience": "2-5"},
          {"jobTitle": "Software Engineer", "location": "remote", "experience": "2-5"}
        ]`;

        const userPrompt = `Analyze the following resume and extract job titles, location, and experience range.
                    Response format:
                    \`\`\`json
                    [
                        {"jobTitle": "<Job Title>", "location": "<Preferred Location>", "experience": "<Experience Range>"}
                    ]
                    \`\`\`
                    Resume: ${urd}
                    Example Output:
                    \`\`\`json
                    ${exampleOutput}
                    \`\`\``;

        const genAI = new GoogleGenerativeAI(gemini_key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const response = await model.generateContent(userPrompt);
        const textResponse = await response.response.text();

        const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/);
        const jsonOutput = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(textResponse);

        console.log("✅ Gemini Parsed Response:", jsonOutput);
        setJsonData(jsonOutput);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("❌ Error in fetchGeminiResponse:", message);
        toast.error("Failed to process resume with Gemini API.");
      }
    };

    // fetchGeminiResponse();
  }, [urd, gemini_key]);

  // Step 7: Process Gemini data
  useEffect(() => {
    if (!jsonData || jsonData.length === 0 || emailLimitReached) return;

    const processData = () => {
      try {
        const jobTitles = jsonData
          .filter((job) => job.jobTitle)
          .map((job) => job.jobTitle);
        setJobTitle(jobTitles);

        const validJobs = jsonData.filter(
          (job) => typeof job.experience === "string" && job.experience.includes("-")
        );
        const avgExperience =
          validJobs.length > 0
            ? validJobs.reduce((sum, job) => {
              const [min, max] = job.experience.split("-").map(Number);
              if (isNaN(min) || isNaN(max)) {
                console.warn(`Invalid experience range for job: ${job.jobTitle}, experience: ${job.experience}`);
                return sum;
              }
              return sum + (min + max) / 2;
            }, 0) / validJobs.length
            : 0;
        setExp(avgExperience);

        const locations = [...new Set(jsonData.filter((job) => job.location).map((job) => job.location))];
        setLocation(locations);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error processing Gemini data:", message);
        toast.error("Failed to process job data.");
      }
    };

    processData();
  }, [jsonData]);

  // Step 8: Verify user email in database
  useEffect(() => {
    if (!userEmail || emailLimitReached) return;

    const DB_email = userEmail.replace(/\./g, ",");
    const userRef = ref(db, `users/${DB_email}`);

    get(userRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          window.location.href = "/email_auth";
        }
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Database Error:", message);
        toast.error("Error verifying user data.");
      });
  }, [userEmail]);

  // Step 9: Handle email data from extension and localStorage
  useEffect(() => {
    if (emailLimitReached) return;

    // Load companies from localStorage if available
    const storedCompanies = localStorage.getItem("companies");
    if (storedCompanies) {
      try {
        const parsedCompanies = JSON.parse(storedCompanies);
        setCompanies(parsedCompanies);
        const emails = parsedCompanies
          .map((company: any) => company.email)
          .filter((email: string) => email !== "Not found");
        setEmailArray(emails);
        console.log("Loaded companies from localStorage:", parsedCompanies);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error parsing stored companies:", message);
      }
    }

    // Listen for new jobs from extension
    const handleEmailsData = (event: any) => {
      const jobs = event.detail;
      console.log("Received jobs from extension:", jobs);

      const filteredJobs = jobs.filter((job: any) => job.email !== "Not found");
      localStorage.setItem("companies", JSON.stringify(filteredJobs));
      setCompanies(filteredJobs);

      if (filteredJobs.length > 0) {
        const emails = filteredJobs
          .map((company: any) => company.email)
          .filter((email: string) => email !== "Not found");
        setEmailArray(emails);
        console.log("Recruiter Emails:", emails);
      }
    };

    document.addEventListener("emailsData", handleEmailsData);

    return () => {
      document.removeEventListener("emailsData", handleEmailsData);
    };
  }, [emailLimitReached]);

  // Open modal when emails are available
  useEffect(() => {
    if (emailArray.length > 0 && !hasRun.current && !emailLimitReached && resumeFetched.current) {
      console.log("Opening modal for email customization...");
      setShowModal(true);
      hasRun.current = true;
    }
  }, [emailArray]);

  const handleUpdatePlan = () => {
    window.location.href = "/payment";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013e] to-[#11011E] py-12 text-white">
      <div className="max-w-7xl w-full mx-auto px-4 flex flex-col gap-6">
        {emailLimitReached && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] p-10 rounded-[12px] bg-[#11011E] border border-[#0FAE96] shadow-[0_0_12px_2px_#DFDFDF]240 text-center flex flex-col gap-5 scale-[1.2]">
            <h2 className="text-[32px] font-bold text-[#FFFFFF]">Email Limit Reached</h2>
            <p className="text-[16px] leading-6 text-[#B6B6B6]">
              Hit the <span className="font-semibold text-[#FFFFFF]">10000-email</span> free plan limit.
            </p>
            <p className="text-[16px] leading-6 text-[#B6B6B6]">
              Go <span className="underline font-semibold text-[#0FAE96]">Premium</span> to send more.
            </p>
            <button
              className="bg-[#0FAE96] text-[#FFFFFF] font-semibold py-2 px-6 rounded-[10px] hover:bg-[#0C8C79] transition-opacity duration-150 w-full max-w-[200px] mx-auto"
              onClick={handleUpdatePlan}
            >
              Upgrade
            </button>
          </div>
        )}

        {!emailLimitReached && companies.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <FaBriefcase className="text-white" />
              {isSending ? "Sending Emails..." : "Applications"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company, index) => (
                <div
                  key={index}
                  className="bg-[#11011E] border border-[#0FAE96] rounded-[10px] p-6 shadow-[0_0_8px_2px_#DFDFDF] hover:opacity-90 transition-opacity duration-150 h-full flex flex-col"
                >
                  <CompanyCard {...company} isSending={isSending} isSent={isSent} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - No companies yet */}
        {!emailLimitReached && companies.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <FaBriefcase className="text-6xl text-[#0FAE96] mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Companies Yet</h2>
            <p className="text-gray-400 mb-6 max-w-md">
              Use the browser extension to scrape company data from job boards{ENABLE_MOCK_DATA ? ', or test the modal with sample data.' : '.'}
            </p>
            {ENABLE_MOCK_DATA && (
              <button
                onClick={() => {
                  // Load mock data for testing
                  const mockCompanies = [
                    { company: "TechCorp Inc", email: "hr@techcorp.com", location: "Remote", title: "Software Engineer" },
                    { company: "DataSoft LLC", email: "jobs@datasoft.com", location: "New York", title: "Data Analyst" },
                    { company: "WebDev Studios", email: "careers@webdev.io", location: "San Francisco", title: "Frontend Developer" },
                  ];
                  setCompanies(mockCompanies);
                  setEmailArray(mockCompanies.map(c => c.email));
                  setShowModal(true);
                  hasRun.current = true;
                }}
                className="px-6 py-3 bg-[#0FAE96] text-white rounded-lg hover:bg-[#0C8C79] transition-colors font-medium"
              >
                🧪 Test Modal with Sample Data
              </button>
            )}
          </div>
        )}
      </div>

      {/* Email Customization Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="relative bg-[#11011E] rounded-xl border border-[#0FAE96] max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-[0_0_40px_rgba(15,174,150,0.3)]">
            {/* Header */}
            <div className="p-5 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">✉️ Customize Your Job Application Email</h2>
              <p className="text-gray-400 text-sm mt-1">
                💡 <strong>Tip:</strong> Use placeholders like <code className="bg-gray-800 px-1.5 py-0.5 rounded text-[#0FAE96]">{'{company_name}'}</code> and they will be replaced with actual data for each company!
              </p>
            </div>

            {/* Main Content - Two Columns on Desktop, Tabs on Mobile */}
            <div className="flex flex-col lg:flex-row max-h-[calc(95vh-180px)] overflow-hidden">

              {/* Mobile Tab Switcher */}
              <div className="lg:hidden flex border-b border-gray-700">
                <button
                  onClick={() => setMobileTab('editor')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === 'editor' ? 'text-[#0FAE96] border-b-2 border-[#0FAE96] bg-[#0FAE96]/10' : 'text-gray-400'}`}
                >
                  📝 Write
                </button>
                <button
                  onClick={() => setMobileTab('preview')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === 'preview' ? 'text-[#0FAE96] border-b-2 border-[#0FAE96] bg-[#0FAE96]/10' : 'text-gray-400'}`}
                >
                  👁️ Preview
                </button>
                <button
                  onClick={() => setMobileTab('resume')}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${mobileTab === 'resume' ? 'text-[#0FAE96] border-b-2 border-[#0FAE96] bg-[#0FAE96]/10' : 'text-gray-400'}`}
                >
                  📄 Resume
                </button>
              </div>
              {/* LEFT SIDE - Editor (Always visible on desktop, tab on mobile) */}
              <div className={`flex-1 lg:flex lg:flex-col lg:border-r border-gray-700 overflow-y-auto lg:overflow-visible custom-scrollbar ${mobileTab !== 'editor' ? 'hidden lg:flex' : ''}`}>
                {/* Header + AI Toolbar - Sticky on Desktop Only */}
                <div className="p-5 pb-0 lg:sticky lg:top-0 lg:bg-[#11011E] lg:z-10">
                  <h3 className="text-lg font-semibold text-white mb-4">📝 Write Your Email</h3>

                  {/* AI Generation Toolbar */}
                  <div className="mb-5 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">✨</span>
                        <div>
                          <p className="text-white font-medium text-sm">AI Email Assistant</p>
                          <p className="text-gray-400 text-xs">Generate or enhance your email with AI</p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => generateEmailWithAI('generate')}
                          disabled={isGeneratingAI}
                          className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isGeneratingAI && aiMode === 'generate' ? (
                            <>
                              <span className="animate-spin">⏳</span> Generating...
                            </>
                          ) : (
                            <>
                              <span>🪄</span> Generate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => generateEmailWithAI('enhance')}
                          disabled={isGeneratingAI || (!subject.trim() && !body.trim())}
                          className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          title={!subject.trim() && !body.trim() ? "Write something first to enhance" : "Improve your draft with AI"}
                        >
                          {isGeneratingAI && aiMode === 'enhance' ? (
                            <>
                              <span className="animate-spin">⏳</span> Enhancing...
                            </>
                          ) : (
                            <>
                              <span>🔧</span> Enhance
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {isGeneratingAI && (
                      <div className="mt-3 flex items-center gap-2 text-purple-300 text-xs">
                        <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>AI is {aiMode === 'generate' ? 'crafting your email' : 'improving your draft'}...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Content - Scrollable on Desktop Only */}
                <div className="p-5 pt-0 lg:flex-1 lg:overflow-y-auto lg:custom-scrollbar">
                  {/* Subject Input with inline placeholders */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-300">Subject Line</label>
                      <div className="flex gap-1">
                        {availablePlaceholders.slice(0, 2).reverse().map((p) => (
                          <button
                            key={p.key + '-subject'}
                            onClick={() => insertPlaceholder(p.key, 'subject')}
                            className="px-2 py-0.5 bg-[#0FAE96]/20 text-[#0FAE96] rounded text-xs font-mono hover:bg-[#0FAE96]/40 transition-all"
                            title={`Insert ${p.label} into subject`}
                          >
                            + {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      ref={subjectInputRef}
                      type="text"
                      placeholder="e.g., Application for {job_title} at {company_name}"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-[#0FAE96] focus:ring-2 focus:ring-[#0FAE96]/50 font-mono text-sm"
                    />
                  </div>

                  {/* Body Textarea with inline placeholders */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-300">Email Body</label>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {availablePlaceholders.map((p) => (
                          <button
                            key={p.key + '-body'}
                            onClick={() => insertPlaceholder(p.key, 'body')}
                            className="px-2 py-0.5 bg-[#0FAE96]/20 text-[#0FAE96] rounded text-xs font-mono hover:bg-[#0FAE96]/40 transition-all"
                            title={`Insert ${p.label} into body`}
                          >
                            + {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea
                      ref={bodyTextareaRef}
                      placeholder={`Dear Hiring Manager,

I am writing to express my interest in the {job_title} position at {company_name}.

With my skills and experience, I believe I would be a great fit for your team in {location}.

Best regards,
{your_name}`}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-[#0FAE96] focus:ring-2 focus:ring-[#0FAE96]/50 h-64 resize-none font-mono text-sm leading-relaxed"
                      rows={10}
                    />
                  </div>

                  {/* Placeholder Legend */}
                  <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400 mb-2 font-medium">🏷️ Available Placeholders:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {availablePlaceholders.map((p) => (
                        <div key={p.key + '-legend'} className="flex items-center gap-2">
                          <code className="bg-gray-900 px-1.5 py-0.5 rounded text-[#0FAE96]">{p.key}</code>
                          <span className="text-gray-500">→ {p.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE - Live Preview (Always visible on desktop, tab on mobile) */}
              <div className={`flex-1 lg:flex lg:flex-col bg-[#0d0d1a] overflow-y-auto lg:overflow-visible custom-scrollbar ${mobileTab !== 'preview' ? 'hidden lg:flex' : ''}`}>
                {/* Header - Sticky on Desktop Only */}
                <div className="p-5 pb-0 lg:sticky lg:top-0 lg:bg-[#0d0d1a] lg:z-10">
                  <h3 className="text-lg font-semibold text-white mb-2 lg:mb-4">👁️ Live Preview</h3>
                  <p className="text-xs text-gray-500 mb-4">See how your email looks for each company:</p>
                </div>

                {/* Preview Content - Scrollable on Desktop Only */}
                <div className="p-5 pt-0 lg:flex-1 lg:overflow-y-auto lg:custom-scrollbar">

                  {companies.length > 0 && (
                    <div className="space-y-4">
                      {companies.slice(0, 3).map((company, idx) => (
                        <div key={idx} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-6 h-6 bg-[#0FAE96] rounded-full flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            <span className="text-sm font-medium text-white">{company.company}</span>
                            <span className="text-xs text-gray-500">({company.email})</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-gray-400 text-xs uppercase tracking-wide">Subject:</span>
                              <p className="text-white font-medium mt-0.5">
                                {replacePlaceholders(subject || 'Your subject here...', company)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-xs uppercase tracking-wide">Body:</span>
                              <p className="text-gray-300 mt-0.5 whitespace-pre-wrap text-xs leading-relaxed">
                                {replacePlaceholders(body || 'Your email body will appear here...', company)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {companies.length > 3 && (
                        <p className="text-center text-gray-500 text-sm">+ {companies.length - 3} more companies...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RESUME PREVIEW (Mobile Tab Only - hidden on desktop) */}
              <div className={`p-5 bg-[#0d0d1a] ${mobileTab !== 'resume' ? 'hidden' : ''}`}>
                <h3 className="text-lg font-semibold text-white mb-4">📄 Attached Resume</h3>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  {resume ? (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-red-400 text-lg">📄</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{getResumeFilename(resume)}</p>
                          <p className="text-gray-500 text-xs">PDF Document</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowResumePreview(true)}
                        className="w-full block text-center py-2 bg-[#0FAE96]/20 text-[#0FAE96] rounded-lg text-sm font-medium hover:bg-[#0FAE96]/30 transition-colors"
                      >
                        👁️ View Resume
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <span className="text-4xl mb-2 block">⚠️</span>
                      <p className="text-gray-400 text-sm">No resume attached</p>
                      <a href="/resume2" className="text-[#0FAE96] text-sm hover:underline mt-2 inline-block">
                        Upload Resume →
                      </a>
                    </div>
                  )}
                </div>

                {/* Duplicate Warning Indicator */}
                {sentEmails.size > 0 && checkForDuplicates(companies).length > 0 && (
                  <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-xs font-medium flex items-center gap-2">
                      <span>⚠️</span>
                      {checkForDuplicates(companies).length} already emailed
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Duplicate Warning Popup */}
            {showDuplicateWarning && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-10">
                <div className="bg-[#1a1a2e] rounded-xl border border-yellow-500/50 max-w-md w-full p-6 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                  <div className="text-center mb-4">
                    <span className="text-5xl">⚠️</span>
                    <h3 className="text-xl font-bold text-white mt-2">Duplicate Companies Detected</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      You have already sent emails to {duplicateCompanies.length} of these companies:
                    </p>
                  </div>

                  <div className="max-h-40 overflow-y-auto custom-scrollbar mb-4">
                    {duplicateCompanies.map((company, idx) => (
                      <div key={idx} className="flex items-center gap-2 py-2 border-b border-gray-700 last:border-0">
                        <span className="text-yellow-400">•</span>
                        <span className="text-white text-sm">{company.company}</span>
                        <span className="text-gray-500 text-xs">({company.email})</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleSkipDuplicates}
                      className="w-full py-2.5 bg-[#0FAE96] text-white rounded-lg font-medium hover:bg-[#0C8C79] transition-colors"
                    >
                      ✓ Skip Duplicates & Continue
                    </button>
                    <button
                      onClick={handleConfirmDuplicates}
                      className="w-full py-2.5 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                    >
                      📤 Send Anyway (Including Duplicates)
                    </button>
                    <button
                      onClick={() => setShowDuplicateWarning(false)}
                      className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer - Action Buttons */}
            <div className="p-5 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-[#11011E]">
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>📧 <span className="text-[#0FAE96] font-bold">{emailArray.length}</span> companies</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:flex items-center gap-2">
                  {resume ? (
                    <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700">
                      <span className="text-green-400 flex items-center gap-1">
                        <span>✅</span> Resume Attached
                      </span>
                      <span className="text-gray-600">|</span>
                      <button
                        onClick={() => setShowResumePreview(true)}
                        className="text-[#0FAE96] hover:text-[#12c9ad] font-medium flex items-center gap-1 transition-colors"
                      >
                        👁️ View Resume
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30">
                      <span className="text-red-400">⚠️ No resume attached</span>
                      <a href="/updateresume" className="text-[#0FAE96] hover:underline text-xs">Upload</a>
                    </div>
                  )}
                </span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCancel}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!subject.trim() || !body.trim()}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0FAE96] text-white rounded-lg hover:bg-[#0C8C79] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <span>📤</span> Send All
                </button>
              </div>
            </div>

            {/* Resume Preview Modal */}
            {showResumePreview && resume && (
              <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-20">
                <div className="bg-[#11011E] rounded-xl border border-[#0FAE96] max-w-5xl w-full h-[90vh] flex flex-col shadow-[0_0_40px_rgba(15,174,150,0.3)]">
                  <div className="p-4 border-b border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">Resume Preview</h3>
                        <p className="text-gray-400 text-xs">This resume will be attached to all emails</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href="/updateresume"
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700 transition-colors flex items-center gap-1"
                      >
                        🔄 Change Resume
                      </a>
                      <button
                        onClick={() => setShowResumePreview(false)}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 bg-white">
                    <iframe
                      src={resume.includes('drive.google.com') ? resume.replace('/view', '/preview').replace('?usp=sharing', '') : resume}
                      className="w-full h-full"
                      title="Resume Preview"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;