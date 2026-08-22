import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DoctorAuthProvider } from "./context/DoctorAuthContext";
import "@sanjeevani/ui/src/tokens.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DoctorAuthProvider>
      <App />
    </DoctorAuthProvider>
  </React.StrictMode>
);
