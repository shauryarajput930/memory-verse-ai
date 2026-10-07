const getApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (
    envUrl &&
    envUrl.trim() !== "" &&
    !envUrl.includes("127.0.0.1") &&
    !envUrl.includes("localhost")
  ) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      // In production on Netlify, resolve to active Render backend service
      return "https://memoryverse-api.onrender.com";

    }
  }

  return envUrl ? envUrl.replace(/\/$/, "") : "http://127.0.0.1:8000";
};

export const API_URL = getApiUrl();
