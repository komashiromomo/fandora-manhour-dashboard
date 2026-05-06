/**
 * 月度工時對比 Card — 4 個 page 共用
 *
 * 把多個 entity（IP / 員工 / 部門 / 工作項目）的月度工時畫在同張折線圖上對比。
 * Ant Design Select mode="multiple" 讓使用者選擇要看誰，預設選 top N。
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Select } from 'antd';
import { groupBy, sumBy } from 'lodash-es';
import { Card, LineChart, Empty } from './v2';
import { roundHours, formatMonthDisplay } from '../utils/dates';
import { useData } from '../data/DataContext';

const FALLBACK_PALETTE = [
  '#00A4C6', '#FF9900', '#9B59B6', '#2BB673', '#E14D4D',
  '#3498DB', '#F1C40F', '#1ABC9C', '#E67E22', '#34495E',
];

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.entityLabel        // 「IP」「員工」「部門」「工作項目」
 * @param {Array<{value:string,label?:string,color?:string}>} props.options
 * @param {(log:object, entity:string) => boolean} props.filterFn
 * @param {number} [props.defaultCount=5]
 * @param {number} [props.height=300]
 */
export default function MonthlyCompareCard({
  title = '月度工時對比',
  entityLabel = '項目',
  options,
  filterFn,
  defaultCount = 5,
  height = 300,
}) {
  const { filteredLogs, availableMonths } = useData();
  const [selected, setSelected] = useState(() =>
    options.slice(0, defaultCount).map((o) => o.value)
  );

  // options 變動時若 selected 全變空了（首次載入），補上預設 top N
  useEffect(() => {
    if (selected.length === 0 && options.length > 0) {
      setSelected(options.slice(0, defaultCount).map((o) => o.value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.length]);

  const series = useMemo(() => {
    return selected.map((entity, i) => {
      const opt = options.find((o) => o.value === entity);
      const logs = filteredLogs.filter((l) => filterFn(l, entity));
      const grouped = groupBy(logs, 'month');
      return {
        label: opt?.label || entity,
        color: opt?.color || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
        data: availableMonths.map((m) => ({
          label: formatMonthDisplay(m),
          value: roundHours(sumBy(grouped[m] || [], 'hours')),
        })),
      };
    });
  }, [filteredLogs, availableMonths, selected, options, filterFn]);

  const validSelected = selected.filter((s) => options.some((o) => o.value === s));

  return (
    <Card
      col={12}
      title={title}
      sub={`已選 ${validSelected.length} / 共 ${options.length} ${entityLabel}`}
    >
      <Select
        mode="multiple"
        value={validSelected}
        onChange={setSelected}
        options={options.map((o) => ({ value: o.value, label: o.label || o.value }))}
        style={{ width: '100%', marginBottom: 12 }}
        placeholder={`選擇要對比的${entityLabel}`}
        maxTagCount="responsive"
        allowClear
      />
      {validSelected.length === 0 || availableMonths.length === 0 ? (
        <Empty
          title={availableMonths.length === 0 ? '無月份資料' : `請選擇要對比的${entityLabel}`}
        />
      ) : (
        <LineChart series={series} height={height} />
      )}
    </Card>
  );
}
