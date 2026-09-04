import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router";
import { questionLoadErrors } from "./data/questions";
import History from "./pages/History";
import Home from "./pages/Home";
import FullExam from "./pages/FullExam";
import Practice from "./pages/Practice";
import RandomQuestion from "./pages/RandomQuestion";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Settings from "./pages/Settings";
import { useSettingsStore } from "./stores";

export default function App() {
  const theme = useSettingsStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  if (questionLoadErrors.length > 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold text-incorrect">Question data failed to load</h1>
        <p className="text-sm text-ink-muted">
          PacketPrep can&apos;t start until these files are fixed. Run <code className="font-mono">npm run validate</code> for
          details.
        </p>
        <ul className="w-full list-disc rounded-lg border border-incorrect bg-incorrect/10 p-4 text-left text-sm">
          {questionLoadErrors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exam" element={<FullExam />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/random" element={<RandomQuestion />} />
        <Route path="/review/:attemptId" element={<Review />} />
        <Route path="/results/:attemptId" element={<Results />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
