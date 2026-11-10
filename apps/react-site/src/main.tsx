import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

const SliceSimulatorPage = lazy(() => import("./pages/SliceSimulatorPage"));
const isSliceSimulator = /^\/slice-simulator\/?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {isSliceSimulator ? (
        <Suspense fallback={null}><SliceSimulatorPage /></Suspense>
      ) : <App />}
    </BrowserRouter>
  </React.StrictMode>,
);
