"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { getMe, updateBranding, uploadLogo } from "@/lib/api";
import Link from "next/link";

export default function SettingsPage() {
  const { photographer, setPhotographer } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [tagline, setTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const me = await getMe();
        setPhotographer(me);
        setBusinessName(me.business_name || "");
        setTagline(me.tagline || "");
        setPrimaryColor(me.primary_color || "#000000");
        setAccentColor(me.accent_color || "#6366f1");
        setWebsiteUrl(me.website_url || "");
        setInstagramHandle(me.instagram_handle || "");
      } catch {
        window.location.href = "/";
      }
    }
    init();
  }, [setPhotographer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateBranding({
        business_name: businessName || null,
        tagline: tagline || null,
        primary_color: primaryColor,
        accent_color: accentColor,
        website_url: websiteUrl || null,
        instagram_handle: instagramHandle || null,
      });
      setPhotographer(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await uploadLogo(file);
      setPhotographer(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!photographer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-black">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">Branding & Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Logo */}
        <section className="bg-white rounded-xl p-6 border space-y-4">
          <h2 className="text-lg font-semibold">Logo</h2>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border">
              {photographer.logo_url ? (
                <img
                  src={photographer.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-gray-400 text-sm">No logo</span>
              )}
            </div>
            <div>
              <label className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-800">
                Upload Logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                PNG, JPG, WebP, or SVG. Max 2MB.
              </p>
            </div>
          </div>
        </section>

        {/* Branding form */}
        <form
          onSubmit={handleSave}
          className="bg-white rounded-xl p-6 border space-y-5"
        >
          <h2 className="text-lg font-semibold">Brand Details</h2>

          <div>
            <label className="block text-sm font-medium mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Sharma Studios"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Capturing moments that last"
              maxLength={500}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourstudio.com"
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Instagram Handle
            </label>
            <div className="flex">
              <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg text-gray-500">
                @
              </span>
              <input
                type="text"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="yourstudio"
                className="flex-1 px-3 py-2 border rounded-r-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </form>

        {/* Preview */}
        <section className="bg-white rounded-xl border overflow-hidden">
          <h2 className="text-lg font-semibold px-6 pt-6 pb-3">
            Album Header Preview
          </h2>
          <div
            className="px-6 py-8 text-center text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {photographer.logo_url && (
              <img
                src={photographer.logo_url}
                alt=""
                className="h-10 mx-auto mb-3"
              />
            )}
            <h3 className="text-2xl font-bold">Sample Wedding Album</h3>
            <p className="text-sm opacity-80 mt-1">
              by {businessName || photographer.name}
            </p>
            {tagline && (
              <p className="text-xs opacity-60 mt-1">{tagline}</p>
            )}
          </div>
          <div className="px-6 py-3 flex items-center justify-between border-t">
            <span className="text-sm text-gray-600">120 photos</span>
            <span className="text-sm font-medium" style={{ color: accentColor }}>
              5 selected
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
