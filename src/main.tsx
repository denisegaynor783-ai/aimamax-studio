import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import "./styles/components.css";
import "./styles/shell.css";
import "./styles/pages.css";
import "@xyflow/react/dist/style.css";
import "./styles/flow.css";
import "./styles/stage.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
