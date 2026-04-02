const formatWeight = (value) => Number(value ?? 0).toFixed(2);
const getResourceUnitWeight = (resource) => (resource?.code === "crd" ? 0 : 1);
const getResourceDisplayName = (resource) =>
  resource?.name || resource?.code?.toUpperCase() || "Ressource";

function ReservePage({
  resources,
  stocks,
  handleStockChange,
  armes,
  persoArmes,
  outils,
  persoOutils,
  sacs,
  persoSacs,
}) {
  const totalResourcesWeight = resources.reduce(
    (total, resource) =>
      total +
      Number(stocks[resource.code] ?? 0) *
        Number(getResourceUnitWeight(resource)),
    0,
  );

  const reserveArmes = armes
    .map((arme) => {
      const assignedCount = persoArmes.filter(
        (entry) => entry.arme_id === arme.id,
      ).length;
      const reserveQuantity = Math.max(
        0,
        Math.floor(Number(arme.quantity ?? 1) || 0) - assignedCount,
      );

      return {
        id: arme.id,
        name: arme.name,
        quantity: reserveQuantity,
        poids: Number(arme.poids ?? 0),
        totalWeight: reserveQuantity * Number(arme.poids ?? 0),
      };
    })
    .filter((arme) => arme.quantity > 0);

  const reserveOutils = outils
    .map((outil) => {
      const assignedCount = persoOutils.filter(
        (entry) => entry.outil_id === outil.id,
      ).length;
      const reserveQuantity = Math.max(
        0,
        Math.floor(Number(outil.quantity ?? 1) || 0) - assignedCount,
      );

      return {
        id: outil.id,
        name: outil.name,
        quantity: reserveQuantity,
        poids: Number(outil.poids ?? 0),
        totalWeight: reserveQuantity * Number(outil.poids ?? 0),
      };
    })
    .filter((outil) => outil.quantity > 0);

  const reserveSacs = sacs
    .map((sac) => {
      const assignedCount = persoSacs.filter(
        (entry) => entry.sac_id === sac.id,
      ).length;
      const reserveQuantity = Math.max(
        0,
        Math.floor(Number(sac.quantity ?? 1) || 0) - assignedCount,
      );

      return {
        id: sac.id,
        name: sac.name,
        quantity: reserveQuantity,
        poids: Number(sac.poids ?? 0),
        totalWeight: reserveQuantity * Number(sac.poids ?? 0),
      };
    })
    .filter((sac) => sac.quantity > 0);

  const totalReserveGearWeight = [
    ...reserveArmes,
    ...reserveOutils,
    ...reserveSacs,
  ].reduce((total, item) => total + Number(item.totalWeight ?? 0), 0);

  const totalReserveWeight = totalResourcesWeight + totalReserveGearWeight;

  const renderReserveItems = (title, items, emptyLabel) => (
    <div style={{ marginTop: "1rem" }}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>{emptyLabel}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Quantité en réserve</th>
              <th>Poids unitaire</th>
              <th>Poids total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{formatWeight(item.poids)}</td>
                <td>{formatWeight(item.totalWeight)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className='panel'>
      <h2>1. Réserve Centrale</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        {resources.map((resource) => (
          <label key={resource.code} className='perso-field'>
            <span className='perso-field-label'>
              Stock {resource.code.toUpperCase()}{" "}
              <span
                title={getResourceDisplayName(resource)}
                aria-label={`Nom complet: ${getResourceDisplayName(resource)}`}
                style={{
                  display: "inline-block",
                  marginLeft: "0.25rem",
                  width: "1.1rem",
                  height: "1.1rem",
                  lineHeight: "1.1rem",
                  textAlign: "center",
                  fontSize: "0.85rem",
                  cursor: "help",
                }}
              >
                ❔
              </span>
            </span>
            <input
              className='perso-field-input'
              type='number'
              value={stocks[resource.code] ?? 0}
              step='1'
              onChange={(event) =>
                handleStockChange(resource.code, event.target.value)
              }
            />
          </label>
        ))}
      </div>

      <p className='info-text' style={{ marginTop: "1rem" }}>
        <strong>Poids total des ressources :</strong>{" "}
        {formatWeight(totalResourcesWeight)}
        <br />
        <strong>Poids total des armes / outils / sacs en réserve :</strong>{" "}
        {formatWeight(totalReserveGearWeight)}
        <br />
        <strong>Poids total de la réserve centrale :</strong>{" "}
        {formatWeight(totalReserveWeight)}
      </p>

      {renderReserveItems(
        "Armes en réserve",
        reserveArmes,
        "Aucune arme en réserve.",
      )}
      {renderReserveItems(
        "Outils en réserve",
        reserveOutils,
        "Aucun outil en réserve.",
      )}
      {renderReserveItems(
        "Sacs en réserve",
        reserveSacs,
        "Aucun sac en réserve.",
      )}
    </div>
  );
}

export default ReservePage;
