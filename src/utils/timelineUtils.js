const computeIncrement = (cap) => (cap < 4 ? 0.1 : cap <= 6 ? 0.05 : 0.01);

export const simulateTimeline = (persos, lunes, stocks, defaultRation) => {
  const timeline = [];
  const pvCourants = {};
  const capCourantes = {};

  persos.forEach((perso) => {
    pvCourants[perso.id] = Math.max(0, Number(perso.pv ?? perso.pvmax ?? 0));
    capCourantes[perso.id] = {
      eau: Number(perso.capEauEffectif ?? perso.capEau ?? 0),
      nrt: Number(perso.capNrtEffectif ?? perso.capNrt ?? 0),
      med: Number(perso.capMedEffectif ?? perso.capMed ?? 0),
      mat: Number(perso.capMatEffectif ?? perso.capMat ?? 0),
    };
  });

  let stockEau = stocks.eau ?? 0;
  let stockNrt = stocks.nrt ?? 0;
  let stockMed = stocks.med ?? 0;
  let stockMat = stocks.mat ?? 0;

  lunes.forEach((lune) => {
    const overrides = lune.overrides || {};

    persos.forEach((perso) => {
      const override = overrides[perso.id];
      if (!override) return;
      if (override.pv !== undefined)
        pvCourants[perso.id] = Math.max(0, Number(override.pv) || 0);
      if (override.capEau !== undefined)
        capCourantes[perso.id].eau = override.capEau;
      if (override.capNrt !== undefined)
        capCourantes[perso.id].nrt = override.capNrt;
      if (override.capMed !== undefined)
        capCourantes[perso.id].med = override.capMed;
      if (override.capMat !== undefined)
        capCourantes[perso.id].mat = override.capMat;
    });

    const rows = [];
    let luneProdEau = 0;
    let luneProdNrt = 0;
    let luneProdMed = 0;
    let luneProdMat = 0;
    let luneConsoEau = 0;
    let luneConsoNrt = 0;
    let luneConsoMed = 0;

    persos.forEach((perso) => {
      const pvDebut = pvCourants[perso.id];
      const ration = lune.rations[perso.id] || defaultRation();
      const cDebut = { ...capCourantes[perso.id] };
      const override = overrides[perso.id] || {};
      const hasOverride = Object.keys(override).length > 0;

      const mortAuDebut = pvDebut <= 0;
      let pvFin = pvDebut;
      let classPv = "";
      let mortText = "";

      if (!mortAuDebut) {
        if (ration.tache === "eau") {
          luneProdEau += capCourantes[perso.id].eau;
          capCourantes[perso.id].eau += computeIncrement(
            capCourantes[perso.id].eau,
          );
        }
        if (ration.tache === "nrt") {
          luneProdNrt += capCourantes[perso.id].nrt;
          capCourantes[perso.id].nrt += computeIncrement(
            capCourantes[perso.id].nrt,
          );
        }
        if (ration.tache === "med") {
          luneProdMed += capCourantes[perso.id].med;
          capCourantes[perso.id].med += computeIncrement(
            capCourantes[perso.id].med,
          );
        }
        if (ration.tache === "mat") {
          luneProdMat += capCourantes[perso.id].mat;
          capCourantes[perso.id].mat += computeIncrement(
            capCourantes[perso.id].mat,
          );
        }

        if (ration.eau) luneConsoEau += 1;
        if (ration.nrt) luneConsoNrt += 1;
        if (ration.med) luneConsoMed += 1;

        const degats =
          (ration.eau ? 0 : 1) + (ration.nrt ? 0 : 1) + (ration.med ? 0 : 0.5);
        pvFin = Math.max(0, pvDebut - degats);
        pvCourants[perso.id] = pvFin;
        classPv = pvFin <= 0 ? "danger" : pvFin <= 5 ? "warning" : "safe";
        mortText = pvFin <= 0 ? " (DÉCÈS)" : "";
      } else {
        mortText = " (CADAVRE)";
      }

      rows.push({
        persoId: perso.id,
        nom: perso.nom,
        pvDebut,
        pvFin,
        pvDisplayDebut: pvDebut > 0 ? pvDebut : 0,
        pvDisplayFin: pvFin > 0 ? pvFin : 0,
        cDebut,
        ration,
        mortAuDebut,
        classPv,
        mortText,
        hasOverride,
      });
    });

    stockEau = stockEau + luneProdEau - luneConsoEau;
    stockNrt = stockNrt + luneProdNrt - luneConsoNrt;
    stockMed = stockMed + luneProdMed - luneConsoMed;
    stockMat = stockMat + luneProdMat - (lune.coutMat || 0);

    timeline.push({
      lune,
      rows,
      stats: {
        stockEau,
        stockNrt,
        stockMed,
        stockMat,
        classEau: stockEau < 0 ? "danger" : "safe",
        classNrt: stockNrt < 0 ? "danger" : "safe",
        classMed: stockMed < 0 ? "danger" : "safe",
        classMat: stockMat < 0 ? "danger" : "safe",
      },
    });
  });

  return timeline;
};
