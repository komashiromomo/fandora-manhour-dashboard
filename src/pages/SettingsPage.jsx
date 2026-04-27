import { useState, useCallback } from 'react';
import { Card, Input, Button, Space, Row, Col, Divider, Alert, Spin, Empty } from 'antd';
import { testConnection } from '../api/gdrive';
import { useData } from '../data/DataContext';
import { useDataLoader } from '../data/useDataLoader';
import { useAuth } from '../auth/AuthContext';
import DragDropUpload from '../components/DragDropUpload';
import OrgManager from '../components/OrgManager';
import {
  LS_API_KEY,
  LS_FOLDER_ID,
  LS_COST_SHEET_ID,
  DEFAULT_API_KEY,
  DEFAULT_FOLDER_ID,
} from '../config/constants';

export default function SettingsPage() {
  const { workLogs, salaryData, isLoading, setLoading, clearAll } = useData();
  const { loadFromDrive, handleWorkLogUpload, handleSalaryUpload } = useDataLoader();
  const { accessToken } = useAuth();

  // State for input fields
  const [apiKey, setApiKey] = useState(
    () => DEFAULT_API_KEY || localStorage.getItem(LS_API_KEY) || ''
  );
  const [folderId, setFolderId] = useState(
    () => DEFAULT_FOLDER_ID || localStorage.getItem(LS_FOLDER_ID) || ''
  );
  const [costSheetId, setCostSheetId] = useState(
    () => localStorage.getItem(LS_COST_SHEET_ID) || ''
  );
  const [testStatus, setTestStatus] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // Save settings to localStorage
  const handleSaveSettings = useCallback(() => {
    if (apiKey) localStorage.setItem(LS_API_KEY, apiKey);
    if (folderId) localStorage.setItem(LS_FOLDER_ID, folderId);
    if (costSheetId) localStorage.setItem(LS_COST_SHEET_ID, costSheetId);
    setTestStatus({ type: 'success', message: '設定已保存' });
  }, [apiKey, folderId, costSheetId]);

  // Test connection
  const handleTestConnection = useCallback(async () => {
    setTestLoading(true);
    try {
      const result = await testConnection(accessToken);
      if (result) {
        setTestStatus({
          type: 'success',
          message: '連線成功！',
        });
      } else {
        setTestStatus({ type: 'error', message: '連線失敗，請檢查設定' });
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: err.message });
    } finally {
      setTestLoading(false);
    }
  }, [accessToken]);

  // Handle load from drive
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
    setTestStatus({
      type: 'success',
      message: `載入完成：${result.individual} 個個人版檔（共 ${result.total} 個）→ 解析 ${result.parsedFiles} 成功 / ${result.parseErrors} 失敗，共 ${result.logs} 筆工時記錄`,
    });
  }, [handleSaveSettings, loadFromDrive]);

  // Handle clear all data
  const handleClearAll = useCallback(() => {
    if (window.confirm('確定要清除所有資料嗎？此操作無法復原。')) {
      clearAll();
      setTestStatus({ type: 'info', message: '已清除所有資料' });
    }
  }, [clearAll]);

  return (
    <div style={{ padding: '24px', maxWidth: 1000 }}>
      {/* Google Drive Settings */}
      <Card title="Google Drive 設定" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              API Key
            </label>
            <Input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="輸入 Google Drive API Key"
            />
          </Col>
          <Col xs={24}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Folder ID
            </label>
            <Input
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="輸入 Google Drive Folder ID"
            />
          </Col>
          <Col xs={24}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Cost Sheet ID
            </label>
            <Input
              value={costSheetId}
              onChange={(e) => setCostSheetId(e.target.value)}
              placeholder="輸入薪資表 Google Sheets ID"
            />
          </Col>
          <Col xs={24}>
            <Space>
              <Button type="primary" onClick={handleSaveSettings}>
                保存設定
              </Button>
              <Button loading={testLoading} onClick={handleTestConnection}>
                測試連線
              </Button>
              <Button onClick={handleLoadFromDrive} loading={isLoading}>
                從 Drive 載入
              </Button>
            </Space>
          </Col>
          {testStatus && (
            <Col xs={24}>
              <Alert
                message={testStatus.message}
                type={testStatus.type}
                closable
                onClose={() => setTestStatus(null)}
              />
            </Col>
          )}
        </Row>
      </Card>

      <Divider />

      {/* File Upload */}
      <Card title="上傳資料" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              上傳工時檔案（Excel）
            </label>
            <DragDropUpload
              onUpload={handleWorkLogUpload}
              accept=".xlsx,.xls"
              multiple
              disabled={isLoading}
            />
          </Col>
          <Col xs={24} lg={12}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              上傳薪資表（Excel）
            </label>
            <DragDropUpload
              onUpload={handleSalaryUpload}
              accept=".xlsx,.xls"
              multiple={false}
              disabled={isLoading}
            />
          </Col>
        </Row>
      </Card>

      <Divider />

      {/* 組織人員管理 */}
      <div style={{ marginBottom: '24px' }}>
        <OrgManager />
      </div>

      <Divider />

      {/* Data Statistics */}
      <Card title="資料統計" style={{ marginBottom: '24px' }}>
        {isLoading ? (
          <Spin />
        ) : workLogs.length === 0 && salaryData.length === 0 ? (
          <Empty description="暫無資料" />
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div style={{ padding: '12px', background: '#fafafa', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>工時記錄筆數</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {workLogs.length}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div style={{ padding: '12px', background: '#fafafa', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>薪資記錄筆數</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {salaryData.length}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* Danger Zone */}
      <Card title="危險操作" style={{ borderColor: '#ff4d4f' }}>
        <Button danger onClick={handleClearAll}>
          清除所有數據
        </Button>
      </Card>
    </div>
  );
}
