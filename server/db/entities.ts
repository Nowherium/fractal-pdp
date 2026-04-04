import {
  ensureGroupExists,
  ensurePersoExists,
  ensurePersoResourceCoverage,
  ensurePersoRationCoverage,
  normalizeArmeRow,
  normalizeBoolean,
  normalizeNonNegativeNumber,
  normalizeNumber,
  normalizeOptionalId,
  normalizeOutilRow,
  normalizePersoRow,
  normalizeResourceCode,
  normalizeResourceName,
  normalizeSacRow,
  normalizeToolSpecialite,
  normalizeWeaponQuantity,
  pool,
  syncAndValidateGroups,
  validateQuantityAgainstAssignments,
  withTransaction,
} from "./shared";

type EntityInput = {
  id?: unknown;
  code?: unknown;
  name?: unknown;
  nom?: unknown;
  present?: unknown;
  pvmax?: unknown;
  pv?: unknown;
  poidsMax?: unknown;
  capEau?: unknown;
  capNrt?: unknown;
  capMed?: unknown;
  capMat?: unknown;
  capart?: unknown;
  cmd?: unknown;
  combat?: unknown;
  groupId?: unknown;
  chef?: unknown;
  resource_id?: unknown;
  quantity?: unknown;
  arme_id?: unknown;
  equipee?: unknown;
  outil_id?: unknown;
  sac_id?: unknown;
  equipe?: unknown;
  specialite?: unknown;
  bonus?: unknown;
  pvm?: unknown;
  poids?: unknown;
  capacite?: unknown;
  fiabilite?: unknown;
  degats?: unknown;
  att?: unknown;
  esclave?: unknown;
  overrideCapacity?: unknown;
  override_capacity?: unknown;
} & Record<string, unknown>;

const buildUniqueEntriesById = <T>(
  entries: EntityInput[] = [],
  getEntryId: (entry: EntityInput) => number,
  buildValue: (entry: EntityInput, entryId: number) => T,
): T[] => {
  const entriesById = new Map<number, T>();

  for (const entry of Array.isArray(entries) ? entries : []) {
    const entryId = getEntryId(entry);
    if (!Number.isFinite(entryId)) continue;
    entriesById.set(entryId, buildValue(entry, entryId));
  }

  return Array.from(entriesById.values());
};

const upsertResource = async (resource: EntityInput | null | undefined) => {
  const id = Number(resource?.id);
  if (!Number.isFinite(id)) {
    throw new Error("Identifiant de ressource invalide.");
  }

  const code = normalizeResourceCode(resource?.code, `res${id}`);
  if (!code) {
    throw new Error("Code de ressource invalide.");
  }

  const name = normalizeResourceName(resource?.name, code.toUpperCase());

  await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      "SELECT code FROM resources WHERE id = $1 LIMIT 1",
      [id],
    );
    const previousCode = normalizeResourceCode(existingRows[0]?.code);

    const { rowCount } = await client.query(
      "SELECT 1 FROM resources WHERE code = $1 AND id <> $2 LIMIT 1",
      [code, id],
    );

    if ((rowCount ?? 0) > 0) {
      throw new Error(`Le code ressource "${code}" est déjà utilisé.`);
    }

    await client.query(
      `INSERT INTO resources (id, code, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id)
       DO UPDATE SET
         code = EXCLUDED.code,
         name = EXCLUDED.name`,
      [id, code, name],
    );

    if (previousCode && previousCode !== code) {
      await client.query("UPDATE rations SET drogue = $1 WHERE drogue = $2", [
        code,
        previousCode,
      ]);
    }

    await client.query(
      `INSERT INTO city_resources (city_id, resource_id, quantity)
       SELECT c.id, $1, 0
       FROM cities AS c
       LEFT JOIN city_resources AS cr
         ON cr.city_id = c.id
        AND cr.resource_id = $1
       WHERE cr.city_id IS NULL`,
      [id],
    );

    await client.query(
      `INSERT INTO perso_resources (perso_id, resource_id, quantity)
       SELECT p.id, $1, 0
       FROM persos AS p
       LEFT JOIN perso_resources AS pr
         ON pr.perso_id = p.id
        AND pr.resource_id = $1
       WHERE pr.perso_id IS NULL`,
      [id],
    );
  });
};

const deleteResource = async (resourceId: number) => {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      "SELECT id, code, name FROM resources WHERE id = $1 LIMIT 1",
      [resourceId],
    );

    if (rows.length === 0) {
      return;
    }

    const resource = rows[0];
    const code = normalizeResourceCode(resource.code);
    const protectedCodes = new Set(["eau", "nrt", "med", "mat", "crd"]);

    if (protectedCodes.has(code)) {
      throw new Error(
        `La ressource "${code}" est protégée et ne peut pas être supprimée.`,
      );
    }

    const { rows: stockRows } = await client.query(
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM city_resources WHERE resource_id = $1",
      [resourceId],
    );
    const stockTotal = Number(stockRows[0]?.total ?? 0);
    if (stockTotal > 0) {
      throw new Error(
        `Impossible de supprimer "${code}" : il reste ${stockTotal} en réserve centrale.`,
      );
    }

    const { rows: carriedRows } = await client.query(
      "SELECT COALESCE(SUM(quantity), 0) AS total FROM perso_resources WHERE resource_id = $1",
      [resourceId],
    );
    const carriedTotal = Number(carriedRows[0]?.total ?? 0);
    if (carriedTotal > 0) {
      throw new Error(
        `Impossible de supprimer "${code}" : ${carriedTotal} unité(s) sont encore portées par des persos.`,
      );
    }

    const { rowCount: plannedCount } = await client.query(
      "SELECT 1 FROM rations WHERE drogue = $1 LIMIT 1",
      [code],
    );
    if ((plannedCount ?? 0) > 0) {
      throw new Error(
        `Impossible de supprimer "${code}" : cette ressource est encore planifiée comme drogue dans la timeline.`,
      );
    }

    await client.query("DELETE FROM resources WHERE id = $1", [resourceId]);
  });
};

const upsertPerso = async (perso: EntityInput | null | undefined) => {
  const id = Number(perso?.id);
  if (!Number.isFinite(id)) {
    throw new Error("Identifiant de perso invalide.");
  }

  await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      "SELECT * FROM persos WHERE id = $1 LIMIT 1",
      [id],
    );
    const mergedPerso = {
      ...(existingRows[0] ? normalizePersoRow(existingRows[0]) : {}),
      ...(perso || {}),
      id,
    };

    const payload = {
      id,
      nom: mergedPerso.nom || `Perso ${id}`,
      present: normalizeBoolean(mergedPerso.present, true),
      pvmax: normalizeNonNegativeNumber(mergedPerso.pvmax),
      pv: normalizeNonNegativeNumber(mergedPerso.pv ?? mergedPerso.pvmax),
      poidsmax: normalizeNonNegativeNumber(mergedPerso.poidsMax ?? 20),
      capeau: normalizeNumber(mergedPerso.capEau),
      capnrt: normalizeNumber(mergedPerso.capNrt),
      capmed: normalizeNumber(mergedPerso.capMed),
      capmat: normalizeNumber(mergedPerso.capMat),
      capart: normalizeNumber(mergedPerso.capart),
      cmd: normalizeNumber(mergedPerso.cmd),
      combat: normalizeNumber(mergedPerso.combat),
      group_id: normalizeOptionalId(mergedPerso.groupId),
      esclave: normalizeBoolean(mergedPerso.esclave, false),
    };
    await ensureGroupExists(client, payload.group_id);
    await client.query(
      `INSERT INTO persos (id, nom, present, pvmax, pv, poidsmax, capEau, capNrt, capMed, capMat, capart, cmd, combat, group_id, esclave)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id)
       DO UPDATE SET
         nom = EXCLUDED.nom,
         present = EXCLUDED.present,
         pvmax = EXCLUDED.pvmax,
         pv = EXCLUDED.pv,
         poidsmax = EXCLUDED.poidsmax,
         capEau = EXCLUDED.capEau,
         capNrt = EXCLUDED.capNrt,
         capMed = EXCLUDED.capMed,
         capMat = EXCLUDED.capMat,
         capart = EXCLUDED.capart,
         cmd = EXCLUDED.cmd,
         combat = EXCLUDED.combat,
         group_id = EXCLUDED.group_id,
         esclave = EXCLUDED.esclave`,
      [
        payload.id,
        payload.nom,
        payload.present,
        payload.pvmax,
        payload.pv,
        payload.poidsmax,
        payload.capeau,
        payload.capnrt,
        payload.capmed,
        payload.capmat,
        payload.capart,
        payload.cmd,
        payload.combat,
        payload.group_id,
        payload.esclave,
      ],
    );

    await ensurePersoResourceCoverage(client, [payload.id]);
    await ensurePersoRationCoverage(client, [payload.id]);
    await syncAndValidateGroups(client);
  });
};

const deletePerso = async (persoId: number) => {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM persos WHERE id = $1", [persoId]);
    await syncAndValidateGroups(client);
  });
};

const replacePersoResources = async (
  persoId: number,
  persoResources: EntityInput[] = [],
) => {
  await withTransaction(async (client) => {
    await ensurePersoExists(client, persoId);
    await client.query("DELETE FROM perso_resources WHERE perso_id = $1", [
      persoId,
    ]);

    const payload = (Array.isArray(persoResources) ? persoResources : [])
      .map((entry) => ({
        perso_id: persoId,
        resource_id: Number(entry.resource_id),
        quantity: normalizeNonNegativeNumber(entry.quantity),
      }))
      .filter(
        (entry) =>
          Number.isFinite(entry.resource_id) && Number(entry.quantity) > 0,
      );

    if (payload.length > 0) {
      await client.query(
        `INSERT INTO perso_resources (perso_id, resource_id, quantity)
         SELECT perso_id, resource_id, quantity
         FROM json_to_recordset($1::json) AS incoming(
           perso_id integer,
           resource_id integer,
           quantity numeric
         )
         ON CONFLICT (perso_id, resource_id)
         DO UPDATE SET quantity = EXCLUDED.quantity`,
        [JSON.stringify(payload)],
      );
    }

    await ensurePersoResourceCoverage(client, [persoId]);
  });
};

const replacePersoArmes = async (
  persoId: number,
  persoArmes: EntityInput[] = [],
) => {
  await withTransaction(async (client) => {
    await ensurePersoExists(client, persoId);

    const payload = buildUniqueEntriesById(
      persoArmes,
      (entry) => Number(entry.arme_id),
      (entry, armeId) => ({
        perso_id: persoId,
        arme_id: armeId,
        equipee: Boolean(entry.equipee),
      }),
    );
    const equippedCount = payload.filter((entry) => entry.equipee).length;
    if (equippedCount > 1) {
      throw new Error(
        `Le perso ${persoId} ne peut équiper qu'une seule arme à la fois`,
      );
    }

    for (const entry of payload) {
      const { rows: itemRows } = await client.query(
        "SELECT quantity FROM armes WHERE id = $1 LIMIT 1",
        [entry.arme_id],
      );
      if (itemRows.length === 0) {
        throw new Error(`L'arme ${entry.arme_id} est introuvable.`);
      }

      const { rows: assignmentRows } = await client.query(
        `SELECT COUNT(*)::int AS assigned_count
         FROM perso_armes
         WHERE arme_id = $1 AND perso_id <> $2`,
        [entry.arme_id, persoId],
      );

      const assignedCount = Number(assignmentRows[0]?.assigned_count || 0) + 1;
      const availableQuantity = Number(itemRows[0]?.quantity || 0);
      if (assignedCount > availableQuantity) {
        throw new Error(
          `L'arme ${entry.arme_id} dépasse la quantité disponible (${availableQuantity}).`,
        );
      }
    }

    await client.query("DELETE FROM perso_armes WHERE perso_id = $1", [
      persoId,
    ]);

    if (payload.length > 0) {
      await client.query(
        `INSERT INTO perso_armes (perso_id, arme_id, equipee)
         SELECT perso_id, arme_id, equipee
         FROM json_to_recordset($1::json) AS incoming(
           perso_id integer,
           arme_id integer,
           equipee boolean
         )`,
        [JSON.stringify(payload)],
      );
    }
  });
};

const replacePersoOutils = async (
  persoId: number,
  persoOutils: EntityInput[] = [],
) => {
  await withTransaction(async (client) => {
    await ensurePersoExists(client, persoId);

    const payload = buildUniqueEntriesById(
      persoOutils,
      (entry) => Number(entry.outil_id),
      (_entry, outilId) => ({
        perso_id: persoId,
        outil_id: outilId,
      }),
    );

    for (const entry of payload) {
      const { rows: itemRows } = await client.query(
        "SELECT quantity FROM outils WHERE id = $1 LIMIT 1",
        [entry.outil_id],
      );
      if (itemRows.length === 0) {
        throw new Error(`L'outil ${entry.outil_id} est introuvable.`);
      }

      const { rows: assignmentRows } = await client.query(
        `SELECT COUNT(*)::int AS assigned_count
         FROM perso_outils
         WHERE outil_id = $1 AND perso_id <> $2`,
        [entry.outil_id, persoId],
      );

      const assignedCount = Number(assignmentRows[0]?.assigned_count || 0) + 1;
      const availableQuantity = Number(itemRows[0]?.quantity || 0);
      if (assignedCount > availableQuantity) {
        throw new Error(
          `L'outil ${entry.outil_id} dépasse la quantité disponible (${availableQuantity}).`,
        );
      }
    }

    await client.query("DELETE FROM perso_outils WHERE perso_id = $1", [
      persoId,
    ]);

    if (payload.length > 0) {
      await client.query(
        `INSERT INTO perso_outils (perso_id, outil_id)
         SELECT perso_id, outil_id
         FROM json_to_recordset($1::json) AS incoming(
           perso_id integer,
           outil_id integer
         )`,
        [JSON.stringify(payload)],
      );
    }
  });
};

const replacePersoSacs = async (
  persoId: number,
  persoSacs: EntityInput[] = [],
) => {
  await withTransaction(async (client) => {
    await ensurePersoExists(client, persoId);

    const payload = buildUniqueEntriesById(
      persoSacs,
      (entry) => Number(entry.sac_id),
      (entry, sacId) => ({
        perso_id: persoId,
        sac_id: sacId,
        equipe: Boolean(entry.equipe),
      }),
    );
    const equippedCount = payload.filter((entry) => entry.equipe).length;
    if (equippedCount > 1) {
      throw new Error(
        `Le perso ${persoId} ne peut équiper qu'un seul sac à la fois`,
      );
    }

    for (const entry of payload) {
      const { rows: itemRows } = await client.query(
        "SELECT quantity FROM sacs WHERE id = $1 LIMIT 1",
        [entry.sac_id],
      );
      if (itemRows.length === 0) {
        throw new Error(`Le sac ${entry.sac_id} est introuvable.`);
      }

      const { rows: assignmentRows } = await client.query(
        `SELECT COUNT(*)::int AS assigned_count
         FROM perso_sacs
         WHERE sac_id = $1 AND perso_id <> $2`,
        [entry.sac_id, persoId],
      );

      const assignedCount = Number(assignmentRows[0]?.assigned_count || 0) + 1;
      const availableQuantity = Number(itemRows[0]?.quantity || 0);
      if (assignedCount > availableQuantity) {
        throw new Error(
          `Le sac ${entry.sac_id} dépasse la quantité disponible (${availableQuantity}).`,
        );
      }
    }

    await client.query("DELETE FROM perso_sacs WHERE perso_id = $1", [persoId]);

    if (payload.length > 0) {
      await client.query(
        `INSERT INTO perso_sacs (perso_id, sac_id, equipe)
         SELECT perso_id, sac_id, equipe
         FROM json_to_recordset($1::json) AS incoming(
           perso_id integer,
           sac_id integer,
           equipe boolean
         )`,
        [JSON.stringify(payload)],
      );
    }
  });
};

const upsertGroup = async (group: EntityInput | null | undefined) => {
  const groupId = Number(group?.id);
  if (!Number.isFinite(groupId)) {
    throw new Error("Identifiant de groupe invalide.");
  }

  await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      `SELECT group_id AS id, name, chef, override_capacity
       FROM groups
       WHERE group_id = $1
       LIMIT 1`,
      [groupId],
    );
    const mergedGroup = {
      ...(existingRows[0] || {}),
      ...(group || {}),
      id: groupId,
    };

    const payloadOverride = Boolean(
      mergedGroup.overrideCapacity ?? mergedGroup.override_capacity,
    );

    await client.query(
      `INSERT INTO groups (group_id, name, chef, override_capacity)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id)
       DO UPDATE SET name = EXCLUDED.name, chef = EXCLUDED.chef, override_capacity = EXCLUDED.override_capacity`,
      [
        groupId,
        mergedGroup.name || `Groupe ${groupId}`,
        normalizeOptionalId(mergedGroup.chef),
        payloadOverride,
      ],
    );

    await syncAndValidateGroups(client);
  });
};

const replaceGroupMembers = async (
  groupId: number,
  memberIds: Array<number | string> = [],
) => {
  const normalizedGroupId = Number(groupId);
  if (!Number.isFinite(normalizedGroupId)) {
    throw new Error("Identifiant de groupe invalide.");
  }

  const normalizedMemberIds = Array.from(
    new Set(
      (memberIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    ),
  );

  await withTransaction(async (client) => {
    await ensureGroupExists(client, normalizedGroupId);

    await client.query(
      `UPDATE persos
       SET group_id = CASE
         WHEN id = ANY($2::int[]) THEN $1
         WHEN group_id = $1 THEN NULL
         ELSE group_id
       END`,
      [normalizedGroupId, normalizedMemberIds],
    );

    await syncAndValidateGroups(client);
  });
};

const deleteGroup = async (groupId: number) => {
  const normalizedGroupId = Number(groupId);
  if (!Number.isFinite(normalizedGroupId)) {
    throw new Error("Identifiant de groupe invalide.");
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE persos
       SET group_id = NULL
       WHERE group_id = $1`,
      [normalizedGroupId],
    );

    await client.query("DELETE FROM groups WHERE group_id = $1", [
      normalizedGroupId,
    ]);

    await syncAndValidateGroups(client);
  });
};

const upsertArme = async (arme: EntityInput | null | undefined) => {
  const id = Number(arme?.id);
  if (!Number.isFinite(id)) {
    throw new Error("Identifiant d'arme invalide.");
  }

  await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      "SELECT * FROM armes WHERE id = $1 LIMIT 1",
      [id],
    );
    const mergedArme = {
      ...(existingRows[0] ? normalizeArmeRow(existingRows[0]) : {}),
      ...(arme || {}),
      id,
    };

    const payload = {
      id,
      name: mergedArme.name || "Arme sans nom",
      att: normalizeNumber(mergedArme.att || 1),
      degats: normalizeNumber(mergedArme.degats),
      fiabilite: normalizeNumber(mergedArme.fiabilite),
      pv: normalizeNumber(mergedArme.pv),
      pvm: normalizeNumber(mergedArme.pvm),
      poids: normalizeNumber(mergedArme.poids),
      quantity: normalizeWeaponQuantity(mergedArme.quantity),
    };
    await validateQuantityAgainstAssignments(
      client,
      "armes",
      "perso_armes",
      "arme_id",
      payload.id,
      payload.quantity,
      "arme",
    );

    await client.query(
      `INSERT INTO armes (id, name, att, degats, fiabilite, pv, pvm, poids, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id)
       DO UPDATE SET
         name = EXCLUDED.name,
         att = EXCLUDED.att,
         degats = EXCLUDED.degats,
         fiabilite = EXCLUDED.fiabilite,
         pv = EXCLUDED.pv,
         pvm = EXCLUDED.pvm,
         poids = EXCLUDED.poids,
         quantity = EXCLUDED.quantity`,
      [
        payload.id,
        payload.name,
        payload.att,
        payload.degats,
        payload.fiabilite,
        payload.pv,
        payload.pvm,
        payload.poids,
        payload.quantity,
      ],
    );
  });
};

const deleteArme = async (armeId: number) => {
  await pool.query("DELETE FROM armes WHERE id = $1", [armeId]);
};

const upsertOutil = async (outil: EntityInput | null | undefined) => {
  const id = Number(outil?.id);
  if (!Number.isFinite(id)) {
    throw new Error("Identifiant d'outil invalide.");
  }

  await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      "SELECT * FROM outils WHERE id = $1 LIMIT 1",
      [id],
    );
    const mergedOutil = {
      ...(existingRows[0] ? normalizeOutilRow(existingRows[0]) : {}),
      ...(outil || {}),
      id,
    };

    const payload = {
      id,
      name: mergedOutil.name || "Outil sans nom",
      specialite: normalizeToolSpecialite(mergedOutil.specialite),
      bonus: normalizeNonNegativeNumber(mergedOutil.bonus ?? 1),
      pv: normalizeNonNegativeNumber(mergedOutil.pv),
      pvmax: normalizeNonNegativeNumber(mergedOutil.pvmax),
      poids: normalizeNonNegativeNumber(mergedOutil.poids),
      quantity: normalizeWeaponQuantity(mergedOutil.quantity),
    };
    await validateQuantityAgainstAssignments(
      client,
      "outils",
      "perso_outils",
      "outil_id",
      payload.id,
      payload.quantity,
      "outil",
    );

    await client.query(
      `INSERT INTO outils (id, name, specialite, bonus, pv, pvmax, poids, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id)
       DO UPDATE SET
         name = EXCLUDED.name,
         specialite = EXCLUDED.specialite,
         bonus = EXCLUDED.bonus,
         pv = EXCLUDED.pv,
         pvmax = EXCLUDED.pvmax,
         poids = EXCLUDED.poids,
         quantity = EXCLUDED.quantity`,
      [
        payload.id,
        payload.name,
        payload.specialite,
        payload.bonus,
        payload.pv,
        payload.pvmax,
        payload.poids,
        payload.quantity,
      ],
    );
  });
};

const deleteOutil = async (outilId: number) => {
  await pool.query("DELETE FROM outils WHERE id = $1", [outilId]);
};

const upsertSac = async (sac: EntityInput | null | undefined) => {
  const id = Number(sac?.id);
  if (!Number.isFinite(id)) {
    throw new Error("Identifiant de sac invalide.");
  }

  await withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      "SELECT * FROM sacs WHERE id = $1 LIMIT 1",
      [id],
    );
    const mergedSac = {
      ...(existingRows[0] ? normalizeSacRow(existingRows[0]) : {}),
      ...(sac || {}),
      id,
    };

    const payload = {
      id,
      name: mergedSac.name || "Sac sans nom",
      pv: normalizeNonNegativeNumber(mergedSac.pv),
      pvmax: normalizeNonNegativeNumber(mergedSac.pvmax),
      poids: normalizeNonNegativeNumber(mergedSac.poids),
      capacite: normalizeNonNegativeNumber(mergedSac.capacite),
      quantity: normalizeWeaponQuantity(mergedSac.quantity),
    };
    await validateQuantityAgainstAssignments(
      client,
      "sacs",
      "perso_sacs",
      "sac_id",
      payload.id,
      payload.quantity,
      "sac",
    );

    await client.query(
      `INSERT INTO sacs (id, name, pv, pvmax, poids, capacite, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id)
       DO UPDATE SET
         name = EXCLUDED.name,
         pv = EXCLUDED.pv,
         pvmax = EXCLUDED.pvmax,
         poids = EXCLUDED.poids,
         capacite = EXCLUDED.capacite,
         quantity = EXCLUDED.quantity`,
      [
        payload.id,
        payload.name,
        payload.pv,
        payload.pvmax,
        payload.poids,
        payload.capacite,
        payload.quantity,
      ],
    );
  });
};

const deleteSac = async (sacId: number) => {
  await pool.query("DELETE FROM sacs WHERE id = $1", [sacId]);
};

export {
  upsertResource,
  deleteResource,
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
};
