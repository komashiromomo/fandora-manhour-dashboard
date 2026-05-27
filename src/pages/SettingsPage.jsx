/**
 * 系統設定頁 — Fandora V2 設計風格
 * 保留所有功能：Drive 設定、上傳、組織管理、資料統計、診斷面板、危險操作
 */
import { useState, useCallback } from 'react';
import { Input, Button, Space, Alert, Spin } from 'antd';
import { Card, Empty } from '../components/v2';
import { testConnection, listAllSpreadsheets, listFilesInFolder, exportSheetAsXlsx } from '../api/gdrive';
import { classifyFileType } from '../utils/names';
import { extractMonthFromSheetName, parseDateString, excelDateToString } from '../utils/dates';
import { parseWorkbook } from '../utils/excelParser';
import * as XLSX from 'xlsx';
import { useData } from '../data/DataContext';
import { useDataLoader } from '../data/useDataLoader';
import { useAuth } from '../auth/AuthContext';
import DragDropUpload from '../components/DragDropUpload';
import OrgManager from '../components/OrgManager';
import IpListManager from '../components/IpListManager';
import IpMisrecordWarning from '../components/IpMisrecordWarning';
import {
  LS_API_KEY,
  LS_FOLDER_ID,
  LS_COST_SHEET_ID,
  LS_IP_SHEET_ID,
  DEFAULT_API_KEY,
  DEFAULT_FOLDER_ID,
  DEFAULT_IP_SHEET_ID,
} from '../config/constants';

export default function SettingsPage() {
  const { workLogs, salaryData, isLoading, clearAll } = useData();
  const { loadFromDrive, handleWorkLogUpload, handleSalaryUpload } = useDataLoader();
  const { accessToken, requestDriveAccess, authUser, role } = useAuth();
  const [diagnostic, setDiagnostic] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const [apiKey, setApiKey] = useState(
    () => DEFAULT_API_KEY || localStorage.getItem(LS_API_KEY) || ''
  );
  const [folderId, setFolderId] = useState(
    () => DEFAULT_FOLDER_ID || localStorage.getItem(LS_FOLDER_ID) || ''
  );
  const [costSheetId, setCostSheetId] = useState(
    () => localStorage.getItem(LS_COST_SHEET_ID) || ''
  );
  const [ipSheetId, setIpSheetId] = useState(
    () => DEFAULT_IP_SHEET_ID || localStorage.getItem(LS_IP_SHEET_ID) || ''
  );
  const [testStatus, setTestStatus] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleSaveSettings = useCallback(() => {
    if (apiKey) localStorage.setItem(LS_API_KEY, apiKey);
    if (folderId) localStorage.setItem(LS_FOLDER_ID, folderId);
    if (costSheetId) localStorage.setItem(LS_COST_SHEET_ID, costSheetId);
    if (ipSheetId) localStorage.setItem(LS_IP_SHEET_ID, ipSheetId);
    setTestStatus({ type: 'success', message: '設定已保存' });
  }, [apiKey, folderId, costSheetId, ipSheetId]);

  const handleTestConnection = useCallback(async () => {
    setTestLoading(true);
    try {
      const result = await testConnection(accessToken);
      setTestStatus(
        result
          ? { type: 'success', message: '連線成功！' }
          : { type: 'error', message: '連線失敗，請檢查設定' }
      );
    } catch (err) {
      setTestStatus({ type: 'error', message: err.message });
    } finally {
      setTestLoading(false);
    }
  }, [accessToken]);

  const handleLoadFromDrive = useCallback(async () => {
    handleSaveSettings();
    const result = await loadFromDrive();
    if (!result) return;
    if (!result.ok) {
      setTestStatus({ type: 'error', message: `載入失敗：${result.error || '未知錯誤'}` });
      return;
    }
    if (result.individual === 0) {
      setTestStatus({
        type: 'warning',
        message: `Drive 內共找到 ${result.total} 個 sheet，但沒有任何符合「個人版」格式（工作日誌_YYYY年_本名_部門 或舊暱稱）。請確認檔名。`,
      });
      return;
    }
    const salaryMsg = result.salaryCount > 0 ? `；薪資表 ${result.salaryCount} 筆` : '；薪資表未載入（請確認 Cost Sheet ID 正確且有「姓名」「月薪」欄位）';
    setTestStatus({
      type: 'success',
      message: `載入完成：${result.individual} 個個人版檔（共 ${result.total} 個）→ 解析 ${result.parsedFiles} 成功 / ${result.parseErrors} 失敗，共 ${result.logs} 筆工時記錄${salaryMsg}`,
    });
  }, [handleSaveSettings, loadFromDrive]);

  const handleDiagnose = useCallback(async () => {
    setDiagnosticLoading(true);
    const steps = [];
    const fid = folderId || localStorage.getItem(LS_FOLDER_ID) || '';
    const tk = accessToken || localStorage.getItem('fandora_access_token') || '';

    steps.push({
      name: '1. 認證狀態',
      value: {
        authUser_email: authUser?.email || null,
        authUser_name: authUser?.name || null,
        role,
        hasAccessToken_state: !!accessToken,
        hasAccessToken_localStorage: !!localStorage.getItem('fandora_access_token'),
        accessToken_length: tk.length,
      },
    });

    steps.push({
      name: '2. 設定值',
      value: {
        folderId: fid,
        apiKey_prefix: (apiKey || '').slice(0, 12) + '...',
        costSheetId_prefix: (costSheetId || '').slice(0, 12) + '...',
      },
    });

    try {
      const url = `https://www.googleapis.com/drive/v3/files/${fid}?fields=id,name,mimeType,driveId,parents,owners(emailAddress),capabilities&supportsAllDrives=true`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tk}` } });
      const body = await res.text();
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = body.slice(0, 500); }
      steps.push({ name: '3. Drive API: 取 Folder metadata', value: { status: res.status, body: parsed } });
    } catch (err) {
      steps.push({ name: '3. Drive API: 取 Folder metadata', value: { error: err.message } });
    }

    try {
      const params = new URLSearchParams({
        q: `'${fid}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType,driveId)',
        pageSize: '50',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        corpora: 'allDrives',
      });
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const body = await res.text();
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = body.slice(0, 500); }
      const files = parsed?.files;
      steps.push({
        name: '4. Drive API: 列 Folder 子項目',
        value: {
          status: res.status,
          file_count: Array.isArray(files) ? files.length : null,
          files: Array.isArray(files)
            ? files.map((f) => ({
                name: f.name,
                mimeType: f.mimeType.replace('application/vnd.google-apps.', ''),
                driveId: f.driveId || null,
              }))
            : parsed,
        },
      });
    } catch (err) {
      steps.push({ name: '4. Drive API: 列 Folder 子項目', value: { error: err.message } });
    }

    try {
      const params = new URLSearchParams({
        q: `'${fid}' in parents and trashed=false`,
        fields: 'files(id,name,mimeType)',
        pageSize: '50',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        corpora: 'allDrives',
      });
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${tk}` },
      });
      const data = await res.json();
      const subfolders = (data.files || []).filter((f) => f.mimeType === 'application/vnd.google-apps.folder');
      const expansions = [];
      for (const sub of subfolders) {
        try {
          const inner = await listFilesInFolder(sub.id, tk);
          expansions.push({
            folder: sub.name,
            count: inner.length,
            items: inner.map((f) => ({
              name: f.name,
              mimeType: f.mimeType.replace('application/vnd.google-apps.', ''),
            })),
          });
        } catch (err) {
          expansions.push({ folder: sub.name, error: err.message });
        }
      }
      steps.push({ name: '5. 對每個子 folder 各展開一層', value: expansions });
    } catch (err) {
      steps.push({ name: '5. 子 folder 展開', value: { error: err.message } });
    }

    try {
      const allSheets = await listAllSpreadsheets(fid, tk);
      steps.push({
        name: '6. listAllSpreadsheets 整棵樹遞迴結果',
        value: {
          total_sheets: allSheets.length,
          sheets: allSheets.map((f) => ({ name: f.name, classified: classifyFileType(f.name) })),
          summary_by_classification: allSheets.reduce((acc, f) => {
            const k = classifyFileType(f.name);
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          }, {}),
        },
      });
    } catch (err) {
      steps.push({ name: '6. listAllSpreadsheets', value: { error: err.message } });
    }

    try {
      const allSheets = await listAllSpreadsheets(fid, tk);
      const individualFiles = allSheets.filter((f) => classifyFileType(f.name) === 'individual');
      if (individualFiles.length === 0) {
        steps.push({ name: '7. 第一個 individual file 結構', value: '沒有 individual 檔案' });
      } else {
        const file = individualFiles[0];
        const buffer = await exportSheetAsXlsx(file.id, tk);
        const wb = XLSX.read(buffer, { cellDates: false });
        const sheetNames = wb.SheetNames;
        const samples = sheetNames.slice(0, 3).map((name) => {
          const ws = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          return {
            name,
            extractMonthFromSheetName: extractMonthFromSheetName(name),
            rowCount: rows.length,
            firstRows: rows.slice(0, 6).map((row) =>
              row.slice(0, 8).map((c) => (typeof c === 'string' ? c.slice(0, 30) : c))
            ),
          };
        });
        steps.push({
          name: '7. 第一個 individual file 結構',
          value: { filename: file.name, sheetCount: sheetNames.length, sheetNames, samples },
        });
      }
    } catch (err) {
      steps.push({ name: '7. Export 結構', value: { error: err.message } });
    }

    try {
      steps.push({
        name: '8. parseDateString 行為驗證',
        value: {
          'parseDateString(46024)': parseDateString(46024),
          'parseDateString(46024,"2026","1")': parseDateString(46024, '2026', '1'),
          'parseDateString("46024")': parseDateString('46024'),
          'parseDateString("2026/01/02")': parseDateString('2026/01/02'),
          'parseDateString("2026/01/02（五）")': parseDateString('2026/01/02（五）'),
          'parseDateString("3/2","2026","3")': parseDateString('3/2', '2026', '3'),
          'parseDateString("日期")': parseDateString('日期'),
          'parseDateString("範例1")': parseDateString('範例1'),
          'excelDateToString(46024)': excelDateToString(46024),
          'typeof 46024': typeof 46024,
        },
      });
    } catch (err) {
      steps.push({ name: '8. parseDateString', value: { error: err.message } });
    }

    try {
      const allSheets = await listAllSpreadsheets(fid, tk);
      const individualFiles = allSheets.filter((f) => classifyFileType(f.name) === 'individual');
      if (individualFiles.length === 0) {
        steps.push({ name: '9. parseWorkbook 實際結果', value: '無 individual 檔' });
      } else {
        const file = individualFiles[0];
        const buffer = await exportSheetAsXlsx(file.id, tk);
        let logs;
        let parseError;
        try {
          logs = parseWorkbook(buffer, file.name);
        } catch (err) {
          parseError = err.message;
        }
        steps.push({
          name: '9. parseWorkbook 實際結果',
          value: {
            filename: file.name,
            log_count: logs?.length ?? 0,
            first_3_logs: logs?.slice(0, 3) ?? null,
            parseError,
          },
        });
      }
    } catch (err) {
      steps.push({ name: '9. parseWorkbook', value: { error: err.message, stack: err.stack?.slice(0, 300) } });
    }

    setDiagnostic(steps);
    setDiagnosticLoading(false);
  }, [accessToken, authUser, role, folderId, apiKey, costSheetId]);

  const handleClearAll = useCallback(() => {
    if (window.confirm('確定要清除所有資料嗎？此操作無法復原。')) {
      clearAll();
      setTestStatus({ type: 'info', message: '已清除所有資料' });
    }
  }, [clearAll]);

  return (
    <>
      <div className="hero-decor" />
      <div className="page-hero">
        <div>
          <div className="eyebrow">SETTINGS</div>
          <h1>系統設定</h1>
          <p className="sub">
            管理 Google Drive 連線、組織人員、資料載入與權限設定。
          </p>
        </div>
      </div>

      <IpMisrecordWarning />

      <div className="grid grid-12">
        {/* Drive 設定 */}
        <Card col={12} title="Google Drive 設定" sub="連線到工作日誌資料夾與薪資表">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg-2)',
                }}
              >
                API Key
              </label>
              <Input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Google Drive API Key"
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg-2)',
                }}
              >
                Folder ID
              </label>
              <Input
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="工作日誌資料夾 ID"
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg-2)',
                }}
              >
                Cost Sheet ID
              </label>
              <Input
                value={costSheetId}
                onChange={(e) => setCostSheetId(e.target.value)}
                placeholder="薪資表 Sheet ID"
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg-2)',
                }}
              >
                IP 清單 Sheet ID
              </label>
              <Input
                value={ipSheetId}
                onChange={(e) => setIpSheetId(e.target.value)}
                placeholder="IP 清單 Sheet ID（第一欄主名 / 第二欄起別名）"
              />
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.6 }}>
                Sheet 格式：第一列 header，後續每列 A 欄=IP 主名、B 欄起=別名（可多欄）。
                載入後自動合併到 IP 清單管理。
              </div>
            </div>
            <Space wrap>
              <Button type="primary" onClick={handleSaveSettings}>
                保存設定
              </Button>
              <Button loading={testLoading} onClick={handleTestConnection}>
                測試連線
              </Button>
              <Button onClick={handleLoadFromDrive} loading={isLoading}>
                從 Drive 載入
              </Button>
              <Button danger onClick={() => requestDriveAccess(true)}>
                強制重新授權 Drive
              </Button>
            </Space>
            <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.6 }}>
              載入失敗（401）時請按「強制重新授權 Drive」彈出 Google 授權視窗，
              同意後 token 重置為全新；接著再點「從 Drive 載入」即可。
            </div>
            {testStatus && (
              <Alert
                message={testStatus.message}
                type={testStatus.type}
                closable
                onClose={() => setTestStatus(null)}
                style={{ borderRadius: 10 }}
              />
            )}
          </div>
        </Card>

        {/* 上傳資料 */}
        <Card col={12} title="上傳資料" sub="手動上傳 Excel 工時或薪資檔">
          <div className="grid grid-2">
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg-2)',
                }}
              >
                工時檔案（個人版 Excel）
              </label>
              <DragDropUpload
                onUpload={handleWorkLogUpload}
                accept=".xlsx,.xls"
                multiple
                disabled={isLoading}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--fg-2)',
                }}
              >
                薪資表（Excel）
              </label>
              <DragDropUpload
                onUpload={handleSalaryUpload}
                accept=".xlsx,.xls"
                multiple={false}
                disabled={isLoading}
              />
            </div>
          </div>
        </Card>

        {/* 組織人員管理 */}
        <Card col={12} title="組織人員管理" sub="員工 ↔ 部門對照（可覆寫硬編碼）">
          <OrgManager />
        </Card>

        {/* IP 清單管理 */}
        <IpListManager />

        {/* 資料統計 */}
        <Card col={12} title="資料統計">
          {isLoading ? (
            <Spin />
          ) : workLogs.length === 0 && salaryData.length === 0 ? (
            <Empty title="暫無資料" desc="按上方「從 Drive 載入」或拖檔上傳。" />
          ) : (
            <div className="grid grid-2">
              <div
                style={{
                  padding: 16,
                  background: 'var(--bg-page-alt)',
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-latin)', fontWeight: 600 }}>
                  工時記錄筆數
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontSize: 32,
                    fontWeight: 700,
                    color: 'var(--accent)',
                    marginTop: 4,
                  }}
                >
                  {workLogs.length.toLocaleString()}
                </div>
              </div>
              <div
                style={{
                  padding: 16,
                  background: 'var(--bg-page-alt)',
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--font-latin)', fontWeight: 600 }}>
                  薪資記錄筆數
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-numeric)',
                    fontSize: 32,
                    fontWeight: 700,
                    color: 'var(--fg-1)',
                    marginTop: 4,
                  }}
                >
                  {salaryData.length.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Drive 診斷 */}
        <Card col={12} title="Drive 診斷（debug）" sub="實際打 Drive API + 跑 parser，把 status / response 直接顯示">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Button type="primary" loading={diagnosticLoading} onClick={handleDiagnose}>
                執行完整診斷
              </Button>
            </div>
            {diagnostic && (
              <pre
                style={{
                  background: '#0a0a0a',
                  color: '#d4d4d4',
                  padding: 16,
                  borderRadius: 10,
                  fontSize: 12,
                  lineHeight: 1.5,
                  overflow: 'auto',
                  maxHeight: 600,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {diagnostic
                  .map((s) => `=== ${s.name} ===\n${JSON.stringify(s.value, null, 2)}`)
                  .join('\n\n')}
              </pre>
            )}
          </Space>
        </Card>

        {/* 危險操作 */}
        <Card col={12} title="危險操作" className="card" >
          <div
            style={{
              padding: 16,
              background: 'rgba(225,77,77,0.05)',
              border: '1px solid rgba(225,77,77,0.2)',
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--fg-2)', marginBottom: 12 }}>
              清除所有快取資料（包含 localStorage 內的 workLogs / salaryData）。下次需要重新從 Drive 載入。
            </div>
            <Button danger onClick={handleClearAll}>
              清除所有數據
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
