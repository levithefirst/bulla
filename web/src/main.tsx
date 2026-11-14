import React from "react";
import ReactDOM from "react-dom/client";
import { WalletProvider } from "./lib/wallet";
import { ToastProvider } from "./components/Toasts";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </WalletProvider>
  </React.StrictMode>,
);
