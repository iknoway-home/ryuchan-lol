import React, { useMemo } from "react";
import { saveZones, resetZones } from "../game/zones.js";

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ZoneEditor({ zones, setZones, selectedId, setSelectedId }) {
  const selected = useMemo(
    () => zones.find(z => z.id === selectedId) || null,
    [zones, selectedId]
  );

  function updateSelected(patch) {
    if (!selected) return;
    setZones(prev => prev.map(z => z.id === selected.id ? { ...z, ...patch } : z));
  }

  function doSave() {
    saveZones(zones);
    alert("保存しました（localStorage）");
  }

  function doReset() {
    const z = resetZones();
    setZones(z);
    setSelectedId(z[0]?.id || null);
  }

  async function copyJson() {
    const text = JSON.stringify(zones, null, 2);
    await navigator.clipboard.writeText(text);
    alert("JSONをコピーしました");
  }

  function downloadJson() {
    const text = JSON.stringify(zones, null, 2);
    downloadText("zones.export.json", text);
  }

  return (
    <div className="editor">
      <div className="editorTitle">ゾーン編集モード</div>

      <div className="editorRow">
        <div className="editorLabel">選択</div>
        <select
          className="editorSelect"
          value={selectedId || ""}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {zones.map(z => <option key={z.id} value={z.id}>{z.id}</option>)}
        </select>
      </div>

      <div className="editorHint">
        ・Rectをドラッグで移動 / 右下ハンドルでリサイズ<br/>
        ・数値は「割合（0〜1）」<br/>
        ・調整したら「保存」→ 次回も保持
      </div>

      <div className="editorGrid">
        {["x","y","w","h"].map(k => (
          <div key={k} className="editorCell">
            <div className="editorLabel">{k}</div>
            <input
              className="editorInput"
              type="number"
              step="0.01"
              value={selected?.[k] ?? 0}
              onChange={(e) => updateSelected({ [k]: Number(e.target.value) })}
              disabled={!selected}
            />
          </div>
        ))}
      </div>

      <div className="editorBtns">
        <button className="btn" onClick={doSave}>保存</button>
        <button className="btn" onClick={copyJson}>JSONコピー</button>
        <button className="btn" onClick={downloadJson}>JSONダウンロード</button>
        <button className="btnDanger" onClick={doReset}>リセット</button>
      </div>

      <div className="editorSmall">
        ※ サーバー側へ反映する場合は JSON を保存して管理でOK
      </div>
    </div>
  );
}
