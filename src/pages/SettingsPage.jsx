import React, { useState, useEffect } from 'react';
import { LS_API_KEY, LS_FOLDER_ID, LS_COST_SHEET_ID, CACHE_KEY_DATE } from '../shared/constants';
import { colors } from '../shared/styles';
import { testConnection } from '../api/gdrive';
import { useData } from '../data/DataContext';
import DragDropUpload from '../components/DragDropUpload';

const sectionStyle = {
  background: colors.white,
  borderRadius: 8,
  padding: 24,
  marginBottom: 24,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const sectionTitleStyle = {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 16,
  color: colors.text,
};

const labelStyle = {
  fontSize: 14,
  color: '#666',
  marginBottom: 4,
  display: 'block',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid #e0e0e0',
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
};

const helpTextStyle = {
  fontSize: 12,
  color: colors.textMuted,
  marginTop: 4,
  marginBottom: 16,
};

const btnBase = {
  padding: '10px 20px',
  borderRadius: 6,
  fontSize: 14,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 500,
};

export default function SettingsPage() {
  const { workLogs, salaryData, loadData, handleWorkLogUpload, handleSalaryUpload, clearData } = useData();

  const [apiKey, setApiKey] = useState('');
  const [folderId, setFolderId] = useState('');
  const [costSheetId, setCostSheetId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null); // { text, color }
  const [uploadMsg, setUploadMsg] = useState({ workLog: null, salary: null });

  useEffect(() => {
    setApiKey(localStorage.getItem(LS_API_KEY) || '');
    setFolderId(localStorage.getItem(LS_FOLDER_ID) || '');
    setCostSheetId(localStorage.getItem(LS_COST_SHEET_ID) || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem(LS_API_KEY, apiKey);
    localStorage.setItem(LS_FOLDER_ID, folderId);
    localStorage.setItem(LS_COST_SHEET_ID, costSheetId);
    setStatusMsg({ text: '設定已保存', color: colors.success });
  };

  const handleTest = async () => {
    if (!apiKey || !folderId) {
      setStatusMsg({ text: '請先填入 API Key 和資料夾 ID', color: colors.error });
      return;
    }
    setStatusMsg({ text: '測試連線中...', color: colors.textMuted });
    const result = await testConnection(apiKey, folderId);
    setStatusMsg({
      text: result.success ? '連線成功！' : `連線失敗：${result.message}`,
      color: result.success ? colors.success : colors.error,
    });
  };

  const handleLoadData = async () => {
    setStatusMsg({ text: '載入數據中...', color: colors.textMuted });
    try {
      await loadData();
      setStatusMsg({ text: '數據載入完成', color: colors.success });
    } catch (err) {
      setStatusMsg({ text: `載入失敗：${err.message}`, color: colors.error });
    }
  };

  const handleWorkLogFiles = async (files) => {
    try {
      const count = await handleWorkLogUpload(files);
      setUploadMsg((prev) => ({ ...prev, workLog: `已載入 ${count} 筆工時紀錄` }));
    } catch (err) {
      setUploadMsg((prev) => ({ ...prev, workLog: `上傳失敗：${err.message}` }));
    }
  };

  const handleSalaryFiles = async (files) => {
    try {
      const count = await handleSalaryUpload(files);
      setUploadMsg((prev) => ({ ...prev, salary: `已載入 ${count} 筆薪資紀錄` }));
    } catch (err) {
      setUploadMsg((prev) => ({ ...prev, salary: `上傳失敗：${err.message}` }));
    }
  };

  const handleClear = () => {
    if (window.confirm('確定要清除所有數據嗎？')) {
      clearData();
      setStatusMsg({ text: '數據已清除', color: colors.success });
      setUploadMsg({ workLog: null, salary: null });
    }
  };

  const lastLoaded = localStorage.getItem(CACHE_KEY_DATE);

  return (
    <div>
      {/* API Settings */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>API 設定</div>

        {/* API Key */}
        <label style={labelStyle}>Google Drive API Key</label>
        <div style={{ position: 'relative', marginBottom: 0 }}>
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={inputStyle}
            placeholder="輸入 API Key"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: colors.textSecondary,
              padding: '4px 8px',
            }}
          >
            {showApiKey ? '隱藏' : '顯示'}
          </button>
        </div>
        <div style={helpTextStyle}>前往 Google Cloud Console 取得 API Key</div>

        {/* Folder ID */}
        <label style={labelStyle}>工時表資料夾 ID</label>
        <input
          type="text"
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          style={inputStyle}
          placeholder="輸入資料夾 ID"
        />
        <div style={helpTextStyle}>Google Drive 資料夾網址中 /folders/ 後面的部分</div>

        {/* Cost Sheet ID */}
        <label style={labelStyle}>
          薪資表 Sheet ID <span style={{ fontSize: 12, color: colors.textMuted }}>(選填)</span>
        </label>
        <input
          type="text"
          value={costSheetId}
          onChange={(e) => setCostSheetId(e.target.value)}
          style={inputStyle}
          placeholder="輸入 Sheet ID"
        />
        <div style={helpTextStyle}>Google 試算表網址中 /d/ 後面的部分</div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          <button
            onClick={handleSave}
            style={{ ...btnBase, background: colors.primary, color: '#fff' }}
          >
            保存設定
          </button>
          <button
            onClick={handleTest}
            style={{ ...btnBase, background: '#fff', color: colors.text, border: '1px solid #e0e0e0' }}
          >
            測試連線
          </button>
          <button
            onClick={handleLoadData}
            style={{ ...btnBase, background: colors.primary, color: '#fff' }}
          >
            現在載入數據
          </button>
        </div>

        {/* Status message */}
        {statusMsg && (
          <div style={{ marginTop: 12, fontSize: 13, color: statusMsg.color }}>
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* Manual Upload */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>手動上傳</div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>工時表上傳</label>
          <DragDropUpload
            accept=".xlsx"
            label="拖拽或點擊上傳工時表 (.xlsx)"
            onFiles={handleWorkLogFiles}
          />
          {uploadMsg.workLog && (
            <div style={{ marginTop: 8, fontSize: 13, color: colors.success }}>
              {uploadMsg.workLog}
            </div>
          )}
        </div>

        <div>
          <label style={{ ...labelStyle, marginBottom: 8 }}>薪資表上傳</label>
          <DragDropUpload
            accept=".xlsx"
            label="拖拽或點擊上傳薪資表 (.xlsx)"
            onFiles={handleSalaryFiles}
          />
          {uploadMsg.salary && (
            <div style={{ marginTop: 8, fontSize: 13, color: colors.success }}>
              {uploadMsg.salary}
            </div>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>資料管理</div>

        <div style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>
          工時紀錄: {workLogs.length} 筆 | 薪資紀錄: {salaryData.length} 筆
        </div>

        {lastLoaded && (
          <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16 }}>
            上次載入時間：{lastLoaded}
          </div>
        )}

        <button
          onClick={handleClear}
          style={{ ...btnBase, background: '#e53935', color: '#fff' }}
        >
          清除所有數據
        </button>
      </div>
    </div>
  );
}
