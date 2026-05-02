"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { Pencil, Camera } from "lucide-react";

interface Props {
  initialFirstName: string;
  initialLastName: string;
  email: string;
}

export default function ProfileEditor({ initialFirstName, initialLastName, email }: Props) {
  const { user } = useUser();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);

  const [isEditing, setIsEditing] = useState(false);
  const [editFirst, setEditFirst] = useState(initialFirstName);
  const [editLast, setEditLast] = useState(initialLastName);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");

  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setPhotoUploading(true);
    try {
      await user.setProfileImage({ file });
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const startEditing = () => {
    setEditFirst(firstName);
    setEditLast(lastName);
    setNameError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setNameError("");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setNameError("");
    try {
      await user.update({ firstName: editFirst, lastName: editLast });
      setFirstName(editFirst);
      setLastName(editLast);
      setIsEditing(false);
    } catch {
      setNameError("Failed to update name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const imageUrl = user?.imageUrl;
  const initial = firstName?.[0]?.toUpperCase() || email[0]?.toUpperCase() || "?";

  return (
    <div className="flex items-center gap-6 mb-8">
      {/* Avatar / photo upload */}
      <div className="relative flex-shrink-0">
        <button
          onClick={handlePhotoClick}
          disabled={photoUploading}
          className="relative w-16 h-16 group block"
          aria-label="Change profile photo"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Profile"
              width={64}
              height={64}
              className="w-16 h-16 object-cover"
              unoptimized
            />
          ) : (
            <div className="w-16 h-16 bg-[#d4a03a] flex items-center justify-center">
              <span className="font-playfair text-2xl font-bold text-[#0a0a0b]">
                {initial}
              </span>
            </div>
          )}

          {!photoUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </div>
          )}

          {photoUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Name + email */}
      <div className="min-w-0">
        {isEditing ? (
          <div>
            <div className="flex gap-2 flex-wrap mb-2">
              <input
                type="text"
                value={editFirst}
                onChange={(e) => setEditFirst(e.target.value)}
                placeholder="First name"
                className="bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 text-sm text-[#f0ede8] px-3 py-2 outline-none w-32"
              />
              <input
                type="text"
                value={editLast}
                onChange={(e) => setEditLast(e.target.value)}
                placeholder="Last name"
                className="bg-[#111114] border border-white/[0.08] focus:border-[#d4a03a]/50 text-sm text-[#f0ede8] px-3 py-2 outline-none w-32"
              />
            </div>
            {nameError && (
              <p className="text-xs text-red-400 mb-2">{nameError}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#d4a03a] text-[#0a0a0b] text-xs font-medium tracking-[0.08em] uppercase px-4 py-1.5 hover:bg-[#f0c060] transition-all disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="text-xs tracking-[0.08em] uppercase text-[#7a7870] hover:text-[#f0ede8] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-0.5">
            <div className="text-lg font-medium text-[#f0ede8]">
              {firstName} {lastName}
            </div>
            <button
              onClick={startEditing}
              className="text-[#7a7870] hover:text-[#f0ede8] transition-colors flex-shrink-0"
              aria-label="Edit name"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="text-sm text-[#7a7870] mt-0.5">{email}</div>
      </div>
    </div>
  );
}
