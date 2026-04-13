import React, { useState } from 'react';
import { useData } from '../data/DataContext';
import DragDropUpload from '../components/DragDropUpload';
import { LS_API_KEY, LS_FOLDER_ID, LS_COST_SHEET_ID, CACHE_KEY_DATE } from '../shared/constants';
import { testConnection } from '../api/gdrive';

export default function SettingsPage() {
  const { loadData, handleWorkLogUpload, handleSalaryUpload, clearData, workLogs, salaryData } = useData();

  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_API_KEY) || '');
  const [folderId, setFolderId] = useState(() => localStorage.getItem(LS_FOLDER_ID) || '');
  const [costSheetId, setCostSheetId] = useState(() => localStorage.getItem(LS_COST_SHEET_ID) || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testSuccess, setTestSuccess] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (apiKey) localStorage.setItem(LS_API_KEY, apiKey); else localStorage.removeItem(LS_API_KEY);
    if (folderId) localStorage.setItem(LS_FOLDER_ID, folderId); else localStorage.removeItem(LS_FOLDER_ID);
    if (costSheetId) localStorage.setItem(LS_COST_SHEET_ID, costSheetId); else localStorage.removeItem(LS_COST_SHEET_ID);
    setSaving(true);
    setTimeout(() => setSaving(false), 1500);
  };

  const handleTest = async () => {
    setTestMsg('測試中...');
    setTestSuccess(null);
    const result = await testConnection(apiKey || import.meta.env.VITE_GDRIVE_API_KEY, folderId || import.meta.env.VITE_GDRIVE_FOLDER_ID);
    setTestMsg(result.message);
    setTestSuccess(result.success);
  };

  const handleLoad = async () => {
    try { await loadData(); setUploadMsg('資料載入完成'); } catch (err) { setUploadMsg(`載入失敗: ${err.message}`); }
  };

  const handleWorkFiles = async (files) => {
    const count = await handleWorkLogUpload(files);
    setUploadMsg(`已載入 ${count} 筆工時紀錄`);
  };

  const handleSalaryFiles = async (files) => {
    const count = await handleSalaryUpload(files);
    setUploadMsg(`已載入 ${count} 筆薪資紀錄`);
  };

  const handleClear = () => {
    if (window.confirm('確定要清除所有數據嗎？')) { clearData(); setUploadMsg('所有數據已清除'); }
  };

  const lastLoaded = localStorage.getItem(CACHE_KEY_DATE);

  return (
    <div>
      <div style={sectionStyle}>
        <h3 style={sectionTitle}>API 設定</h3>
        <div style={fieldStyle}>
          <label style={labelStyle}>Google Drive API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type={showApiKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="輸入 API Key" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => setShowApiKey(!showApiKey)} style={smallBtnStyle}>{showApiKey ? '隱藏' : '顯示'}</button>
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>工時表資料夾 ID</label>
          <input type="text" value={folderId} onChange={e => setFolderId(e.target.value)} placeholder="輸入 Folder ID" style={inputStyle} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>薪資表 Sheet ID <span style={{ color: '#999' }}>（選填）</span></label>
          <input type="text" value={costSheetId} onChange={e => setCostSheetId(e.target.value)} placeholder="輸入 Cost Sheet ID" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button onClick={handleSave} style={primaryBtnStyle}>{saving ? '已保存 ✓' : '保存設定'}</button>
          <button onClick={handleTest} style={secondaryBtnStyle}>測試連線</button>
          <button onClick={handleLoad} style={secondaryBtnStyle}>現在載入數據</button>
        </div>
        {testMsg && <p style={{ marginTop: 12, fontSize: 14, color: testSuccess ? '#4CAF50' : testSuccess === false ? '#e53935' : '#666' }}>{testMsg}</p>}
        <div style={helpStyle}>
          <p>API Key：前往 Google Cloud Console → APIs & Services → Credentials 取得</p>
          <p>Folder ID：Google Drive 資料夾網址中 /folders/ 後面的那段字串</p>
          <p>Cost Sheet ID：Google 試算表網址中 /d/ 後面的那段字串</p>
        </div>
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitle}>手動上傳</h3>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>工時表上傳</label>
          <DragDropUpload onFiles={handleWorkFiles} accept=".xlsx" label="拖拽或點擊上傳工時表 (.xlsx)" />
        </div>
        <div>
          <label style={labelStyle}>薪資表上傳</label>
          <DragDropUpload onFiles={handleSalaryFiles} accept=".xlsx" label="拖拽或點擊上傳薪資表 (.xlsx)" />
        </div>
        {uploadMsg && <p style={{ marginTop: 12, fontSize: 14, color: '#00BCD4' }}>{uploadMsg}</p>}
      </div>

      <div style={sectionStyle}>
        <h3 style={sectionTitle}>資料管理</h3>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          <p>工時紀錄：{workLogs.length} 筆</p>
          <p>薪資紀錄：{salaryData.length} 筆</p>
          <p>最後載入：{lastLoaded ? new Date(lastLoaded).toLocaleString() : '尚未載入'}</p>
        </div>
        <button onClick={handleClear} style={dangerBtnStyle}>清除所有數據</button>
      </div>
    </div>
  );
}

const sectionStyle = { background: '#fff', borderRadius: 8, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' };
const sectionTitle = { fontSize: 18, fontWeight: 600, color: '#333', margin: '0 0 20px' };
const fieldStyle = { marginBottom: 16 };
const labelStyle = { display: 'block', fontSize: 14, color: '#666', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box' };
const primaryBtnStyle = { padding: '8px 20px', borderRadius: 6, border: 'none', background: '#00BCD4', color: '#fff', fontSize: 14, cursor: 'pointer' };
const secondaryBtnStyle = { padding: '8px 20px', borderRadius: 6, border: '1px solid #d9d9d9', background: '#fff', color: '#666', fontSize: 14, cursor: 'pointer' };
const smallBtnStyle = { padding: '8px 12px', borderRadius: 6, border: '1px solid #d9d9d9', background: '#fff', color: '#666', fontSize: 13, cursor: 'pointer' };
const dangerBtnStyle = { padding: '8px 20px', borderRadius: 6, border: 'none', background: '#e53935', color: '#fff', fontSize: 14, cursor: 'pointer' };
const helpStyle = { marginTop: 20, padding: 16, background: '#f8f9fa', borderRadius: 6, fontSize: 13, color: '#999', lineHeight: 1.8 };
