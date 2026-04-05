import express from "express";
import type { RequestHandler, Response } from "express";
import cors from "cors";
import {
  initDb,
  getState,
  insertState,
  updateStock,
  updateCityMultipliers,
  updateTerrains,
  updateCurrentTerrainId,
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
type DbReadAction<T> = () => Promise<T>;
type IdDbAction = (id: number) => Promise<void>;
type IdBodyDbAction = (
  id: number,
  body: Record<string, unknown>,
) => Promise<void>;

const PORT = Number(process.env["PORT"]) || 3000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
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

const getRequestBody = (body: unknown): Record<string, unknown> =>
  typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};

const getBodyPayload = <T>(body: unknown, key: string, fallback: T): T => {
  const value = getRequestBody(body)[key];
  return value === undefined ? fallback : (value as T);
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

const runDbRead = async <T>(
  res: Response,
  action: DbReadAction<T>,
  fallbackError: string,
): Promise<void> => {
  try {
    res.json(await action());
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

const registerIdWriteRoute = ({
  path,
  errorMessage,
  action,
}: {
  path: string;
  errorMessage: string;
  action: IdBodyDbAction;
}): void => {
  registerPartialRoute(path, async (req, res) => {
    const id = ensureNumericId(res, req.params["id"]);
    if (id === null) return;

    await runDbAction(
      res,
      () => action(id, getRequestBody(req.body)),
      errorMessage,
    );
  });
};

const registerIdDeleteRoute = ({
  path,
  errorMessage,
  action,
}: {
  path: string;
  errorMessage: string;
  action: IdDbAction;
}): void => {
  app.delete(path, async (req, res) => {
    const id = ensureNumericId(res, req.params["id"]);
    if (id === null) return;

    await runDbAction(res, () => action(id), errorMessage);
  });
};

const buildDefaultState = () => {
  const defaultLuneId = 1;

  return {
    stocks: defaultStocks,
    currentLune: 1,
    terrains: [],
    currentTerrainId: null,
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
};

app.get("/api/state", async (_req, res) => {
  await runDbRead(
    res,
    () => getState(),
    "Impossible de lire l'état depuis la base de données",
  );
});

app.put("/api/state", async (req, res) => {
  await runDbRead(
    res,
    async () => {
      await insertState(req.body);
      return getState();
    },
    "Impossible de sauvegarder l'état dans la base de données",
  );
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

registerPartialRoute("/api/current-terrain", async (req, res) => {
  await runDbAction(
    res,
    () => updateCurrentTerrainId(req.body?.currentTerrainId),
    "Impossible de sauvegarder le terrain actuel",
  );
});

registerPartialRoute("/api/current-lune", async (req, res) => {
  await runDbAction(
    res,
    () => updateCurrentLune(req.body?.currentLune),
    "Impossible de sauvegarder la lune courante",
  );
});

registerPartialRoute("/api/terrains", async (req, res) => {
  await runDbAction(
    res,
    () => updateTerrains(req.body?.terrains || []),
    "Impossible de sauvegarder les terrains",
  );
});

registerPartialRoute("/api/constructions", async (req, res) => {
  await runDbAction(
    res,
    () => updateConstructions(req.body?.constructions || []),
    "Impossible de sauvegarder les chantiers",
  );
});

registerIdWriteRoute({
  path: "/api/resources/:id",
  errorMessage: "Impossible de sauvegarder la ressource",
  action: (resourceId, body) =>
    upsertResource({ ...getBodyPayload(body, "resource", {}), id: resourceId }),
});
registerIdDeleteRoute({
  path: "/api/resources/:id",
  errorMessage: "Impossible de supprimer la ressource",
  action: deleteResource,
});

registerIdWriteRoute({
  path: "/api/persos/:id",
  errorMessage: "Impossible de sauvegarder le perso",
  action: (persoId, body) =>
    upsertPerso({ ...getBodyPayload(body, "perso", {}), id: persoId }),
});
registerIdDeleteRoute({
  path: "/api/persos/:id",
  errorMessage: "Impossible de supprimer le perso",
  action: deletePerso,
});

registerIdWriteRoute({
  path: "/api/persos/:id/resources",
  errorMessage: "Impossible de sauvegarder les ressources du perso",
  action: (persoId, body) =>
    replacePersoResources(persoId, getBodyPayload(body, "persoResources", [])),
});
registerIdWriteRoute({
  path: "/api/persos/:id/armes",
  errorMessage: "Impossible de sauvegarder les armes du perso",
  action: (persoId, body) =>
    replacePersoArmes(persoId, getBodyPayload(body, "persoArmes", [])),
});
registerIdWriteRoute({
  path: "/api/persos/:id/outils",
  errorMessage: "Impossible de sauvegarder les outils du perso",
  action: (persoId, body) =>
    replacePersoOutils(persoId, getBodyPayload(body, "persoOutils", [])),
});
registerIdWriteRoute({
  path: "/api/persos/:id/sacs",
  errorMessage: "Impossible de sauvegarder les sacs du perso",
  action: (persoId, body) =>
    replacePersoSacs(persoId, getBodyPayload(body, "persoSacs", [])),
});

registerIdWriteRoute({
  path: "/api/groups/:id",
  errorMessage: "Impossible de sauvegarder le groupe",
  action: (groupId, body) =>
    upsertGroup({ ...getBodyPayload(body, "group", {}), id: groupId }),
});
registerIdDeleteRoute({
  path: "/api/groups/:id",
  errorMessage: "Impossible de supprimer le groupe",
  action: deleteGroup,
});
registerIdWriteRoute({
  path: "/api/groups/:id/members",
  errorMessage: "Impossible de mettre à jour les membres du groupe",
  action: (groupId, body) =>
    replaceGroupMembers(groupId, getBodyPayload(body, "memberIds", [])),
});

registerIdWriteRoute({
  path: "/api/lunes/:id",
  errorMessage: "Impossible de sauvegarder cette lune",
  action: (luneId, body) =>
    upsertLune({ ...getBodyPayload(body, "lune", {}), id: luneId }),
});
registerIdDeleteRoute({
  path: "/api/lunes/:id",
  errorMessage: "Impossible de supprimer cette lune",
  action: deleteLune,
});

registerIdWriteRoute({
  path: "/api/armes/:id",
  errorMessage: "Impossible de sauvegarder l'arme",
  action: (armeId, body) =>
    upsertArme({ ...getBodyPayload(body, "arme", {}), id: armeId }),
});
registerIdDeleteRoute({
  path: "/api/armes/:id",
  errorMessage: "Impossible de supprimer l'arme",
  action: deleteArme,
});

registerIdWriteRoute({
  path: "/api/outils/:id",
  errorMessage: "Impossible de sauvegarder l'outil",
  action: (outilId, body) =>
    upsertOutil({ ...getBodyPayload(body, "outil", {}), id: outilId }),
});
registerIdDeleteRoute({
  path: "/api/outils/:id",
  errorMessage: "Impossible de supprimer l'outil",
  action: deleteOutil,
});

registerIdWriteRoute({
  path: "/api/sacs/:id",
  errorMessage: "Impossible de sauvegarder le sac",
  action: (sacId, body) =>
    upsertSac({ ...getBodyPayload(body, "sac", {}), id: sacId }),
});
registerIdDeleteRoute({
  path: "/api/sacs/:id",
  errorMessage: "Impossible de supprimer le sac",
  action: deleteSac,
});

app.post("/api/reset", async (_req, res) => {
  await runDbRead(
    res,
    async () => {
      await insertState(buildDefaultState());
      return getState();
    },
    "Impossible de réinitialiser la base de données",
  );
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
