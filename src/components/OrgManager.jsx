import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Table, Select, Button, Input, Alert, Space, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useData } from '../data/DataContext';
import { EMPLOYEE_DEPT_MAP } from '../config/constants';
import {
  loadDeptOverrides,
  setDeptOverrides as persistOverrides,
  splitNameWithDept,
  normalizeName,
  getDept,
} from '../utils/names';

export default function OrgManager() {
  const { workLogs, setWorkLogs } = useData();
  const [overrides, setOverridesState] = useState({});
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setOverridesState({ ...loadDeptOverrides() });
  }, []);

  const employeesFromLogs = useMemo(() => {
    const set = new Set();
    workLogs.forEach((l) => {
      const { name } = splitNameWithDept(l.employee);
      if (name) set.add(name);
    });
    return set;
  }, [workLogs]);

  const allDepts = useMemo(() => {
    const set = new Set();
    Object.values(EMPLOYEE_DEPT_MAP).forEach((d) => set.add(d));
    Object.values(overrides).forEach((d) => d && set.add(d));
    workLogs.forEach((l) => {
      if (l.department && l.department !== '未知部門') set.add(l.department);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  }, [workLogs, overrides]);

  const rows = useMemo(() => {
    const allNames = new Set([
      ...Object.keys(EMPLOYEE_DEPT_MAP),
      ...Object.keys(overrides),
      ...employeesFromLogs,
    ]);
    return Array.from(allNames)
      .map((name) => {
        const isBuiltin = name in EMPLOYEE_DEPT_MAP;
        const isOverride = name in overrides;
        const dept = isOverride ? overrides[name] : (EMPLOYEE_DEPT_MAP[name] || '');
        return {
          key: name,
          name,
          dept,
          isBuiltin,
          isOverride,
          isUnknown: !dept,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  }, [overrides, employeesFromLogs]);

  const unknownCount = rows.filter((r) => r.isUnknown).length;

  const handleChangeDept = useCallback((name, dept) => {
    setOverridesState((prev) => ({ ...prev, [name]: dept || '' }));
    setDirty(true);
  }, []);

  const handleReset = useCallback((name) => {
    setOverridesState((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setDirty(true);
  }, []);

  const handleAdd = useCallback(() => {
    const n = newName.trim();
    const d = newDept.trim();
    if (!n || !d) {
      message.warning('請輸入姓名與部門');
      return;
    }
    setOverridesState((prev) => ({ ...prev, [n]: d }));
    setNewName('');
    setNewDept('');
    setDirty(true);
  }, [newName, newDept]);

  const handleSave = useCallback(() => {
    persistOverrides(overrides);
    if (workLogs.length > 0) {
      const remapped = workLogs.map((l) => {
        const employee = normalizeName(l.employee);
        const looked = getDept(employee);
        const department = looked && looked !== '未知部門'
          ? looked
          : (l.department || '未知部門');
        return { ...l, employee, department };
      });
      setWorkLogs(remapped);
    }
    setDirty(false);
    message.success('組織表已儲存並重新對應現有資料');
  }, [overrides, workLogs, setWorkLogs]);

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space size="small">
          <span>{name}</span>
          {record.isUnknown && <Tag color="warning">未分類</Tag>}
          {!record.isBuiltin && record.isOverride && <Tag color="blue">自訂</Tag>}
          {record.isBuiltin && record.isOverride && <Tag color="purple">已覆寫</Tag>}
        </Space>
      ),
    },
    {
      title: '部門',
      dataIndex: 'dept',
      key: 'dept',
      render: (dept, record) => (
        <Select
          value={dept || undefined}
          placeholder="請選擇或輸入部門"
          style={{ width: 220 }}
          showSearch
          allowClear
          onChange={(v) => handleChangeDept(record.name, v || '')}
          options={allDepts.map((d) => ({ value: d, label: d }))}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) =>
        record.isOverride ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleReset(record.name)}
          >
            還原
          </Button>
        ) : null,
    },
  ];

  return (
    <Card
      title="組織人員管理"
      extra={
        <Button type="primary" onClick={handleSave} disabled={!dirty}>
          {dirty ? '儲存組織表' : '已儲存'}
        </Button>
      }
    >
      {unknownCount > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`有 ${unknownCount} 位員工尚未分配部門`}
          description="請於下方為其指定部門後按「儲存組織表」。儲存後會立即套用到既有資料，不需重新從 Drive 載入。"
        />
      )}
      <Table
        columns={columns}
        dataSource={rows}
        size="small"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
      />
      <Card type="inner" size="small" title="新增員工" style={{ marginTop: 16 }}>
        <Space wrap>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="姓名（本名）"
            style={{ width: 180 }}
          />
          <Input
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            placeholder="部門名稱"
            style={{ width: 180 }}
            onPressEnter={handleAdd}
          />
          <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>
            新增
          </Button>
        </Space>
        {allDepts.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
            已知部門：{allDepts.join('、')}
          </div>
        )}
      </Card>
    </Card>
  );
}
