import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';

export default function WorkTypeDetail({ workType, onClose }) {
  return <EntityDrillDetail rootKind="workType" rootValue={workType} onClose={onClose} />;
}
