import { useEffect } from "react";
import { findAccent } from "@certdeck/engine";
import { HashRouter, Navigate, Route, Routes } from "react-router";
import { UpdateWatcher } from "./components/UpdateWatcher";
import { certConfig } from "./cert.config";
import { questionLoadErrors } from "./data/questions";
import History from "./pages/History";
import Home from "./pages/Home";
import FullExam from "./pages/FullExam";
import Practice from "./pages/Practice";
import RandomQuestion from "./pages/RandomQuestion";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";
import { useSettingsStore } from "./stores";

export default function App() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const accentId = useSettingsStore((s) => s.settings.accent);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  /**
   * Set only the light/dark *pair*; index.css already decides which half of
   * it applies for the current theme. Doing it this way keeps one copy of
   * the light/dark rule — in CSS, where `prefers-color-scheme` works without
   * a listener — instead of duplicating that logic here.
   */
  useEffect(() => {
    const root = document.documentElement;
    const accent = findAccent(accentId);
    if (!accent) {
      root.style.removeProperty("--cd-accent-light");
      root.style.removeProperty("--cd-accent-dark");
    } else {
      root.style.setProperty("--cd-accent-light", accent.light);
      root.style.setProperty("--cd-accent-dark", accent.dark);
    }
    // Keep the browser chrome in step with the choice.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", accent?.light ?? certConfig.accentHue);
  }, [accentId]);

  if (questionLoadErrors.length > 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold text-incorrect">Question data failed to load</h1>
        <p className="text-sm text-ink-muted">
          CertDeck can&apos;t start until these files are fixed. Run <code className="font-mono">npm run validate</code> for
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
    <>
      <UpdateWatcher />
      <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/exam" element={<FullExam />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/random" element={<RandomQuestion />} />
        <Route path="/review/:attemptId" element={<Review />} />
        <Route path="/results/:attemptId" element={<Results />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </HashRouter>
    </>
  );
}
