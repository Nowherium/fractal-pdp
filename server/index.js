import express from "express";
import cors from "cors";
import {
  initDb,
  getState,
  insertState,
  defaultStocks,
  defaultPersos,
  defaultRation,
} from "./db.js";

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", async (_req, res) => {
  try {
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Impossible de lire l'état depuis la base de données" });
  }
});

app.put("/api/state", async (req, res) => {
  try {
    await insertState(req.body);
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Impossible de sauvegarder l'état dans la base de données",
    });
  }
});

app.post("/api/reset", async (_req, res) => {
  try {
    const defaultLuneId = Date.now();
    const defaultState = {
      stocks: defaultStocks,
      persos: defaultPersos,
      persoResources: [],
      armes: [],
      persoArmes: [],
      outils: [],
      persoOutils: [],
      sacs: [],
      persoSacs: [],
      lunes: [
        {
          id: defaultLuneId,
          coutMat: 0,
          rations: Object.fromEntries(
            defaultPersos.map((p) => [p.id, defaultRation()]),
          ),
          overrides: {},
        },
      ],
    };

    await insertState(defaultState);
    const state = await getState();
    res.json(state);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Impossible de réinitialiser la base de données" });
  }
});

const start = async () => {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`Backend démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Échec de l'initialisation de la base de données", error);
    process.exit(1);
  }
};

start();
