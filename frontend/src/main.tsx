import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./auth";
import App from "./App";

async function bootstrap() {
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();
  window.msalInstanceForApp = msalInstance;

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>,
  );
}

bootstrap();
