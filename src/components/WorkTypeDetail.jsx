import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';
import { useRoute } from '../router/RouteProvider';

export default function WorkTypeDetail() {
  const { route, closeEntity } = useRoute();
  if (route.tab !== 'workTypes' || !route.entityValue) return null;
  return (
    <EntityDrillDetail rootKind="workType" rootValue={route.entityValue} onClose={closeEntity} />
  );
}
