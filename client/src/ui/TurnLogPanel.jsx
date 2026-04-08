import React from "react";

export default function TurnLogPanel({ logs = [] }) {
  const reversed = [...logs].reverse();

  return (
    <div className="turnLogPanel">
      <h3>ターンログ</h3>

      {reversed.length === 0 ? (
        <div className="turnLogEmpty">まだログはありません</div>
      ) : (
        reversed.map((entry) => (
          <div key={entry.turn} className="turnLogEntry">
            <div className="turnLogHeader">Turn {entry.turn}</div>
            <ul className="turnLogList">
              {(entry.events || []).map((ev, idx) => (
                <li key={idx}>{ev}</li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}