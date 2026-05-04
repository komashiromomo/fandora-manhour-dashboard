import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';

export default function DepartmentDetail({ department, onClose }) {
  return <EntityDrillDetail rootKind="department" rootValue={department} onClose={onClose} />;
}
