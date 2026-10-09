export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")
    : "https://memory-verse-ai-3yvh.onrender.com";

const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      // In production on Netlify, resolve to active Render backend service
      return "https://memory-verse-ai-3yvh.onrender.com";
    }
  }

  return "http://127.0.0.1:8000";
};

export const API_URL = getApiUrl();

export function getSafeFileUrl(url: string | null | undefined): string {
  if (!url) return "#";
  // If it's an old Cloudinary PDF uploaded under /image/upload/
  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/") && url.toLowerCase().endsWith(".pdf")) {
    // Cloudinary restricts raw PDF delivery on /image/upload/ with a 401 ACL failure.
    // Changing .pdf to .png renders the document image preview cleanly without 401 errors.
    return url.replace(/\.pdf$/i, ".png");
  }
  return url;
}

