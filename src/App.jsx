import React, { useState } from "react";

export default function App() {
  const [scenario, setScenario] = useState("");
  const [duration, setDuration] = useState("15");
  const [format, setFormat] = useState("9:16");
  const [resolution, setResolution] = useState("720p");
  const [style, setStyle] = useState("Animation 3D cinématographique");
  const [emotion, setEmotion] = useState("Joyeux et émerveillé");
  const [voice, setVoice] = useState(true);
  const [music, setMusic] = useState(true);
  const [sfx, setSfx] = useState(true);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [status, setStatus] = useState("");

  const generateVideo = () => {
    if (!scenario.trim()) {
      setStatus("⚠️ Écris d'abord une idée ou un scénario.");
      return;
    }

    setStatus("🎬 Préparation de la génération...");
    
    setTimeout(() => {
      setStatus("🟢 Demande préparée. Connexion à ComfyUI...");
    }, 1000);
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Milo Studio</h1>
          <p>Création vidéo IA locale</p>
        </div>

        <div className="connection">
          <span className="dot"></span>
          ComfyUI connecté
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h2>Crée ta vidéo</h2>
          <p>
            Décris ta scène et Milo Studio préparera automatiquement ta vidéo.
          </p>
        </section>

        <section className="card">
          <label>Idée / scénario</label>

          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Décris ce qui doit se passer dans ta vidéo..."
            rows="6"
          />

          <div className="grid">
            <div>
              <label>Durée</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="15">15 secondes</option>
                <option value="30">30 secondes</option>
                <option value="60">60 secondes</option>
                <option value="90">90 secondes</option>
                <option value="120">120 secondes</option>
                <option value="180">180 secondes</option>
              </select>
            </div>

            <div>
              <label>Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
              </select>
            </div>

            <div>
              <label>Résolution</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
              </select>
            </div>

            <div>
              <label>Direction visuelle</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option>Animation 3D cinématographique</option>
                <option>Animation 3D familiale</option>
                <option>Cartoon 3D coloré</option>
                <option>Cinématique fantastique</option>
              </select>
            </div>

            <div>
              <label>Émotion</label>
              <select
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
              >
                <option>Joyeux et émerveillé</option>
                <option>Aventureux</option>
                <option>Mystérieux</option>
                <option>Énergique</option>
              </select>
            </div>
          </div>

          <div className="toggles">
            <label className="toggle">
              <input
                type="checkbox"
                checked={voice}
                onChange={(e) => setVoice(e.target.checked)}
              />
              <span>Voix française d'enfant</span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={music}
                onChange={(e) => setMusic(e.target.checked)}
              />
              <span>Musique</span>
            </label>

            <label className="toggle">
              <input
                type="checkbox"
                checked={sfx}
                onChange={(e) => setSfx(e.target.checked)}
              />
              <span>Bruitages</span>
            </label>
          </div>

          <label>Prompt négatif</label>

          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Éléments à éviter dans la vidéo..."
            rows="4"
          />

          <button onClick={generateVideo}>
            🎬 Générer la vidéo
          </button>

          {status && (
            <div className="status">
              {status}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
