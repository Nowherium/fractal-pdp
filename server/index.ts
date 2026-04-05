import express from "express";
import type { RequestHandler, Response } from "express";
import cors from "cors";
import {
  initDb,
  getState,
  insertState,
  updateStock,
  updateCityMultipliers,
  updateCurrentLune,
  updateConstructions,
  upsertResource,
  deleteResource,
  upsertLune,
  deleteLune,
  upsertPerso,
  deletePerso,
  replacePersoResources,
  replacePersoArmes,
  replacePersoOutils,
  replacePersoSacs,
  upsertGroup,
  replaceGroupMembers,
  deleteGroup,
  upsertArme,
  deleteArme,
  upsertOutil,
  deleteOutil,
  upsertSac,
  deleteSac,
  defaultStocks,
  defaultPersos,
  defaultRation,
} from "./db";

type DbAction = () => Promise<void>;

const PORT = Number(process.env["PORT"]) || 3000;
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

const ensureNumericId = (res: Response, rawId: unknown): number | null => {
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Identifiant invalide" });
    return null;
  }
  return id;
};

const ensureStockCode = (res: Response, rawCode: unknown): string | null => {
  const stockCode = String(rawCode || "")
    .trim()
    .toLowerCase();

  if (!/^[a-z0-9]+$/.test(stockCode)) {
    res.status(400).json({ error: "Code ressource invalide" });
    return null;
  }

  return stockCode;
};

const runDbAction = async (
  res: Response,
  action: DbAction,
  fallbackError: string,
): Promise<void> => {
  try {
    await action();
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : fallbackError,
    });
  }
};

const registerPartialRoute = (path: string, handler: RequestHandler): void => {
  app.patch(path, handler);
  app.put(path, handler);
};

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

registerPartialRoute("/api/stocks/:code", async (req, res) => {
  const stockCode = ensureStockCode(res, req.params["code"]);
  if (stockCode === null) return;

  await runDbAction(
    res,
    () => updateStock(stockCode, req.body?.quantity),
    "Impossible de sauvegarder cette ressource",
  );
});

registerPartialRoute("/api/city-multipliers", async (req, res) => {
  await runDbAction(
    res,
    () => updateCityMultipliers(req.body?.cityMultipliers || {}),
    "Impossible de sauvegarder les bonus de la ville",
  );
});

registerPartialRoute("/api/current-lune", async (req, res) => {
  await runDbAction(
    res,
    () => updateCurrentLune(req.body?.currentLune),
    "Impossible de sauvegarder la lune courante",
  );
});

registerPartialRoute("/api/constructions", async (req, res) => {
  await runDbAction(
    res,
    () => updateConstructions(req.body?.constructions || []),
    "Impossible de sauvegarder les chantiers",
  );
});

registerPartialRoute("/api/resources/:id", async (req, res) => {
  const resourceId = ensureNumericId(res, req.params["id"]);
  if (resourceId === null) return;

  await runDbAction(
    res,
    () => upsertResource({ ...(req.body?.resource || {}), id: resourceId }),
    "Impossible de sauvegarder la ressource",
  );
});

app.delete("/api/resources/:id", async (req, res) => {
  const resourceId = ensureNumericId(res, req.params["id"]);
  if (resourceId === null) return;

  await runDbAction(
    res,
    () => deleteResource(resourceId),
    "Impossible de supprimer la ressource",
  );
});

registerPartialRoute("/api/persos/:id", async (req, res) => {
  const persoId = ensureNumericId(res, req.params["id"]);
  if (persoId === null) return;

  await runDbAction(
    res,
    () => upsertPerso({ ...(req.body?.perso || {}), id: persoId }),
    "Impossible de sauvegarder le perso",
  );
});

app.delete("/api/persos/:id", async (req, res) => {
  const persoId = ensureNumericId(res, req.params["id"]);
  if (persoId === null) return;

  await runDbAction(
    res,
    () => deletePerso(persoId),
    "Impossible de supprimer le perso",
  );
});

registerPartialRoute("/api/persos/:id/resources", async (req, res) => {
  const persoId = ensureNumericId(res, req.params["id"]);
  if (persoId === null) return;

  await runDbAction(
    res,
    () => replacePersoResources(persoId, req.body?.persoResources || []),
    "Impossible de sauvegarder les ressources du perso",
  );
});

registerPartialRoute("/api/persos/:id/armes", async (req, res) => {
  const persoId = ensureNumericId(res, req.params["id"]);
  if (persoId === null) return;

  await runDbAction(
    res,
    () => replacePersoArmes(persoId, req.body?.persoArmes || []),
    "Impossible de sauvegarder les armes du perso",
  );
});

registerPartialRoute("/api/persos/:id/outils", async (req, res) => {
  const persoId = ensureNumericId(res, req.params["id"]);
  if (persoId === null) return;

  await runDbAction(
    res,
    () => replacePersoOutils(persoId, req.body?.persoOutils || []),
    "Impossible de sauvegarder les outils du perso",
  );
});

registerPartialRoute("/api/persos/:id/sacs", async (req, res) => {
  const persoId = ensureNumericId(res, req.params["id"]);
  if (persoId === null) return;

  await runDbAction(
    res,
    () => replacePersoSacs(persoId, req.body?.persoSacs || []),
    "Impossible de sauvegarder les sacs du perso",
  );
});

registerPartialRoute("/api/groups/:id", async (req, res) => {
  const groupId = ensureNumericId(res, req.params["id"]);
  if (groupId === null) return;

  await runDbAction(
    res,
    () => upsertGroup({ ...(req.body?.group || {}), id: groupId }),
    "Impossible de sauvegarder le groupe",
  );
});

app.delete("/api/groups/:id", async (req, res) => {
  const groupId = ensureNumericId(res, req.params["id"]);
  if (groupId === null) return;

  await runDbAction(
    res,
    () => deleteGroup(groupId),
    "Impossible de supprimer le groupe",
  );
});

registerPartialRoute("/api/groups/:id/members", async (req, res) => {
  const groupId = ensureNumericId(res, req.params["id"]);
  if (groupId === null) return;

  await runDbAction(
    res,
    () => replaceGroupMembers(groupId, req.body?.memberIds || []),
    "Impossible de mettre à jour les membres du groupe",
  );
});

registerPartialRoute("/api/lunes/:id", async (req, res) => {
  const luneId = ensureNumericId(res, req.params["id"]);
  if (luneId === null) return;

  await runDbAction(
    res,
    () => upsertLune({ ...(req.body?.lune || {}), id: luneId }),
    "Impossible de sauvegarder cette lune",
  );
});

app.delete("/api/lunes/:id", async (req, res) => {
  const luneId = ensureNumericId(res, req.params["id"]);
  if (luneId === null) return;

  await runDbAction(
    res,
    () => deleteLune(luneId),
    "Impossible de supprimer cette lune",
  );
});

registerPartialRoute("/api/armes/:id", async (req, res) => {
  const armeId = ensureNumericId(res, req.params["id"]);
  if (armeId === null) return;

  await runDbAction(
    res,
    () => upsertArme({ ...(req.body?.arme || {}), id: armeId }),
    "Impossible de sauvegarder l'arme",
  );
});

app.delete("/api/armes/:id", async (req, res) => {
  const armeId = ensureNumericId(res, req.params["id"]);
  if (armeId === null) return;

  await runDbAction(
    res,
    () => deleteArme(armeId),
    "Impossible de supprimer l'arme",
  );
});

registerPartialRoute("/api/outils/:id", async (req, res) => {
  const outilId = ensureNumericId(res, req.params["id"]);
  if (outilId === null) return;

  await runDbAction(
    res,
    () => upsertOutil({ ...(req.body?.outil || {}), id: outilId }),
    "Impossible de sauvegarder l'outil",
  );
});

app.delete("/api/outils/:id", async (req, res) => {
  const outilId = ensureNumericId(res, req.params["id"]);
  if (outilId === null) return;

  await runDbAction(
    res,
    () => deleteOutil(outilId),
    "Impossible de supprimer l'outil",
  );
});

registerPartialRoute("/api/sacs/:id", async (req, res) => {
  const sacId = ensureNumericId(res, req.params["id"]);
  if (sacId === null) return;

  await runDbAction(
    res,
    () => upsertSac({ ...(req.body?.sac || {}), id: sacId }),
    "Impossible de sauvegarder le sac",
  );
});

app.delete("/api/sacs/:id", async (req, res) => {
  const sacId = ensureNumericId(res, req.params["id"]);
  if (sacId === null) return;

  await runDbAction(
    res,
    () => deleteSac(sacId),
    "Impossible de supprimer le sac",
  );
});

app.post("/api/reset", async (_req, res) => {
  try {
    const defaultLuneId = 1;
    const defaultState = {
      stocks: defaultStocks,
      currentLune: 1,
      constructions: [],
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
          rations: Object.fromEntries(
            defaultPersos.map((p) => [p.id, defaultRation()]),
          ),
          overrides: {},
          constructions: [],
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

const start = async (): Promise<void> => {
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
