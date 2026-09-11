import {
  PublicClientApplication,
  type Configuration,
} from "@azure/msal-browser";

const demoMode = import.meta.env.VITE_ENABLE_DEMO_MODE !== "false";

const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID || "common";
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || "missing-client-id";

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const loginRequest = {
  scopes: import.meta.env.VITE_ENTRA_API_SCOPE
    ? [import.meta.env.VITE_ENTRA_API_SCOPE]
    : ["User.Read"],
};

export const isDemoMode = demoMode;
export const msalInstance = new PublicClientApplication(msalConfig);
