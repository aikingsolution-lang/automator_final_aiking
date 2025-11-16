"use client";
import React, { useState, useEffect } from "react";
import { database } from "../../../firebase/config";
import { ref, push, onValue, remove } from "firebase/database";
import { auth } from "../../../firebase/config";
import { useRouter } from "next/navigation";

const ADMIN_EMAILS = ["suman85bera@gmail.com","saurabhbelote112@gmail.com"];

const CreateAdminPage = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const router = useRouter();
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsError, setAdminsError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/sign-in");
        return;
      }
      if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setIsAdmin(true);
      } else {
        setAccessDenied(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch all admins from Firebase
  useEffect(() => {
    const adminsRef = ref(database, "admins");
    setAdminsLoading(true);
    setAdminsError("");
    const unsubscribe = onValue(
      adminsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Convert to array with id
          const adminList = Object.entries(data).map(([id, value]: any) => ({ id, ...value }));
          setAdmins(adminList);
        } else {
          setAdmins([]);
        }
        setAdminsLoading(false);
      },
      (error) => {
        setAdminsError("Failed to load admins");
        setAdminsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013E] to-[#11011E] p-6">
        <span className="text-[#0FAE96] text-xl animate-pulse">Loading...</span>
      </main>
    );

  if (accessDenied)
    return (
      <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013E] to-[#11011E] p-6">
        <div className="w-full max-w-md p-8 bg-[rgba(255,255,255,0.05)] rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.1)] flex flex-col items-center">
          <h1 className="text-2xl font-bold text-[#ff3333] mb-4 text-center">Access Denied</h1>
          <p className="text-lg text-[#B6B6B6] mb-8 text-center">You do not have access to this page because you are not an admin.</p>
          <button
            className="px-6 py-2 bg-[#0FAE96] text-white font-semibold rounded-lg hover:opacity-90 transition duration-300"
            onClick={() => router.push("/")}
          >
            Go to Home
          </button>
        </div>
      </main>
    );

  if (!isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    try {
      await push(ref(database, "admins"), {
        email,
        name,
        createdAt: Date.now(),
      });
      setSuccess(true);
      setEmail("");
      setName("");
    } catch (err: any) {
      setError(err.message || "Error adding admin");
    }
  };

  // Delete admin handler
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setAdminsError("");
    try {
      await remove(ref(database, `admins/${id}`));
    } catch (err: any) {
      setAdminsError(err.message || "Failed to delete admin");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#11011E] via-[#35013E] to-[#11011E] p-6">
      <div className="w-full max-w-md p-8 bg-[rgba(255,255,255,0.05)] rounded-2xl shadow-2xl border border-[rgba(255,255,255,0.1)]">
        <h1 className="text-2xl font-semibold font-raleway text-[#ECF1F0] mb-6 text-center animate-slideDown">Create Admin</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Admin Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border border-gray-600 rounded-lg bg-[#1A1A2E] text-white focus:ring-2 focus:ring-[#0FAE96]"
          />
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border border-gray-600 rounded-lg bg-[#1A1A2E] text-white focus:ring-2 focus:ring-[#0FAE96]"
          />
          <button
            type="submit"
            className="w-full bg-[#0FAE96] text-white p-3 rounded-lg hover:opacity-90 transition duration-300 transform hover:scale-105"
          >
            Add Admin
          </button>
        </form>
        {success && <p className="text-green-500 mt-4 text-center">Admin added successfully!</p>}
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        {/* Admins List */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold text-[#ECF1F0] mb-4 text-center">All Admins</h2>
          {adminsLoading ? (
            <p className="text-[#B6B6B6] text-center">Loading admins...</p>
          ) : adminsError ? (
            <p className="text-red-500 text-center">{adminsError}</p>
          ) : admins.length === 0 ? (
            <p className="text-[#B6B6B6] text-center">No admins found.</p>
          ) : (
            <ul className="space-y-3">
              {admins.map((admin) => {
                const isSuperAdmin = ADMIN_EMAILS.includes(admin.email);
                return (
                  <li key={admin.id} className="flex items-center justify-between bg-[#1A1A2E] rounded-lg px-4 py-3 border border-[rgba(255,255,255,0.08)]">
                    <div>
                      <div className="font-semibold text-[#ECF1F0] flex items-center gap-2">
                        {admin.name || "No Name"}
                        {isSuperAdmin && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[#0FAE96] text-white font-bold">Super Admin</span>
                        )}
                      </div>
                      <div className="text-[#B6B6B6] text-sm">{admin.email}</div>
                    </div>
                    {/* Hide delete for super admins and for current user's own email */}
                    {!isSuperAdmin && admin.email !== auth.currentUser?.email && (
                      <button
                        className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition disabled:opacity-60"
                        onClick={() => handleDelete(admin.id)}
                        disabled={deletingId === admin.id}
                      >
                        {deletingId === admin.id ? "Deleting..." : "Delete"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
};

export default CreateAdminPage;
