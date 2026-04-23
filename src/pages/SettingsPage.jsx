import React, { useState, useEffect } from 'react';
import { useData } from '../data/DataContext';
import Card from '../components/Card';
import Icon from '../components/Icon';
import DragDropUpload from '../components/DragDropUpload';
import {
  LS_API_KEY, LS_FOLDER_ID, LS_COST_SHEET_ID,
  DEFAULT_API_KEY, DEFAULT_FOLDER_ID, DEFAULT_COST_SHEET_ID,
  CACHE_KEY_DATE,
} from '../shared/constants';
import { testConnection } from '../api/gdrive';
import { fmtHours } from '../shared/format';

export default function SettingsPage() {
  const {
    loadData, handleWorkLogUpload, handleSalaryUpload,
    clearData, workLogs, salaryData,
  } = useData();

  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(LS_API_KEY) || DEFAULT_API_KEY || ''
  );
  const [folderId, setFolderId] = useState(
    () => localStorage.getItem(LS_FOLDER_ID) || DEFAULT_FOLDER_ID || ''
  );
  const [costSheetId, setCostSheetId] = useState(
    () => localStorage.getItem(LS_COST_SHEET_ID) || DEFAULT_COST_SHEET_ID || ''
  );
  const [testResult, setTestResult] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [syncedAt, setSyncedAt] = useState(null);

  useEffect(() => {
    try { setSyncedAt(localStorage.getItem(CACHE_KEY_DATE)); } catch {}
  }, [workLogs, salaryData]);

  const handleSave = () => {
    localStorage.setItem(LS_API_KEY, apiKey);
    localStorage.setItem(LS_FOLDER_ID, folderId);
    localStorage.setItem(LS_COST_SHEET_ID, costSheetId);
    setTestResult({ success: true, message: '設定已儲存' });
  };

  const handleTest = async () => {
    setTestResult({ testing: true });
    const res = await testConnection(apiKey, folderId);
    setTestResult(res);
  };

  const handleWorkUpload = async (files) => {
    setUploadStatus('正在解析工時檔案…');
    try {
      const count = await handleWorkLogUpload(files);
      setUploadStatus(`成功載入 ${count} 筆工時紀錄`);
    } catch (err) {
      setUploadStatus(`載入失敗：${err.message}`);
    }
  };

  const handleSalUpload = async (files) => {
    setUploadStatus('正在解析薪資檔案…');
    try {
      const count = await handleSalaryUpload(files);
      setUploadStatus(`成功載入 ${count} 筆薪資紀錄`);
    } catch (err) {
      setUploadStatus(`載入失敗：${err.message}`);
    }
  };

  const syncLabel = syncedAt
    ? new Date(syncedAt).toLocaleString('zh-TW')
    : '尚未同步';

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* ===== Data source ===== */}
      <Card>
        <div className="card__head">
          <div>
            <span className="eyebrow-label">System Settings</span>
            <div className="card__title" style={{ fontSize: 18, marginTop: 4 }}>資料來源設定</div>
            <div className="card__sub">連接 Google Drive 工時檔案與管銷費用表</div>
          </div>
          <div className="cluster">
            <button type="button" className="btn" onClick={handleTest}>
              <Icon name="plug" size={14} />測試連線
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSave}>
              <Icon name="check" size={14} />儲存
            </button>
            <button type="button" className="btn" onClick={loadData}>
              <Icon name="refresh" size={14} />現在載入數據
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-row">
            <div>
              <div className="settings-row__label">Google API Key</div>
              <div className="settings-row__hint">用於讀取共享資料夾內的 Excel</div>
            </div>
            <div>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="AIza…"
              />
            </div>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row__label">工時資料夾 ID</div>
              <div className="settings-row__hint">HR 每月上傳工時 Excel 的 Drive 資料夾</div>
            </div>
            <div>
              <input
                type="text"
                value={folderId}
                onChange={e => setFolderId(e.target.value)}
                placeholder="1X5MnrR…"
              />
              {testResult && (
                <div className="settings-row__hint" style={{ marginTop: 8 }}>
                  {testResult.testing && <span className="muted">正在測試…</span>}
                  {testResult.success !== undefined && !testResult.testing && (
                    <>
                      <span className={`chip chip--dot ${testResult.success ? 'chip--brand' : ''}`}
                        style={!testResult.success ? { color: 'var(--state-error)', background: 'rgba(225,77,77,.10)' } : undefined}>
                        {testResult.success ? '已連線' : '連線失敗'}
                      </span>
                      <span className="muted" style={{ marginLeft: 8 }}>
                        {testResult.message}
                      </span>
                    </>
                  )}
                </div>
              )}
              <div className="settings-row__hint" style={{ marginTop: 4 }}>
                上次同步 {syncLabel}
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row__label">管銷費用 Sheet ID</div>
              <div className="settings-row__hint">每月營運總成本匯總表</div>
            </div>
            <div>
              <input
                type="text"
                value={costSheetId}
                onChange={e => setCostSheetId(e.target.value)}
                placeholder="13qiOx5…"
              />
            </div>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row__label">快取資料</div>
              <div className="settings-row__hint">當日讀取的工時與費用資料</div>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="chip">工時紀錄 {fmtHours(workLogs.length)} 筆</span>
                <span className="chip">費用 {salaryData.length} 筆</span>
                <button type="button" className="btn btn--ghost" onClick={clearData}>
                  清除快取
                </button>
              </div>
            </div>
          </div>

          <div className="settings-row">
            <div>
              <div className="settings-row__label">存取控制</div>
              <div className="settings-row__hint">限 @fandora.co 成員登入</div>
            </div>
            <div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="chip chip--brand chip--dot">已啟用</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ===== Manual upload ===== */}
      <Card>
        <div className="card__head">
          <div>
            <span className="eyebrow-label">Manual Upload</span>
            <div className="card__title" style={{ fontSize: 18, marginTop: 4 }}>手動上傳檔案</div>
            <div className="card__sub">無法連線時可手動拖放工時或薪資 Excel</div>
          </div>
        </div>
        <div className="settings-section" style={{ maxWidth: 'unset' }}>
          <div className="grid-2" style={{ marginBottom: 0 }}>
            <div>
              <div className="settings-row__label" style={{ marginBottom: 8 }}>工時 Excel</div>
              <DragDropUpload onFiles={handleWorkUpload} accept=".xlsx" multiple>
                拖放工時 Excel 檔案到這裡（或點擊選擇）
              </DragDropUpload>
            </div>
            <div>
              <div className="settings-row__label" style={{ marginBottom: 8 }}>薪資 Excel</div>
              <DragDropUpload onFiles={handleSalUpload} accept=".xlsx" multiple>
                拖放薪資 Excel 檔案到這裡（或點擊選擇）
              </DragDropUpload>
            </div>
          </div>
          {uploadStatus && (
            <div className="settings-row__hint" style={{ marginTop: 12 }}>
              {uploadStatus}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
