import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';

export default function EmployeeDetail({ employee, onClose }) {
  return <EntityDrillDetail rootKind="employee" rootValue={employee} onClose={onClose} />;
}
