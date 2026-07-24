import {
  GitBranch, Terminal, Cpu, Shield, Lock, Globe, Zap
} from "lucide-react";

// Re-export from contexts for backward compatibility
export { THEMES } from "./contexts/ThemeContext";

export const BACKEND = "https://secureflow-backend-1083585992526.us-central1.run.app";

export const PIPELINE_STAGES = [
  { key: "checkout",  label: "Checkout",     Icon: GitBranch },
  { key: "code_scan", label: "Code Scan",    Icon: Terminal  },
  { key: "docker",    label: "Docker Build", Icon: Cpu       },
  { key: "trivy",     label: "Trivy Scan",   Icon: Shield    },
  { key: "policy",    label: "Policy Gate",  Icon: Lock      },
  { key: "deploy",    label: "Deploy",       Icon: Globe     },
  { key: "zap",       label: "ZAP DAST",     Icon: Zap       },
];
