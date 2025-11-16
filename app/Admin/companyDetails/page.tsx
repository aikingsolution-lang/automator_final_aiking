"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { database } from "@/firebase/config";
import { ref, onValue, update } from "firebase/database";
import { auth } from "@/firebase/config";
import { getDatabase, ref as dbRef, get } from "firebase/database";
// @ts-ignore
import Papa from "papaparse";
// @ts-ignore
import { saveAs } from "file-saver";

interface Company {
  companyName: string;
  email: string;
  isDownloaded: boolean;
  key: string;
}

const CompanyDetailsPage = () => {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);

  useEffect(() => {
    // Fetch admin emails from Firebase Realtime Database
    const fetchAdminEmails = async () => {
      try {
        const db = getDatabase();
        const adminsRef = dbRef(db, "admins");
        const snapshot = await get(adminsRef);
        if (snapshot.exists()) {
          const adminsData = snapshot.val();
          const emails = Object.values(adminsData).map((admin: any) => admin.email);
          setAdminEmails(emails);
        } else {
          setAdminEmails([]);
        }
      } catch (error) {
        setAdminEmails([]);
      }
    };
    fetchAdminEmails();
  }, []);

  useEffect(() => {
    if (adminEmails.length === 0) return; // Wait until admin emails are fetched
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/sign-in");
        return;
      }
      if (user.email && adminEmails.includes(user.email)) {
        setIsAdmin(true);
      } else {
        setAccessDenied(true);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router, adminEmails]);

  useEffect(() => {
    if (!isAdmin) return;
    const companiesRef = ref(database, "hr_marketing_data");
    const unsubscribe = onValue(companiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const arr: Company[] = Object.entries(data)
          .filter(([_, c]) => c && (c as Company).isDownloaded === false)
          .map(([key, c]) => ({ ...(c as Company), key }));
        setCompanies(arr);
      } else {
        setCompanies([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const handleDownload = async () => {
    setDownloading(true);
    // Prepare CSV
    const csv = Papa.unparse(
      companies.map(({ companyName, email }) => ({ companyName, email }))
    );
    // Download CSV
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "companies.csv");

    // Update isDownloaded in Firebase
    const updates: Record<string, boolean> = {};
    companies.forEach((c) => {
      const key = c.key;
      updates[`hr_marketing_data/${key}/isDownloaded`] = true;
    });
    await update(ref(database), updates);
    setDownloading(false);
  };

  // Conditional rendering inside return
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#0FAE96", fontSize: 20, animation: "pulse 1s infinite" }}>Loading...</span>
      </div>
    );
  }
  if (accessDenied) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#11011E" }}>
        <h1 style={{ fontSize: 32, fontWeight: "bold", color: "#ff3333", marginBottom: 16 }}>Access Denied</h1>
        <p style={{ fontSize: 18, color: "#B6B6B6", marginBottom: 32 }}>You do not have access to this page because you are not an admin.</p>
        <button style={{ padding: "10px 24px", background: "#0FAE96", color: "#fff", fontWeight: 600, borderRadius: 8, border: "none" }} onClick={() => router.push("/")}>Go to Home</button>
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013E] to-[#11011E] p-6 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute -top-16 -left-16 w-72 h-72 bg-[#7000FF] rounded-full blur-3xl opacity-20 z-0"></div>
      <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-[#FF00C7] rounded-full blur-3xl opacity-20 z-0"></div>
      {/* Glassmorphism Card */}
      <section className="relative w-full max-w-2xl bg-[rgba(255,255,255,0.02)] rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.07)] p-10 z-10 backdrop-blur-md animate-fade-in-up">
        <button
          className="mb-6 px-4 py-2 bg-[#0FAE96] text-white rounded-lg font-semibold shadow hover:bg-[#0fae96cc] transition-all duration-200"
          onClick={() => router.push("/Admin")}
        >
          ← Back to Admin Dashboard
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-center text-[#0FAE96] mb-4 font-raleway drop-shadow-lg">Company Details</h1>
        <p className="text-[#B6B6B6] text-center mb-8 text-lg">All company details coming through JobForm Automator will be displayed here.</p>
        {loading ? (
          <div className="bg-[rgba(15,174,150,0.08)] border border-[#0FAE96]/20 rounded-lg p-6 text-center">
            <span className="text-[#ECF1F0] text-base md:text-lg font-medium">Loading...</span>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-[rgba(15,174,150,0.08)] border border-[#0FAE96]/20 rounded-lg p-6 text-center">
            <span className="text-[#ECF1F0] text-base md:text-lg font-medium">No company data to display.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 mb-6">
              {companies.map((c) => (
                <div key={c.key} className="bg-[rgba(15,174,150,0.08)] border border-[#0FAE96]/20 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between shadow">
                  <div>
                    <div className="text-[#0FAE96] font-semibold">Company Name: <span className="text-[#ECF1F0]">{c.companyName}</span></div>
                    <div className="text-[#0FAE96] font-semibold">Email: <span className="text-[#ECF1F0]">{c.email}</span></div>
                  </div>
                  <div className="mt-2 md:mt-0">
                    <span className="inline-block px-3 py-1 bg-[#0FAE96] text-white rounded text-xs font-bold">Not Downloaded</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="px-6 py-3 bg-[#0FAE96] text-white font-semibold rounded-lg shadow hover:bg-[#0fae96cc] transition-all duration-200 text-base w-full"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? "Downloading..." : "Download All as CSV & Mark Downloaded"}
            </button>
          </>
        )}
      </section>
    </main>
  );
};

export default CompanyDetailsPage;
