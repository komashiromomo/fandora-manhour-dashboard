import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';
import { useRoute } from '../router/RouteProvider';

export default function DepartmentDetail() {
  const { route, closeEntity } = useRoute();
  if (route.tab !== 'departments' || !route.entityValue) return null;
  return (
    <EntityDrillDetail rootKind="department" rootValue={route.entityValue} onClose={closeEntity} />
  );
}
