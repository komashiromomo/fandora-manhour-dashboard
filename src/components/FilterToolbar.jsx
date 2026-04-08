import React from 'react';
import { Select, DatePicker, Space, Button } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useData } from '../data/DataContext';
import { formatMonthDisplay } from '../utils/dates';

const { RangePicker } = DatePicker;

export default function FilterToolbar() {
  const { availableMonths, filters, setFilters } = useData();

  // Handle month selection
  const handleMonthChange = (value) => {
    setFilters({ month: value, dateFrom: '', dateTo: '' });
  };

  // Handle date range selection
  const handleDateRangeChange = (dates) => {
    if (!dates || dates.length === 0) {
      setFilters({ dateFrom: '', dateTo: '' });
    } else {
      const [start, end] = dates;
      setFilters({
        month: 'all',
        dateFrom: start.format('YYYY-MM-DD'),
        dateTo: end.format('YYYY-MM-DD'),
      });
    }
  };

  // Clear filters
  const handleClear = () => {
    setFilters({ month: 'all', dateFrom: '', dateTo: '' });
  };

  // Prepare month options
  const monthOptions = [
    { label: '全部', value: 'all' },
    ...availableMonths.map(m => ({
      label: formatMonthDisplay(m, 'long'),
      value: m,
    })),
  ];

  return (
    <Space>
      <Select
        placeholder="選擇月份"
        value={filters.month || 'all'}
        onChange={handleMonthChange}
        options={monthOptions}
        style={{ width: 180 }}
      />

      <RangePicker
        placeholder={['開始日期', '結束日期']}
        value={
          filters.dateFrom && filters.dateTo
            ? [dayjs(filters.dateFrom), dayjs(filters.dateTo)]
            : null
        }
        onChange={handleDateRangeChange}
        disabled={filters.month && filters.month !== 'all'}
        style={{ width: 280 }}
      />

      <Button
        icon={<ClearOutlined />}
        onClick={handleClear}
      >
        清除篩選
      </Button>
    </Space>
  );
}
