import React, { useState } from 'react';
import {
  Layout as AntLayout, Tabs, Avatar, Dropdown, Button, Spin, Space,
} from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../data/DataContext';
import { ROLE_TABS, TAB_DEFINITIONS } from '../config/constants';

const { Header, Content } = AntLayout;

export default function Layout({ children, activeTab, onTabChange }) {
  const { authUser, role, logout } = useAuth();
  const { isLoading, loadingMessage } = useData();

  // Filter tabs based on user role
  const visibleTabs = TAB_DEFINITIONS.filter(t =>
    (ROLE_TABS[role] || ROLE_TABS.member).includes(t.id)
  );

  // User menu dropdown
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '登出',
      onClick: logout,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Header
        style={{
          background: '#1a1a2e',
          color: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 'bold' }}>
          Fandora 人工時管理系統 v3
        </div>
        {authUser && (
          <Space>
            <span>{authUser.name || authUser.email}</span>
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Avatar
                icon={<UserOutlined />}
                src={authUser.picture}
                style={{ cursor: 'pointer' }}
              />
            </Dropdown>
          </Space>
        )}
      </Header>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          items={visibleTabs.map(tab => ({
            key: tab.id,
            label: tab.label,
          }))}
          style={{ margin: 0, paddingLeft: 24 }}
        />
      </div>

      {/* Content */}
      <Content
        style={{
          padding: 24,
          position: 'relative',
        }}
      >
        {children}
        {isLoading && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <Spin size="large" />
            {loadingMessage && (
              <p style={{ color: '#fff', marginTop: 16 }}>{loadingMessage}</p>
            )}
          </div>
        )}
      </Content>
    </AntLayout>
  );
}
