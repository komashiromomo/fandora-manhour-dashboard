import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';
import { useRoute } from '../router/RouteProvider';

export default function EmployeeDetail() {
  const { route, closeEntity } = useRoute();
  if (route.tab !== 'employees' || !route.entityValue) return null;
  return (
    <EntityDrillDetail rootKind="employee" rootValue={route.entityValue} onClose={closeEntity} />
  );
}
