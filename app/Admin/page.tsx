"use client";
import React, { useEffect, useState } from "react";
import { auth } from "@/firebase/config";
import { useRouter } from "next/navigation";
import { getDatabase, ref, get } from "firebase/database";

const AdminPage = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const router = useRouter();
  const name = "suman";

  useEffect(() => {
    // Fetch admin emails from Firebase Realtime Database
    const fetchAdminEmails = async () => {
      try {
        const db = getDatabase();
        const adminsRef = ref(db, "admins");
        const snapshot = await get(adminsRef);
        if (snapshot.exists()) {
          const adminsData = snapshot.val();
          // adminsData is an object with keys as IDs, values as { email, ... }
          const emails = Object.values(adminsData).map((admin: any) => admin.email);
          console.log("emails",emails);
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
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, adminEmails]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#11011E]"><span className="text-[#0FAE96] text-xl animate-pulse">Loading...</span></div>;
  if (accessDenied) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#11011E]">
      <h1 className="text-3xl font-bold text-red-500 mb-4">Access Denied</h1>
      <p className="text-lg text-[#B6B6B6] mb-8">You do not have access to this page because you are not an admin.</p>
      <button className="px-5 py-2 bg-[#0FAE96] text-white font-semibold rounded-lg shadow hover:bg-[#0fae96cc] transition-all duration-200" onClick={() => router.push("/")}>Go to Home</button>
    </div>
  );
  if (!isAdmin) return null;

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013E] to-[#11011E] p-6 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute -top-16 -left-16 w-72 h-72 bg-[#7000FF] rounded-full blur-3xl opacity-20 z-0"></div>
      <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-[#FF00C7] rounded-full blur-3xl opacity-20 z-0"></div>
      {/* Glassmorphism Card */}
      <section className="relative w-full max-w-3xl bg-[rgba(255,255,255,0.02)] rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.07)] p-10 z-10 backdrop-blur-md animate-fade-in-up">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-[#0FAE96] mb-4 font-raleway drop-shadow-lg">Admin Dashboard</h1>
        <p className="text-[#B6B6B6] text-center mb-8 text-lg">Welcome, Admin! Manage your application and view privileged content here.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
          {/* Card 1 */}
          <div className="bg-[rgba(15,174,150,0.08)] border border-[#0FAE96]/20 rounded-xl p-6 flex flex-col items-center shadow-lg">
            <h2 className="text-xl font-bold text-[#0FAE96] mb-2 text-center">Candidate Details</h2>
            <p className="text-[#ECF1F0] text-center mb-4 text-sm">Coming through JobForm Automator</p>
            <button className="mt-auto px-5 py-2 bg-[#0FAE96] text-white font-semibold rounded-lg shadow hover:bg-[#0fae96cc] transition-all duration-200 text-base w-full" onClick={() => router.push("/Admin/candidateDetails")}>Go</button>
          </div>
          {/* Card 2 */}
          <div className="bg-[rgba(112,0,255,0.08)] border border-[#7000FF]/20 rounded-xl p-6 flex flex-col items-center shadow-lg">
            <h2 className="text-xl font-bold text-[#7000FF] mb-2 text-center">Companies Details</h2>
            <p className="text-[#ECF1F0] text-center mb-4 text-sm">Coming from Send-Auto-Email features</p>
            <button className="mt-auto px-5 py-2 bg-[#7000FF] text-white font-semibold rounded-lg shadow hover:bg-[#7000ffcc] transition-all duration-200 text-base w-full" onClick={() => router.push("/Admin/companyDetails") }>Go</button>
          </div>
          {/* Card 3 */}
          <div className="bg-[rgba(255,0,199,0.08)] border border-[#FF00C7]/20 rounded-xl p-6 flex flex-col items-center shadow-lg">
            <h2 className="text-xl font-bold text-[#FF00C7] mb-2 text-center">Outside Job Applier Details</h2>
            <p className="text-[#ECF1F0] text-center mb-4 text-sm">Come from HR/Resume Shortlisting</p>
            <button className="mt-auto px-5 py-2 bg-[#FF00C7] text-white font-semibold rounded-lg shadow hover:bg-[#ff00c7cc] transition-all duration-200 text-base w-full" onClick={() => router.push("/Admin/outsideCandidateDetails")}>Go</button>
          </div>
          {/* Card 4 - New Recruiter Details */}
          <div className="bg-[rgba(255,165,0,0.08)] border border-[#FFA500]/20 rounded-xl p-6 flex flex-col items-center shadow-lg">
            <h2 className="text-xl font-bold text-[#FFA500] mb-2 text-center">Recruiter Details</h2>
            <p className="text-[#ECF1F0] text-center mb-4 text-sm">Coming from JobForm Automator</p>
            <button className="mt-auto px-5 py-2 bg-[#FFA500] text-white font-semibold rounded-lg shadow hover:bg-[#ffa500cc] transition-all duration-200 text-base w-full" onClick={() => router.push("/Admin/recruiterDetails")}>Go</button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminPage;
