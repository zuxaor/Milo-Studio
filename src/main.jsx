import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Clapperboard, FolderOpen, Users, Settings, Cpu, Sparkles, Plus,
  Trash2, Copy, Play, AlertCircle, Film, Mic2, Music2, Volume2,
  WandSparkles, RefreshCw, CheckCircle2, XCircle
} from "lucide-react";
import "./styles.css";

/*
  MILO STUDIO
  ComfyUI client.

  ComfyUI is expected at:
  http://127.0.0.1:8188

  IMPORTANT:
  This file does not invent a workflow. The workflow must be supplied
  later from an exported ComfyUI API workflow JSON.
*/

const COMFYUI_BASE_URL = "http://127.0.0.1:8188";

const MILO = {
  name: "Milo",
  personality:
    "Joyeux, gentil, curieux, courageux, enthousiaste et légèrement maladroit.",
  visual:
    "Jeune petit ourson anthropomorphe adorable, fourrure marron chaud douce et légèrement touffue, ventre et museau légèrement plus clairs, grandes oreilles rondes, petite touffe de poils sur le sommet de la tête, grands yeux ronds bleu vif très expressifs, nez marron foncé, visage rond sympathique, grand sourire, langue rose lorsqu’il parle. Sweat à capuche bleu vif et sac à dos d’aventurier vert avec bretelles marron. Animation 3D cinématographique familiale, chaleureuse et colorée.",
  voice:
    "Jeune garçon français, enfantin, chaleureux, naturel, joyeux et expressif."
};

const DEFAULT_PROJECT = () => ({
  id: crypto.randomUUID(),
  name: "Nouvelle aventure de Milo",
  idea: "",
  duration: 15,
  format: "9:16",
  resolution: "720p",
  style: "Animation 3D cinématographique",
  emotion: "Joyeux et émerveillé",
  music: true,
  sfx: true,
  negativePrompt:
    "déformation, visage différent, vêtements différents, couleurs différentes, membres supplémentaires, personnage dupliqué, scintillement, artefacts, mouvement incohérent, mauvaise synchronisation labiale",
  status: "Brouillon",
  scenes: [],
  resultUrl: null,
  comfyPromptId: null
});

function load(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function comfyFetch(path, options = {}) {
  const response = await fetch(`${COMFYUI_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `ComfyUI ${response.status}${text ? ` : ${text.slice(0, 300)}` : ""}`
    );
  }

  return response;
}

async function checkComfyUI() {
  const [systemResponse, objectResponse] = await Promise.all([
    comfyFetch("/system_stats"),
    comfyFetch("/object_info")
  ]);

  const system = await systemResponse.json();
  const objects = await objectResponse.json();

  return {
    connected: true,
    system,
    nodeCount: Object.keys(objects || {}).length
  };
}

async function getComfyHistory(promptId) {
  const response = await comfyFetch(`/history/${encodeURIComponent(promptId)}`);
  return response.json();
}

function extractMediaUrl(history, promptId) {
  const item = history?.[promptId] || history;
  const outputs = item?.outputs || {};

  for (const output of Object.values(outputs)) {
    for (const key of ["gifs", "videos", "images"]) {
      const files = output?.[key];
      if (!Array.isArray(files)) continue;

      const file = files.find(Boolean);
      if (file?.filename) {
        const params = new URLSearchParams({
          filename: file.filename,
          subfolder: file.subfolder || "",
          type: file.type || "output"
        });

        return `${COMFYUI_BASE_URL}/view?${params.toString()}`;
      }
    }
  }

  return null;
}

function makeClientWorkflow(idea, settings) {
  /*
    Placeholder intentionally rejected by the generation path.

    A real ComfyUI API workflow must be exported from the user's
    ComfyUI installation and inserted here. We do not guess node IDs,
    model names or input fields.
  */
  return {
    _miloStudio: true,
    _requiresRealWorkflow: true,
    idea,
    settings
  };
}

async function submitWorkflow(workflow) {
  if (!workflow || workflow._requiresRealWorkflow) {
    throw new Error(
      "Workflow ComfyUI non configuré. Exporte ton workflow avec « Workflow → Export (API) » puis ajoute-le à Milo Studio."
    );
  }

  const response = await comfyFetch("/prompt", {
    method: "POST",
    body: JSON.stringify({
      prompt: workflow
    })
  });

  return response.json();
}

function connectWebSocket(onProgress, onComplete, onError) {
  const clientId = crypto.randomUUID();
  const wsUrl =
    `${COMFYUI_BASE_URL.replace(/^http/, "ws")}/ws?clientId=${clientId}`;

  let socket;
  try {
    socket = new WebSocket(wsUrl);
  } catch (error) {
    onError(error);
    return () => {};
  }

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "progress") {
        const value = data.data || {};
        const max = Number(value.max || 0);
        const current = Number(value.value || 0);
        const percent = max > 0 ? Math.round((current / max) * 100) : 0;
        onProgress(percent);
      }

      if (data.type === "executing" && data.data?.node === null) {
        onProgress(100);
        onComplete();
      }
    } catch {
      // Ignore non-JSON websocket messages.
    }
  };

  socket.onerror = () => {
    onError(new Error("Connexion WebSocket ComfyUI impossible."));
  };

  return () => socket.close();
}

function App() {
  const [page, setPage] = useState("create");
  const [projects, setProjects] = useState(() =>
    load("milo_projects", [DEFAULT_PROJECT()])
  );
  const [active, setActive] = useState(() =>
    load("milo_active", DEFAULT_PROJECT())
  );

  const [engineStatus, setEngineStatus] = useState("Non testé");
  const [engineDetails, setEngineDetails] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");

  useEffect(() => save("milo_projects", projects), [projects]);
  useEffect(() => save("milo_active", active), [active]);

  const updateActive = (patch) => {
    const next = { ...active, ...patch };
    setActive(next);
    setProjects((current) =>
      current.map((project) => (project.id === next.id ? next : project))
    );
  };

  const createProject = () => {
    const project = DEFAULT_PROJECT();
    setProjects((current) => [...current, project]);
    setActive(project);
    setPage("create");
  };

  const generatePlan = () => {
    if (!active.idea.trim()) return;

    const scenes = [
      {
        id: crypto.randomUUID(),
        number: 1,
        title: "Introduction",
        description: `Milo commence son aventure : ${active.idea}`,
        dialogue: "",
        status: "Prête"
      },
      {
        id: crypto.randomUUID(),
        number: 2,
        title: "Découverte",
        description:
          "Milo découvre un élément mystérieux et réagit avec curiosité.",
        dialogue: "",
        status: "Prête"
      },
      {
        id: crypto.randomUUID(),
        number: 3,
        title: "Cliffhanger",
        description:
          "Milo se tourne vers la caméra et comprend que l’aventure ne fait que commencer.",
        dialogue: "",
        status: "Prête"
      }
    ];

    updateActive({ scenes, status: "En préparation" });
  };

  const testComfy = async () => {
    setEngineStatus("Test en cours...");
    setEngineDetails(null);

    try {
      const result = await checkComfyUI();
      setEngineStatus("Connecté");
      setEngineDetails(result);
    } catch (error) {
      setEngineStatus("Erreur");
      setEngineDetails({
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  const startGeneration = async () => {
    setGenerationMessage("");

    try {
      await checkComfyUI();
      setEngineStatus("Connecté");
    } catch (error) {
      setEngineStatus("Erreur");
      setGenerationMessage(
        `ComfyUI est inaccessible à ${COMFYUI_BASE_URL}. ${error.message}`
      );
      setPage("engines");
      return;
    }

    if (!active.idea.trim()) {
      setGenerationMessage("Écris d’abord l’idée de la vidéo.");
      return;
    }

    setGenerating(true);
    setProgress(0);
    updateActive({ status: "En génération", resultUrl: null });

    const settings = {
      character: MILO,
      duration: active.duration,
      format: active.format,
      resolution: active.resolution,
      style: active.style,
      emotion: active.emotion,
      negativePrompt: active.negativePrompt,
      music: active.music,
      sfx: active.sfx
    };

    const workflow = makeClientWorkflow(active.idea, settings);

    try {
      const result = await submitWorkflow(workflow);

      if (!result?.prompt_id) {
        throw new Error(
          "ComfyUI n'a pas renvoyé de prompt_id. Vérifie le workflow API."
        );
      }

      updateActive({
        comfyPromptId: result.prompt_id,
        status: "En génération"
      });

      setGenerationMessage(`Génération ComfyUI : ${result.prompt_id}`);

      let finished = false;
      let stopSocket = () => {};

      stopSocket = connectWebSocket(
        (value) => setProgress(value),
        () => {
          finished = true;
        },
        () => {
          // History polling below remains the source of truth.
        }
      );

      for (let attempt = 0; attempt < 180; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const history = await getComfyHistory(result.prompt_id);
        const mediaUrl = extractMediaUrl(history, result.prompt_id);

        if (mediaUrl) {
          stopSocket();
          setProgress(100);
          updateActive({
            status: "Terminé",
            resultUrl: mediaUrl
          });
          setGenerationMessage("Vidéo terminée.");
          setGenerating(false);
          return;
        }

        if (finished) {
          // ComfyUI can finish execution before its output is immediately
          // visible in history, so continue polling.
        }

        setProgress((value) => Math.min(95, value + 1));
      }

      stopSocket();
      throw new Error(
        "Délai dépassé en attendant le résultat ComfyUI. Vérifie l'historique de ComfyUI."
      );
    } catch (error) {
      updateActive({
        status: "Erreur",
        resultUrl: null
      });
      setGenerationMessage(
        error instanceof Error ? error.message : String(error)
      );
      setGenerating(false);
    }
  };

  const duplicateProject = (project) => {
    const copy = {
      ...project,
      id: crypto.randomUUID(),
      name: `${project.name} (copie)`,
      status: "Brouillon",
      resultUrl: null,
      comfyPromptId: null
    };

    setProjects((current) => [...current, copy]);
    setActive(copy);
    setPage("create");
  };

  const deleteProject = (id) => {
    const remaining = projects.filter((project) => project.id !== id);
    setProjects(remaining);

    if (active.id === id) {
      setActive(remaining[0] || DEFAULT_PROJECT());
    }
  };

  const nav = [
    ["create", "Crée ta vidéo", Clapperboard],
    ["library", "Bibliothèque", FolderOpen],
    ["characters", "Personnages", Users],
    ["projects", "Projets", Film],
    ["engines", "État des moteurs", Cpu],
    ["settings", "Paramètres", Settings]
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">🐻</div>
          <div>
            <strong>MILO STUDIO</strong>
            <span>Création vidéo IA</span>
          </div>
        </div>

        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? "nav active" : "nav"}
              onClick={() => setPage(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="engine-mini">
          <span
            className={
              engineStatus === "Connecté" ? "dot on" : "dot"
            }
          />
          <div>
            <small>ComfyUI</small>
            <b>{engineStatus}</b>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{nav.find((item) => item[0] === page)?.[1]}</h1>
            <p>Crée des vidéos complètes autour de Milo.</p>
          </div>

          <button className="pill" onClick={() => setPage("engines")}>
            <Cpu size={16} />
            {engineStatus}
          </button>
        </header>

        {page === "create" && (
          <Create
            active={active}
            update={updateActive}
            generatePlan={generatePlan}
            startGeneration={startGeneration}
            generating={generating}
            progress={progress}
            message={generationMessage}
            setPage={setPage}
          />
        )}

        {page === "library" && (
          <Library
            projects={projects}
            setActive={setActive}
            setPage={setPage}
          />
        )}

        {page === "characters" && <Characters />}

        {page === "projects" && (
          <Projects
            projects={projects}
            setActive={setActive}
            setPage={setPage}
            duplicate={duplicateProject}
            remove={deleteProject}
            createProject={createProject}
          />
        )}

        {page === "engines" && (
          <Engines
            status={engineStatus}
            details={engineDetails}
            test={testComfy}
          />
        )}

        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

function Create({
  active,
  update,
  generatePlan,
  startGeneration,
  generating,
  progress,
  message,
  setPage
}) {
  return (
    <section className="content">
      <div className="hero-card">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} />
            Studio automatique
          </span>
          <h2>Décris ta vidéo</h2>
          <p>
            Une idée devient un projet vidéo structuré. La génération réelle
            passe par ton ComfyUI local.
          </p>
        </div>
        <div className="milo-chip">🐻 Milo</div>
      </div>

      <div className="grid2">
        <div className="card">
          <label>Idée / scénario</label>
          <textarea
            value={active.idea}
            onChange={(event) => update({ idea: event.target.value })}
            placeholder="Exemple : Milo découvre une mystérieuse forêt magique et trouve un cristal lumineux..."
          />

          <div className="row">
            <div className="field">
              <label>Durée</label>
              <select
                value={active.duration}
                onChange={(event) =>
                  update({ duration: Number(event.target.value) })
                }
              >
                {[15, 30, 60, 90, 120, 180].map((value) => (
                  <option key={value} value={value}>
                    {value} secondes
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Format</label>
              <select
                value={active.format}
                onChange={(event) => update({ format: event.target.value })}
              >
                <option>9:16</option>
                <option>16:9</option>
                <option>1:1</option>
              </select>
            </div>

            <div className="field">
              <label>Résolution</label>
              <select
                value={active.resolution}
                onChange={(event) =>
                  update({ resolution: event.target.value })
                }
              >
                <option>720p</option>
                <option>1080p</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <label>Direction visuelle</label>
          <select
            value={active.style}
            onChange={(event) => update({ style: event.target.value })}
          >
            <option>Animation 3D cinématographique</option>
            <option>Animation 3D familiale</option>
            <option>Cartoon 3D coloré</option>
            <option>Cinématique fantastique</option>
          </select>

          <label>Émotion</label>
          <select
            value={active.emotion}
            onChange={(event) => update({ emotion: event.target.value })}
          >
            <option>Joyeux et émerveillé</option>
            <option>Aventureux</option>
            <option>Mystérieux</option>
            <option>Énergique</option>
          </select>

          <div className="toggles">
            <Toggle icon={<Mic2 />} text="Voix française d'enfant" on />
            <Toggle
              icon={<Music2 />}
              text="Musique"
              on={active.music}
              setOn={(value) => update({ music: value })}
            />
            <Toggle
              icon={<Volume2 />}
              text="Bruitages"
              on={active.sfx}
              setOn={(value) => update({ sfx: value })}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <label>Prompt négatif</label>
        <textarea
          value={active.negativePrompt}
          onChange={(event) =>
            update({ negativePrompt: event.target.value })
          }
          className="compact-textarea"
        />
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h3>Personnage</h3>
            <p>Milo est verrouillé comme référence officielle.</p>
          </div>
          <span className="status ok">Référence active</span>
        </div>

        <div className="character">
          <div className="avatar">🐻</div>
          <div>
            <b>Milo</b>
            <p>{MILO.voice}</p>
          </div>
        </div>

        <details>
          <summary>Voir la description utilisée pour les moteurs</summary>
          <p className="muted">{MILO.visual}</p>
        </details>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h3>Scènes</h3>
            <p>Prépare automatiquement le découpage de l'aventure.</p>
          </div>

          <button className="secondary" onClick={generatePlan}>
            <WandSparkles size={16} />
            Préparer les scènes
          </button>
        </div>

        {active.scenes.length === 0 ? (
          <div className="empty">Aucune scène préparée.</div>
        ) : (
          <div className="scenes">
            {active.scenes.map((scene) => (
              <div className="scene" key={scene.id}>
                <span>{scene.number}</span>
                <div>
                  <b>{scene.title}</b>
                  <p>{scene.description}</p>
                </div>
                <span className="status ok">{scene.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {generating && (
        <div className="card generation-card">
          <div className="section-head">
            <div>
              <h3>Génération ComfyUI</h3>
              <p>{message || "ComfyUI travaille sur le workflow..."}</p>
            </div>
            <span>{progress}%</span>
          </div>
          <div className="progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {message && !generating && (
        <div className="notice">
          <AlertCircle size={17} />
          {message}
        </div>
      )}

      {active.resultUrl && (
        <div className="card">
          <div className="section-head">
            <div>
              <h3>Résultat</h3>
              <p>Résultat récupéré depuis ComfyUI.</p>
            </div>
            <a
              className="secondary"
              href={active.resultUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Play size={16} />
              Ouvrir
            </a>
          </div>
          <video
            src={active.resultUrl}
            controls
            playsInline
            className="result-video"
          />
        </div>
      )}

      <div className="actions">
        <button className="secondary" onClick={() => setPage("engines")}>
          Vérifier ComfyUI
        </button>

        <button
          className="primary"
          onClick={startGeneration}
          disabled={generating}
        >
          <Sparkles size={18} />
          {generating ? "Génération..." : "Générer la vidéo"}
        </button>
      </div>
    </section>
  );
}

function Toggle({ icon, text, on, setOn = () => {} }) {
  return (
    <button className="toggle" onClick={() => setOn(!on)}>
      <span>{icon}</span>
      <b>{text}</b>
      <i className={on ? "switch on" : "switch"}>
        <em />
      </i>
    </button>
  );
}

function Library({ projects }) {
  const done = projects.filter(
    (project) => project.status === "Terminé" && project.resultUrl
  );

  return (
    <section className="content">
      <div className="card">
        <div className="section-head">
          <div>
            <h3>Bibliothèque</h3>
            <p>Résultats réellement produits par ComfyUI.</p>
          </div>
        </div>

        {done.length === 0 ? (
          <div className="empty">
            <FolderOpen size={32} />
            <b>Aucune vidéo générée</b>
            <span>Les vrais résultats apparaîtront ici.</span>
          </div>
        ) : (
          done.map((project) => (
            <div className="library-item" key={project.id}>
              <video
                src={project.resultUrl}
                className="thumb-video"
                muted
                playsInline
              />
              <div>
                <b>{project.name}</b>
                <p>
                  {project.format} · {project.duration}s ·{" "}
                  {project.resolution}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Characters() {
  return (
    <section className="content">
      <div className="card character-large">
        <div className="avatar big">🐻</div>
        <div>
          <span className="eyebrow">Personnage par défaut</span>
          <h2>Milo</h2>
          <p>{MILO.personality}</p>
          <p className="muted">{MILO.visual}</p>
          <span className="status ok">Référence verrouillée</span>
        </div>
      </div>
    </section>
  );
}

function Projects({
  projects,
  setActive,
  setPage,
  duplicate,
  remove,
  createProject
}) {
  return (
    <section className="content">
      <div className="card">
        <div className="section-head">
          <div>
            <h3>Projets</h3>
            <p>Gère tes aventures et leurs scènes.</p>
          </div>
          <button className="primary small" onClick={createProject}>
            <Plus size={16} />
            Nouveau
          </button>
        </div>

        {projects.map((project) => (
          <div className="project" key={project.id}>
            <div className="project-icon">
              <Film />
            </div>

            <div className="grow">
              <b>{project.name}</b>
              <p>
                {project.format} · {project.duration}s
              </p>
            </div>

            <span
              className={
                project.status === "Terminé" ? "status ok" : "status"
              }
            >
              {project.status}
            </span>

            <button
              className="icon-btn"
              title="Ouvrir"
              onClick={() => {
                setActive(project);
                setPage("create");
              }}
            >
              <Play size={16} />
            </button>

            <button
              className="icon-btn"
              title="Dupliquer"
              onClick={() => duplicate(project)}
            >
              <Copy size={16} />
            </button>

            <button
              className="icon-btn danger"
              title="Supprimer"
              onClick={() => remove(project.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Engines({ status, details, test }) {
  const rows = [
    ["VIDEO", "ComfyUI", "Génération vidéo locale"],
    ["AUDIO / TTS", "Voix française", "Synthèse vocale"],
    ["LIP-SYNC", "Synchronisation labiale", "Bouche + voix"],
    ["MUSIQUE", "Musique", "Fond musical"],
    ["SFX", "Bruitages", "Effets sonores"],
    ["ASSEMBLAGE", "Montage", "Assemblage final"]
  ];

  return (
    <section className="content">
      <div className="card">
        <div className="section-head">
          <div>
            <h3>État des moteurs</h3>
            <p>
              Adresse ComfyUI : <b>{COMFYUI_BASE_URL}</b>
            </p>
          </div>

          {status === "Connecté" ? (
            <CheckCircle2 />
          ) : status === "Erreur" ? (
            <XCircle />
          ) : (
            <AlertCircle />
          )}
        </div>

        {rows.map((row, index) => (
          <div className="engine-row" key={row[0]}>
            <div>
              <span className="engine-type">{row[0]}</span>
              <b>{row[1]}</b>
              <p>{row[2]}</p>
            </div>

            <span
              className={
                index === 0 && status === "Connecté"
                  ? "status ok"
                  : "status"
              }
            >
              {index === 0 ? status : "À connecter"}
            </span>
          </div>
        ))}

        {details?.nodeCount != null && (
          <div className="notice">
            <CheckCircle2 size={17} />
            ComfyUI répond. {details.nodeCount} types de nœuds détectés.
          </div>
        )}

        {details?.error && (
          <div className="notice">
            <AlertCircle size={17} />
            {details.error}
          </div>
        )}

        <button className="primary" onClick={test}>
          <RefreshCw size={16} />
          Tester ComfyUI
        </button>
      </div>
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="content">
      <div className="card">
        <h3>Paramètres</h3>
        <p className="muted">
          Les secrets et clés API doivent rester côté serveur. ComfyUI local
          est utilisé sur cette installation.
        </p>

        <div className="setting">
          <b>Personnage par défaut</b>
          <span>Milo</span>
        </div>

        <div className="setting">
          <b>Format par défaut</b>
          <span>9:16</span>
        </div>

        <div className="setting">
          <b>Durée de test</b>
          <span>15 secondes</span>
        </div>

        <div className="setting">
          <b>ComfyUI</b>
          <span>{COMFYUI_BASE_URL}</span>
        </div>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
