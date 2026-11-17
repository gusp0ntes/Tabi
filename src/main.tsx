import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider, NoticeProvider, ThemeProvider } from "./context";
import "./styles.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <NoticeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </NoticeProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
