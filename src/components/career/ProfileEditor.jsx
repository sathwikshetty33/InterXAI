import React, { useState, useEffect } from "react";
import {
    User, Loader2, Save, FileText, Upload, Plus, X
} from "lucide-react";
import { toast } from 'react-toastify';
import { getAuthToken } from "../../utils/handleToken";

export default function ProfileEditor({ profile, setProfile, API_URL }) {
    const [isEditing, setIsEditing] = useState(false);
    const [newSkill, setNewSkill] = useState("");
    const [skillLevel, setSkillLevel] = useState("intermediate");
    const [newTargetRole, setNewTargetRole] = useState("");
    const [skills, setSkills] = useState([]);
    const [targetRoles, setTargetRoles] = useState([]);
    const [experienceYears, setExperienceYears] = useState(0);
    const [saving, setSaving] = useState(false);
    const [uploadingResume, setUploadingResume] = useState(false);

    useEffect(() => {
        if (profile) {
            setSkills(Array.isArray(profile.skills) ? profile.skills : []);
            setTargetRoles(Array.isArray(profile.target_roles) ? profile.target_roles : []);
            setExperienceYears(profile.experience_years || 0);
        }
    }, [profile]);

    const handleAddSkill = () => {
        if (!newSkill.trim()) return;
        const skill = { skill: newSkill.trim(), level: skillLevel, verified: false };
        setSkills(prev => [...prev, skill]);
        setNewSkill("");
    };

    const handleRemoveSkill = (index) => {
        setSkills(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddTargetRole = () => {
        if (!newTargetRole.trim()) return;
        if (targetRoles.includes(newTargetRole.trim())) return;
        setTargetRoles(prev => [...prev, newTargetRole.trim()]);
        setNewTargetRole("");
    };

    const handleRemoveTargetRole = (role) => {
        setTargetRoles(prev => prev.filter(r => r !== role));
    };

    const handleSave = async () => {
        const token = getAuthToken();
        setSaving(true);

        try {
            const res = await fetch(`${API_URL}/career/profile/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify({
                    skills,
                    target_roles: targetRoles,
                    experience_years: experienceYears
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setIsEditing(false);
                toast.success("Profile updated successfully!");
            } else {
                toast.error("Failed to update profile");
            }
        } catch {
            toast.error("Error updating profile");
        } finally {
            setSaving(false);
        }
    };

    const handleResumeUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            toast.error("Please upload a PDF file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size should not exceed 5MB");
            return;
        }

        setUploadingResume(true);
        const token = getAuthToken();

        try {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const base64 = reader.result?.split(',')[1];
                    if (!base64) {
                        toast.error("Failed to read file");
                        setUploadingResume(false);
                        return;
                    }

                    const res = await fetch(`${API_URL}/career/profile/scan/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Token ${token}`,
                        },
                        body: JSON.stringify({
                            resume_base64: base64,
                            filename: file.name
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.profile) {
                            setProfile(data.profile);
                            setSkills(Array.isArray(data.profile.skills) ? data.profile.skills : []);
                        }
                        toast.success(data.message || "Resume scanned!");
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        toast.error(errData.error || "Failed to scan resume");
                    }
                } catch (err) {
                    console.error("Upload error:", err);
                    toast.error("Error processing resume");
                }
                setUploadingResume(false);
            };

            reader.onerror = () => {
                toast.error("Error reading file");
                setUploadingResume(false);
            };

            reader.readAsDataURL(file);
        } catch {
            toast.error("Error uploading resume");
            setUploadingResume(false);
        }
    };

    return (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm mb-8">

            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                    <User className="w-5 h-5 text-blue-500" />
                    Skill Profile
                    {isEditing && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            Editing
                        </span>
                    )}
                </h2>

                <div className="flex gap-2">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white transition-colors"
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ================= GRID ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ============ LEFT COLUMN ============ */}
                <div className="space-y-5">

                    {/* Resume Upload */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-dashed border-blue-200">
                        <h3 className="text-sm font-medium text-blue-900 mb-1 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Upload Resume (PDF)
                        </h3>
                        <p className="text-xs text-blue-700 mb-3">
                            AI will extract skills automatically
                        </p>

                        <label className="block">
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleResumeUpload}
                                disabled={uploadingResume}
                                className="hidden"
                            />
                            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition shadow-sm">
                                {uploadingResume ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        <span className="text-blue-500 text-sm">Scanning resume…</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-blue-500" />
                                        <span className="text-blue-600 text-sm font-medium">Choose PDF Resume</span>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Manual Skill Input */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Add Skills Manually</h3>

                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                            <input
                                type="text"
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && isEditing && handleAddSkill()}
                                placeholder={isEditing ? "e.g., Python" : "Enable edit mode"}
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60 text-gray-900"
                                disabled={!isEditing}
                            />
                            <select
                                value={skillLevel}
                                onChange={(e) => setSkillLevel(e.target.value)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900"
                                disabled={!isEditing}
                            >
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                            <button
                                onClick={handleAddSkill}
                                disabled={!isEditing || !newSkill.trim()}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Skills List */}
                        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 p-3 bg-gray-50">
                            {skills.map((skill, index) => {
                                const level = typeof skill === "string" ? "basic" : skill.level;
                                const styles = {
                                    advanced: "bg-green-100 text-green-700 border-green-200",
                                    intermediate: "bg-blue-100 text-blue-700 border-blue-200",
                                    basic: "bg-gray-100 text-gray-700 border-gray-200",
                                };

                                return (
                                    <span
                                        key={index}
                                        className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition hover:scale-[1.02] ${styles[level]}`}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${level === "advanced" ? "bg-green-500" :
                                                level === "intermediate" ? "bg-blue-500" : "bg-gray-500"
                                            }`} />
                                        <span className="font-medium whitespace-nowrap">
                                            {typeof skill === "string" ? skill : skill.name || skill.skill}
                                        </span>
                                        {isEditing && (
                                            <button
                                                onClick={() => handleRemoveSkill(index)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </span>
                                );
                            })}

                            {skills.length === 0 && (
                                <div className="w-full text-center py-6 border border-dashed border-gray-300 rounded-lg">
                                    <p className="text-sm text-gray-500">No skills added yet</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Upload a resume or add skills manually
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ============ RIGHT COLUMN ============ */}
                <div className="space-y-5">

                    {/* Target Roles */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Target Roles <span className="text-gray-400">(for job matching)</span>
                        </h3>

                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newTargetRole}
                                onChange={(e) => setNewTargetRole(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && isEditing && handleAddTargetRole()}
                                placeholder={isEditing ? "e.g., Backend Developer" : "Enable edit mode"}
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm disabled:opacity-60 text-gray-900"
                                disabled={!isEditing}
                            />
                            <button
                                onClick={handleAddTargetRole}
                                disabled={!isEditing || !newTargetRole.trim()}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {targetRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {targetRoles.map((role, index) => (
                                    <span
                                        key={index}
                                        className="group px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-2"
                                    >
                                        {role}
                                        {isEditing && (
                                            <button
                                                onClick={() => handleRemoveTargetRole(role)}
                                                className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-red-500 transition"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <p className="text-sm text-gray-500">No target roles added</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Add roles to get better job matches
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Experience */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Years of Experience
                        </h3>

                        {isEditing ? (
                            <input
                                type="number"
                                min="0"
                                max="50"
                                value={experienceYears}
                                onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
                                className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900"
                            />
                        ) : (
                            <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm w-fit text-gray-900">
                                {experienceYears > 0 ? (
                                    <span>{experienceYears} years</span>
                                ) : (
                                    <span className="text-gray-500 italic">Not specified</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
