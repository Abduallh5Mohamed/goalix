export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    return "";
  }

  return "http://localhost:3000";
}
