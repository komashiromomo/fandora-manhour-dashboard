import React from 'react';
import EntityDrillDetail from './EntityDrillDetail';
import { useRoute } from '../router/RouteProvider';

export default function ProjectDetail() {
  const { route, closeEntity } = useRoute();
  if (route.tab !== 'projects' || !route.entityValue) return null;
  return (
    <EntityDrillDetail rootKind="project" rootValue={route.entityValue} onClose={closeEntity} />
  );
}
