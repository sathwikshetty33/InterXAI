"use client";

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/ui/header";
import Footer from "../components/ui/footer";
import { getAuthToken } from "../utils/handleToken";
import { Loader2, Pencil, Upload, Users, FileSpreadsheet, CheckCircle, XCircle, UserCircle, Trash2, ExternalLink } from "lucide-react";
import { toast} from 'react-toastify';



export default function OrgDashboard() {
  const [orgData, setOrgData] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [viewerType, setViewerType] = useState("guest");
  const [interviews, setInterviews] = useState([]);
  
  // Bulk import state
  const [importFile, setImportFile] = useState(null);
  const [importRole, setImportRole] = useState('student');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Members state
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const token = getAuthToken();
    fetch(`${API_URL}/organization/org/${id}/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch organization data");
        return res.json();
      })
      .then((data) => {
        setOrgData(data);
        setFormData(data);
        setTimeout(() => setVisible(true), 200);
      })
      .catch(() => toast.error("Could not load organization details."))
      .finally(() => setLoading(false));

    if (token) {
      fetch(`${API_URL}/organization/check-org/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data) => {
          if (data.is_organization) {
            setViewerType("owner");
            // Fetch members
            fetchMembers(token);
            fetch(`${API_URL}/interview/get-interviews/`, {
              headers: { Authorization: `Token ${token}` },
            })
              .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch interviews");
                return res.json();
              })
              .then((data) => {
                // Add `hasApplications` flag for each interview
                const fetchApplications = async () => {
                  const updated = await Promise.all(
                    data.map(async (interview) => {
                      try {
                        const res = await fetch(
                          `${API_URL}/interview/get-applications/${interview.id}/`,
                          { headers: { Authorization: `Token ${token}` } }
                        );
                        if (res.ok) {
                          const apps = await res.json();
                          return { ...interview, hasApplications: apps.length > 0 };
                        }
                      } catch (err) {
                        console.error("Error checking applications", err);
                      }
                      return { ...interview, hasApplications: false };
                    })
                  );
                  setInterviews(updated);
                };
                fetchApplications();
              })
              .catch(() => toast.error("Could not load interviews."));
          } else {
            setViewerType("guest");
          }
        })
        .catch(() => setViewerType("guest"));
    }
  }, [id]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Fetch org members
  const fetchMembers = async (token) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`${API_URL}/organization/members/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMembers(data.members || []);
      }
    } catch {
      console.error("Failed to fetch members");
    } finally {
      setLoadingMembers(false);
    }
  };

  // Remove member from org
  const handleRemoveMember = async (memberId, username) => {
    if (!window.confirm(`Are you sure you want to remove ${username} from the organization?`)) {
      return;
    }
    
    const token = getAuthToken();
    setRemovingMember(memberId);
    
    try {
      const res = await fetch(`${API_URL}/organization/members/${id}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ member_id: memberId }),
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch {
      toast.error("Server error while removing member");
    } finally {
      setRemovingMember(null);
    }
  };

  const handleSave = async (field) => {
    const token = getAuthToken();
    if (viewerType !== "owner") return;

    try {
      const res = await fetch(`${API_URL}/organization/update/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ [field]: formData[field] }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrgData((prev) => ({ ...prev, [field]: formData[field] }));
        setEditingField(null);
      } else {
        toast.error("Update failed: " + JSON.stringify(data));
      }
    } catch {
      toast.error("Server error while updating.");
    }
  };

  // Bulk import handler
  const handleBulkImport = async () => {
    if (!importFile) {
      toast.error("Please select a file to upload");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      toast.error("Please login to import students");
      return;
    }

    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', importFile);
    formData.append('role', importRole);

    try {
      const res = await fetch(`${API_URL}/organization/bulk-import/`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok) {
        setImportResult(data);
        if (data.created_count > 0) {
          toast.success(`Successfully imported ${data.created_count} students!`);
        }
        setImportFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(data.error || "Import failed");
        setImportResult({ success: false, error: data.error });
      }
    } catch (err) {
      toast.error("Server error during import");
      setImportResult({ success: false, error: "Server error" });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header viewerType={viewerType} />
        <div className="min-h-screen flex items-center justify-center text-gray-900">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Loading organization data...
        </div>
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header viewerType={viewerType} />
        <div className="min-h-screen flex items-center justify-center text-red-500">
          Organization not found.
        </div>
      </div>
    );
  }

  const { email, orgname, address, photo, Description } = orgData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use your existing header */}
      <Header viewerType={viewerType} />

      {/* Updated main content with lighter theme to match the UI */}
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className={`max-w-5xl w-full transform transition-all duration-1000 ${visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-200/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-shimmer"></div>

            <div className="flex flex-col items-center space-y-6">
              {viewerType === "owner" && editingField === "photo" ? (
                <div className="flex flex-col items-center">
                  <input type="text" name="photo" value={formData.photo} onChange={handleChange} className="bg-gray-100 text-gray-900 p-2 rounded mb-2 border border-gray-300" />
                  <button onClick={() => handleSave("photo")} className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition">Save</button>
                </div>
              ) : (
                <img src={photo} alt="Organization Logo" className={`w-28 h-28 rounded-full border-2 border-purple-500 shadow-lg ${viewerType === "owner" ? "cursor-pointer" : ""}`} onClick={() => viewerType === "owner" && setEditingField("photo")} />
              )}

              <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
                {viewerType === "owner" && editingField === "orgname" ? (
                  <>
                    <input type="text" name="orgname" value={formData.orgname} onChange={handleChange} className="bg-gray-100 text-gray-900 p-2 rounded border border-gray-300" />
                    <button onClick={() => handleSave("orgname")} className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition">Save</button>
                  </>
                ) : (
                  <>
                    {orgname}
                    {viewerType === "owner" && <Pencil className="w-4 h-4 cursor-pointer text-gray-600 hover:text-purple-600" onClick={() => setEditingField("orgname")} />}
                  </>
                )}
              </h1>

              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-purple-600 font-semibold">Email:</span> {email}
                </p>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-purple-600 font-semibold">Address:</span>
                  {viewerType === "owner" && editingField === "address" ? (
                    <>
                      <input type="text" name="address" value={formData.address} onChange={handleChange} className="bg-gray-100 text-gray-900 p-1 rounded ml-2 border border-gray-300" />
                      <button onClick={() => handleSave("address")} className="text-xs bg-purple-600 text-white px-2 py-1 rounded ml-2 hover:bg-purple-700 transition">Save</button>
                    </>
                  ) : (
                    <>
                      <span>{address}</span>
                      {viewerType === "owner" && <Pencil className="w-4 h-4 cursor-pointer text-gray-600 hover:text-purple-600" onClick={() => setEditingField("address")} />}
                    </>
                  )}
                </p>

                <p className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-purple-600 font-semibold">Description:</span>
                  {viewerType === "owner" && editingField === "Description" ? (
                    <div className="flex flex-col w-full">
                      <textarea name="Description" value={formData.Description} onChange={handleChange} rows={3} className="bg-gray-100 text-gray-900 p-2 rounded w-full mt-1 border border-gray-300" />
                      <button onClick={() => handleSave("Description")} className="text-sm bg-purple-600 text-white px-3 py-1 rounded mt-2 self-end hover:bg-purple-700 transition">Save</button>
                    </div>
                  ) : (
                    <span className="flex-1">
                      {Description || "No description provided."}
                      {viewerType === "owner" && <Pencil className="w-4 h-4 cursor-pointer ml-2 text-gray-600 hover:text-purple-600" onClick={() => setEditingField("Description")} />}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Bulk Import Section - Only for owners */}
          {viewerType === "owner" && (
            <div className="mt-12 bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-200/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Bulk Import Students</h2>
                  <p className="text-sm text-gray-500">Upload an Excel/CSV file with username, email, and password columns</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* File Upload */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File (.xlsx, .xls, .csv)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => setImportFile(e.target.files[0])}
                        className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 border border-gray-300 rounded-lg"
                      />
                    </div>
                    {importFile && (
                      <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        {importFile.name}
                      </p>
                    )}
                  </div>

                  <div className="sm:w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select
                      value={importRole}
                      onChange={(e) => setImportRole(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                    </select>
                  </div>
                </div>

                {/* Import Button */}
                <button
                  onClick={handleBulkImport}
                  disabled={!importFile || importing}
                  className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Import Students
                    </>
                  )}
                </button>

                {/* Import Result */}
                {importResult && (
                  <div className={`mt-4 p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {importResult.success ? (
                      <div>
                        <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                          <CheckCircle className="w-5 h-5" />
                          Import Completed
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p>Total rows: {importResult.total_rows}</p>
                          <p className="text-green-600">Successfully created: {importResult.created_count}</p>
                          {importResult.skipped_count > 0 && (
                            <p className="text-yellow-600">Skipped: {importResult.skipped_count}</p>
                          )}
                        </div>
                        {importResult.errors && importResult.errors.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700">Errors:</p>
                            <ul className="text-xs text-red-600 mt-1 max-h-32 overflow-y-auto">
                              {importResult.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircle className="w-5 h-5" />
                        {importResult.error}
                      </div>
                    )}
                  </div>
                )}

                {/* Template Info */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Excel/CSV Template Format:</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="border border-gray-300 px-3 py-1">username</th>
                          <th className="border border-gray-300 px-3 py-1">email</th>
                          <th className="border border-gray-300 px-3 py-1">password</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-1">john_doe</td>
                          <td className="border border-gray-300 px-3 py-1">john@example.com</td>
                          <td className="border border-gray-300 px-3 py-1">password123</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-1">jane_smith</td>
                          <td className="border border-gray-300 px-3 py-1">jane@example.com</td>
                          <td className="border border-gray-300 px-3 py-1">securepass</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Members Section - Only for owners */}
          {viewerType === "owner" && (
            <div className="mt-12 bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-gray-200/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <UserCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Organization Members</h2>
                    <p className="text-sm text-gray-500">{members.length} members in your organization</p>
                  </div>
                </div>
              </div>

              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-gray-600">Loading members...</span>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No members yet. Import students using the form above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 text-left">
                        <th className="px-4 py-3 font-medium text-gray-700 rounded-tl-lg">Username</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Email</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Role</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Joined</th>
                        <th className="px-4 py-3 font-medium text-gray-700 text-right rounded-tr-lg">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-semibold text-xs">
                                  {member.username?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-gray-900">{member.username}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{member.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              member.role === 'faculty' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {member.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-sm">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {member.profile_id && (
                                <button
                                  onClick={() => navigate(`/profile/${member.profile_id}`)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View Profile"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Profile
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.id, member.username)}
                                disabled={removingMember === member.id}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Remove from organization"
                              >
                                {removingMember === member.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {viewerType === "owner" && interviews.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-semibold mb-4 text-purple-600">Your Interviews</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {interviews.map((interview) => (
                  <div key={interview.id} className="bg-white/80 p-6 rounded-xl border border-gray-200/50 shadow-md space-y-3">
                    <p className="text-gray-700"><span className="text-purple-600 font-medium">Post:</span> {interview.post}</p>
                    <p className="text-gray-700"><span className="text-purple-600 font-medium">Description:</span> {interview.desc}</p>
                    <p className="text-gray-700"><span className="text-purple-600 font-medium">Experience:</span> {interview.experience} years</p>
                    <p className="text-gray-700"><span className="text-purple-600 font-medium">Deadline:</span> {interview.submissionDeadline}</p>
                    <button onClick={() => navigate(`/interview/${interview.id}?orgId=${id}`)} className="mt-2 bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 transition">
                      Edit Interview
                    </button>
                    {interview.hasApplications && (
                      <button onClick={() => navigate(`/applications/${interview.id}`)} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition ml-2">
                        View Applications
                      </button>
                    )}
                    <button onClick={() => navigate(`/leaderboard/${interview.id}`)} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition ml-2">
                        View Leaderboard
                      </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}