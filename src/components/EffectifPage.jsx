import React from "react";

function EffectifPage({ persos, removePerso, addPerso, openPersoPage }) {
  return (
    <div className='panel'>
      <h2>2. L'Effectif & Potentiel de base</h2>
      <p className='info-text'>
        Indiquez la capacité originelle. Les modifications au fil du temps se
        feront directement dans les blocs Lunes via le bouton ⚙️.
      </p>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>PV Début</th>
            <th className='highlight'>
              💧 Eau
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              🍗 Nrt
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              💊 Med
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              🧱 Mat
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>
              🎭 Art
              <br />
              <span style={{ fontSize: "0.7em", color: "#4caf50" }}>
                Capacité
              </span>
            </th>
            <th className='highlight'>CMD</th>
            <th className='highlight'>Combat</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {persos.map((p, index) => (
            <tr key={p.id}>
              <td>{p.nom}</td>
              <td>{p.pvBase}</td>
              <td className='highlight'>{p.capEau}</td>
              <td className='highlight'>{p.capNrt}</td>
              <td className='highlight'>{p.capMed}</td>
              <td className='highlight'>{p.capMat}</td>
              <td className='highlight'>{p.capart}</td>
              <td className='highlight'>{p.cmd}</td>
              <td className='highlight'>{p.combat}</td>
              <td>
                <button
                  className='btn-edit'
                  type='button'
                  onClick={() => openPersoPage(p.id)}
                >
                  Modifier
                </button>
                <button
                  className='btn-del'
                  type='button'
                  onClick={() => removePerso(index)}
                >
                  Renvoyer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className='btn-add' type='button' onClick={addPerso}>
        + Recruter un membre
      </button>
    </div>
  );
}

export default EffectifPage;
