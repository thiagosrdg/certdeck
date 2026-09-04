import "@certdeck/engine/fonts.css";
import "@certdeck/engine/tokens.css";
import "./style.css";
import { simulators, type SimulatorEntry } from "./simulators";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Root element not found");

app.innerHTML = `
  <div class="page">
    <header class="hero">
      <h1>CertDeck</h1>
      <p>Offline-first exam simulators for IT certifications, built around a card-game metaphor — each certification is a deck, each question is a card.</p>
    </header>
    <div class="deck-grid">
      ${simulators.map(renderCard).join("")}
    </div>
    <footer>
      <p>Unofficial. Not affiliated with, endorsed by, or sponsored by CompTIA or any certification body.</p>
      <p><a href="https://github.com/thiagosrdg/certdeck" target="_blank" rel="noopener">Source on GitHub</a></p>
    </footer>
  </div>
`;

function renderCard(sim: SimulatorEntry): string {
  const isAvailable = sim.status === "available";
  const statusLabel = sim.status === "available" ? "Open" : sim.status === "in-development" ? "In development" : "Planned";
  const tag = isAvailable ? "a" : "div";
  const hrefAttr = isAvailable ? `href="${sim.href}"` : "";
  return `
    <${tag} class="card${isAvailable ? "" : " card--disabled"}" style="--accent:${sim.accent}" ${hrefAttr}>
      <span class="card__status">${statusLabel}</span>
      <h2>${sim.name}</h2>
      <p>${sim.certName} · ${sim.examCode}</p>
    </${tag}>
  `;
}
